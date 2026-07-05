// sdk/index.tsx (add at the top or create a separate ws.ts file)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleWebSocketPollSignal } from '../events/custom/CustomEvents';
import { waitForEffectiveUserId } from '../utils/user';
import { getWsHostUrl } from '../helpers/tenantContext';
import { sdkLog } from '../helpers/sdkLogger';

let socket: WebSocket | null = null;

export const connectToServer = async () => {
  const userID = await waitForEffectiveUserId();
  const device_id = await AsyncStorage.getItem('device_id');

  if (!userID || !device_id) {
    sdkLog.warn(
      '⚠️ WebSocket auth skipped: user_id or device_id unavailable.'
    );
    return;
  }

  try {
    const wsUrl = await getWsHostUrl();
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      sdkLog.log(`✅ WebSocket connected to ${wsUrl}`);
      socket?.send(
        JSON.stringify({ type: 'auth', userId: `${userID}_${device_id}` })
      );
    };

    socket.onmessage = (event) => {
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

    socket.onerror = (error) => {
      sdkLog.warn('❌ WebSocket error:', error);
    };

    socket.onclose = (e) => {
      sdkLog.warn(`⚠️ WebSocket closed: ${e.code} ${e.reason}`);
      // Try reconnecting after 5 seconds
      setTimeout(() => {
        sdkLog.log('🔄 Attempting to reconnect...');
        connectToServer();
      }, 5000);
    };
  } catch (err) {
    sdkLog.error('❌ WebSocket connection failed:', err);
  }
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
