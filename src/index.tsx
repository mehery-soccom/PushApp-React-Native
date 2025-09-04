// 📦 External exports (public API)
export { MeheryEventSenderView } from './native/MeheryEventSenderView';
export { BannerScreen } from './components/BannerScreen';
export { CustomBanner } from './components/CustomBanner';
export { getDeviceId } from './utils/device';
export {
  logUserDetails,
  getLoggedUserDetails,
  OnUserLogin,
  OnUserLogOut,
} from './utils/user';
export { OnPageClose, OnPageOpen } from './events/custom/CustomEvents';
export { PollOverlayProvider } from './components/PollOverlay';
export { showPollOverlay, hidePollOverlay } from './components/PollOverlay';

import { AppRegistry } from 'react-native';

// 🛠 Imports
import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestUserPermission,
  getFcmToken,
  configurePushNotifications,
  setupForegroundNotificationListener,
} from './firebase/Fb';
import { triggerLiveActivity } from './native/LiveActivity';
import { connectToServer } from './socket/WebSock';
import { getDeviceId as fetchDeviceId } from './utils/device';
// import { registerDeviceWithFCM } from './utils/registerDevice';
import { registerDeviceWithAPNS } from './firebase/IosAPNS';
// import { showPollOverlay, hidePollOverlay } from './components/PollOverlay';
// 🛡 Safe NativeEventEmitter setup
import { PollOverlayProvider } from './components/PollOverlay';

const { PushTokenManager } = NativeModules;
// const pushEmitter = PushTokenManager
//   ? new NativeEventEmitter(PushTokenManager)
//   : {
//       addListener: () => ({ remove: () => {} }),
//       removeAllListeners: () => {},
//     };
// // 🚀 SDK Init
console.log('PushTokenManager:', NativeModules.PushTokenManager);

export const iosChecker = () => {
  if (!PushTokenManager) {
    console.warn('⚠️ Native module PushTokenManager is NOT available.');
    return;
  }

  const pushEmitter = new NativeEventEmitter(PushTokenManager);

  console.log('🍏 iOS: Setting up PushTokenEvent listener');
  pushEmitter.addListener('PushTokenEvent', ({ type, token }) => {
    console.log(`📡 Received ${type} token from native: ${token}`);
    registerDeviceWithAPNS(token);
  });

  // 🔄 On reload, request last cached token
  // if (PushTokenManager.getLastToken) {
  //   PushTokenManager.getLastToken()
  //     .then((tokenObj: { token?: string; type?: string }) => {
  //       if (tokenObj?.token) {
  //         console.log(
  //           `♻️ Reload: Got cached ${tokenObj.type} token: ${tokenObj.token}`
  //         );
  //         registerDeviceWithAPNS(tokenObj.token);
  //       }
  //     })
  //     .catch((err: any) => console.error('Error getting last token:', err));
  // }
};

let sdkMounted = false;

export const initSdk = () => {
  fetchDeviceId();
  iosChecker();
  connectToServer();
  if (!sdkMounted) {
    AppRegistry.registerComponent(
      'MeherySdkOverlay',
      () => PollOverlayProvider
    );
    sdkMounted = true;
  }
  console.log('SDK Initialized');
  if (Platform.OS === 'android') {
    console.log('📱 Android: Initializing push notification setup');

    requestUserPermission();
    configurePushNotifications();
    setupForegroundNotificationListener();

    triggerLiveActivity({
      message1: 'Welcome!',
      message2: 'Live activity running',
      message3: 'Tap to continue',
      progressPercent: '0.85',
      message1FontColorHex: '#00000',
      message2FontColorHex: '#CCCCCC',
      message3FontColorHex: '#888888',
      progressColorHex: '#00FF00',
      backgroundColorHex: '#FFFFFF',
      imageUrl: 'https://example.com/sample.png',
      bg_color_gradient: '',
      bg_color_gradient_dir: '',
      align: 'center',
      activity_id: 'demo_activity_001',
      theme: 'dark',
    });

    getFcmToken();
  } else {
    console.log('🍏 iOS: Listening for FCM token from native emitter');
  }
};
