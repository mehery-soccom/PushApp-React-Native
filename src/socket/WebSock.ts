// sdk/index.tsx (add at the top or create a separate ws.ts file)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWsHostUrl } from '../helpers/tenantContext';

let socket: WebSocket | null = null;

export const connectToServer = async () => {
  const userID = await AsyncStorage.getItem('user_id');
  const device_id = await AsyncStorage.getItem('device_id');

  try {
    const wsUrl = await getWsHostUrl();
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log(`✅ WebSocket connected to ${wsUrl}`);
      socket?.send(
        JSON.stringify({ type: 'auth', userId: `${userID}_${device_id}` })
      );
    };

    socket.onmessage = (event) => {
      console.log('📩 WebSocket message received:', event.data);
    };

    socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    socket.onclose = (e) => {
      console.warn(`⚠️ WebSocket closed: ${e.code} ${e.reason}`);
      // Try reconnecting after 5 seconds
      setTimeout(() => {
        console.log('🔄 Attempting to reconnect...');
        connectToServer();
      }, 5000);
    };
  } catch (err) {
    console.error('❌ WebSocket connection failed:', err);
  }
};

// wsTest.ts or inside your sdk/index.tsx temporarily

export const testWebSocketConnection = () => {
  const testSocket = new WebSocket('wss://echo.websocket.org');

  testSocket.onopen = () => {
    console.log('✅ Test WebSocket connected');
    testSocket.send('Hello echo server!');
  };

  testSocket.onmessage = (event) => {
    console.log('📩 Test WebSocket received:', event.data);
    testSocket.close();
  };

  testSocket.onerror = (error) => {
    console.error('❌ Test WebSocket error:', error);
  };

  testSocket.onclose = (e) => {
    console.log(`ℹ️ Test WebSocket closed: ${e.code} ${e.reason}`);
  };
};

export const sendMessage = (message: object) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    console.warn('⚠️ WebSocket not connected. Cannot send message.');
  }
};
