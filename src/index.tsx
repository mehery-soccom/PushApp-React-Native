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

export { InlinePollContainer } from './components/RenderInlinePoll';

import { AppRegistry } from 'react-native';

// 🛠 Imports
import { Platform, NativeModules, NativeEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export { TooltipPollContainer } from './components/TooltipPollContainer';

const { PushTokenManager } = NativeModules;
// const pushEmitter = PushTokenManager
//   ? new NativeEventEmitter(PushTokenManager)
//   : {
//       addListener: () => ({ remove: () => {} }),
//       removeAllListeners: () => {},
//     };
// // 🚀 SDK Init
console.log('PushTokenManager:', NativeModules.PushTokenManager);

let iosListenerAdded = false;

export const iosChecker = () => {
  if (!PushTokenManager) {
    console.warn('⚠️ Native module PushTokenManager is NOT available.');
    return;
  }

  if (iosListenerAdded) {
    console.log('ℹ️ iOS listener already added, skipping duplicate.');
    return;
  }

  const pushEmitter = new NativeEventEmitter(PushTokenManager);

  console.log('🍏 iOS: Setting up PushTokenEvent listener');
  pushEmitter.addListener('PushTokenEvent', ({ type, token }) => {
    console.log(`📡 Received ${type} token from native: ${token}`);
    registerDeviceWithAPNS(token);
  });

  iosListenerAdded = true;
};

let sdkMounted = false;

// export const initSdk = () => {
//   fetchDeviceId();
//   iosChecker();
//   connectToServer();
//   if (!sdkMounted) {
//     AppRegistry.registerComponent(
//       'MeherySdkOverlay',
//       () => PollOverlayProvider
//     );
//     sdkMounted = true;
//   }
//   console.log('SDK Initialized');
//   if (Platform.OS === 'android') {
//     console.log('📱 Android: Initializing push notification setup');

//     requestUserPermission();
//     configurePushNotifications();
//     setupForegroundNotificationListener();

//     triggerLiveActivity({
//       message1: 'Welcome!',
//       message2: 'Live activity running',
//       message3: 'Tap to continue',
//       progressPercent: '0.85',
//       message1FontColorHex: '#00000',
//       message2FontColorHex: '#CCCCCC',
//       message3FontColorHex: '#888888',
//       progressColorHex: '#00FF00',
//       backgroundColorHex: '#FFFFFF',
//       imageUrl: 'https://example.com/sample.png',
//       bg_color_gradient: '',
//       bg_color_gradient_dir: '',
//       align: 'center',
//       activity_id: 'demo_activity_001',
//       theme: 'dark',
//     });

//     getFcmToken();
//   } else {
//     console.log('🍏 iOS: Listening for FCM token from native emitter');
//   }
// };

export const initSdk = async (
  context: any,
  identifier: string,
  sandbox: boolean = true
) => {
  try {
    console.log('🧩 Initializing Mehery SDK...');
    console.log(context ? 'Received' : 'Not provided');
    console.log(`🏷️ Identifier: ${identifier}`);
    console.log(`🧪 Sandbox Mode: ${sandbox}`);

    // ✅ Extract tenant and channelId from "tenant#channelId"
    await AsyncStorage.setItem('mehery_channel_id', identifier);
    console.log(`💾 Saved Channel ID: ${identifier}`);

    // ✅ Fetch or create device ID
    fetchDeviceId();

    // ✅ iOS specific setup
    if (Platform.OS === 'ios') {
      iosChecker();
    }

    // ✅ Connect to the socket server
    connectToServer();

    // ✅ Mount overlay component only once
    if (!sdkMounted) {
      AppRegistry.registerComponent(
        'MeherySdkOverlay',
        () => PollOverlayProvider
      );
      sdkMounted = true;
      console.log('🧱 SDK Overlay mounted');
    }

    // ✅ Platform-specific setup
    if (Platform.OS === 'android') {
      console.log('📱 Android: Initializing push notification setup');

      await requestUserPermission();
      configurePushNotifications();
      setupForegroundNotificationListener();

      triggerLiveActivity({
        message1: 'Welcome!',
        message2: 'Live activity running',
        message3: 'Tap to continue',
        progressPercent: '0.85',
        message1FontColorHex: '#000000',
        message2FontColorHex: '#CCCCCC',
        message3FontColorHex: '#888888',
        progressColorHex: '#00FF00',
        backgroundColorHex: '#FFFFFF',
        imageUrl: 'https://example.com/sample.png',
        bg_color_gradient: '',
        bg_color_gradient_dir: '',
        align: 'center',
        activity_id: 'demo_activity_001',
        theme: sandbox ? 'light' : 'dark',
      });

      await getFcmToken();
    }

    console.log('✅ SDK Initialized Successfully');
  } catch (error) {
    console.error('❌ Error initializing SDK:', error);
  }
};
