import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private isConnected = false;
  // private appState: AppStateStatus = 'active';
  private appStateSubscription: { remove: () => void } | null = null;

  constructor() {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );
  }

  init(url: string) {
    console.log('[SocketManager] Init called. Current socket:', !!this.socket);

    if (this.socket && this.isConnected) {
      console.log('[SocketManager] Already connected, skipping init.');
      return;
    }

    if (!this.socket) {
      this.socket = io(url, {
        transports: ['websocket'],
        autoConnect: false,
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('🟢 Socket connected');
        this.socket?.emit('add user', 'mehery-test-user');
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        console.log('🔴 Socket disconnected');
      });

      this.socket.on('connect_error', (err) => {
        console.log('❌ Connection error:', err.message);
      });

      this.socket.on('login', (data) => {
        console.log('✅ Logged in:', data);
      });

      this.socket.on('new message', (data) => {
        console.log('💬 New message:', data);
      });
    }

    // Reconnect if not connected
    if (!this.isConnected) {
      console.log('[SocketManager] Calling socket.connect()...');
      this.socket.connect();
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    // this.appState = nextAppState;

    if (nextAppState === 'active') {
      if (!this.isConnected) {
        console.log('🔁 App resumed, reconnecting socket...');
        this.socket?.connect();
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      console.log('📴 App backgrounded or inactive');
      // You can disconnect or keep the socket here depending on platform preference
      // this.socket?.disconnect();
    }
  };

  sendMessage(event: string, payload: any) {
    if (this.isConnected) {
      this.socket?.emit(event, payload);
    }
  }

  destroy() {
    this.socket?.disconnect();
    this.socket = null;
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
  }
}

export const socketManager = new SocketManager();
