// sdk/index.tsx (add at the top or create a separate ws.ts file)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleWebSocketPollSignal } from '../events/custom/CustomEvents';
import { waitForEffectiveUserId } from '../utils/user';
import { getWsHostUrl } from '../helpers/tenantContext';
import { sdkLog } from '../helpers/sdkLogger';

let socket: WebSocket | null = null;
let skipNextAutoReconnect = false;

function sendWebSocketAuth(userID: string, device_id: string): void {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    sdkLog.warn('⚠️ WebSocket not open; cannot send auth.');
    return;
  }

  const userId = `${userID}_${device_id}`;
  socket.send(JSON.stringify({ type: 'auth', userId }));
  sdkLog.log('🔐 WebSocket auth sent:', userId);
}

function closeSocket(options?: { suppressAutoReconnect?: boolean }): void {
  if (!socket) return;

  if (options?.suppressAutoReconnect) {
    skipNextAutoReconnect = true;
  }

  const existing = socket;
  socket = null;
  existing.onopen = null;
  existing.onmessage = null;
  existing.onerror = null;
  existing.onclose = null;
  existing.close();
}

function attachSocketHandlers(
  ws: WebSocket,
  wsUrl: string,
  userID: string,
  device_id: string
): void {
  ws.onopen = () => {
    sdkLog.log(`✅ WebSocket connected to ${wsUrl}`);
    sendWebSocketAuth(userID, device_id);
  };

  ws.onmessage = (event) => {
    sdkLog.log('📩 WebSocket message received:', event.data);
    try {
      const message = JSON.parse(String(event.data));
      if (message?.action === 'POLL') {
        handleWebSocketPollSignal();
      }
    } catch {
      // Non-JSON payloads are logged only.
    }
  };

  ws.onerror = (error) => {
    sdkLog.warn('❌ WebSocket error:', error);
  };

  ws.onclose = (e) => {
    sdkLog.warn(`⚠️ WebSocket closed: ${e.code} ${e.reason}`);
    if (socket === ws) {
      socket = null;
    }

    if (skipNextAutoReconnect) {
      skipNextAutoReconnect = false;
      return;
    }

    setTimeout(() => {
      sdkLog.log('🔄 Attempting to reconnect...');
      connectToServer();
    }, 5000);
  };
}

export const connectToServer = async () => {
  const userID = await waitForEffectiveUserId();
  const device_id = await AsyncStorage.getItem('device_id');

  if (!userID || !device_id) {
    sdkLog.warn(
      '⚠️ WebSocket auth skipped: user_id or device_id unavailable.'
    );
    return;
  }

  if (
    socket?.readyState === WebSocket.OPEN ||
    socket?.readyState === WebSocket.CONNECTING
  ) {
    return;
  }

  try {
    closeSocket({ suppressAutoReconnect: true });
    const wsUrl = await getWsHostUrl();
    const ws = new WebSocket(wsUrl);
    socket = ws;
    attachSocketHandlers(ws, wsUrl, userID, device_id);
  } catch (err) {
    sdkLog.error('❌ WebSocket connection failed:', err);
  }
};

/** Re-send auth after login (guest → live) or reconnect if the socket is not open. */
export const reauthenticateWebSocket = async () => {
  const userID = await waitForEffectiveUserId();
  const device_id = await AsyncStorage.getItem('device_id');

  if (!userID || !device_id) {
    sdkLog.warn(
      '⚠️ WebSocket re-auth skipped: user_id or device_id unavailable.'
    );
    return;
  }

  sdkLog.log(
    `🔐 Now authenticating WebSocket with user_id: ${userID}, device_id: ${device_id}`
  );

  if (socket?.readyState === WebSocket.OPEN) {
    sdkLog.log('🔄 WebSocket re-authenticating after login');
    sendWebSocketAuth(userID, device_id);
    return;
  }

  sdkLog.log('🔄 WebSocket reconnecting after login');
  closeSocket({ suppressAutoReconnect: true });
  await connectToServer();
};

// wsTest.ts or inside your sdk/index.tsx temporarily

export const testWebSocketConnection = () => {
  const testSocket = new WebSocket('wss://echo.websocket.org');

  testSocket.onopen = () => {
    sdkLog.log('✅ Test WebSocket connected');
    testSocket.send('Hello echo server!');
  };

  testSocket.onmessage = (event) => {
    sdkLog.log('📩 Test WebSocket received:', event.data);
    testSocket.close();
  };

  testSocket.onerror = (error) => {
    sdkLog.error('❌ Test WebSocket error:', error);
  };

  testSocket.onclose = (e) => {
    sdkLog.log(`ℹ️ Test WebSocket closed: ${e.code} ${e.reason}`);
  };
};

export const sendMessage = (message: object) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    sdkLog.warn('⚠️ WebSocket not connected. Cannot send message.');
  }
};
