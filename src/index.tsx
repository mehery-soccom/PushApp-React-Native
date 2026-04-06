// 📦 External exports (public API)
export { MeheryEventSenderView } from './native/MeheryEventSenderView';
export { BannerScreen } from './components/BannerScreen';
export { CustomBanner } from './components/CustomBanner';
export { getDeviceId } from './utils/device';
export { setDeviceMetadata } from './utils/deviceMetadata';

export {
  logUserDetails,
  getLoggedUserDetails,
  OnUserLogin,
  OnUserLogOut,
} from './utils/user';
export {
  OnPageClose,
  OnPageOpen,
  sendCustomEvent,
  OnAppOpen,
} from './events/custom/CustomEvents';

export { updateUserProfile } from './events/custom/ProfileUpdate';

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
// import { triggerLiveActivity } from './native/LiveActivity';
import { connectToServer } from './socket/WebSock';
import { getDeviceId as fetchDeviceId } from './utils/device';
// import { registerDeviceWithFCM } from './utils/registerDevice';
import { registerDeviceWithAPNS } from './firebase/IosAPNS';
// import { showPollOverlay, hidePollOverlay } from './components/PollOverlay';
// 🛡 Safe NativeEventEmitter setup
import { PollOverlayProvider } from './components/PollOverlay';

export { TooltipPollContainer } from './components/TooltipPollContainer';

import { buildCommonHeaders } from './helpers/buildCommonHeaders';
import {
  getApiBaseUrl,
  storeTenantFromIdentifier,
} from './helpers/tenantContext';

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

let notificationListenerAdded = false;

/* -------------------------------------------------------------------------- */
/*                    SILENT NOTIFICATION DAILY LOGIC                           */
/* -------------------------------------------------------------------------- */

const SILENT_PING_KEY = 'mehery_last_silent_ping_date';

const isAfterNoon = () => {
  const now = new Date();

  const noon = new Date();
  noon.setHours(12, 0, 0, 0); // 12:00 PM local time

  return now >= noon;
};

const shouldRunSilentPingToday = async (): Promise<boolean> => {
  const lastRun = await AsyncStorage.getItem(SILENT_PING_KEY);
  const today = new Date().toISOString().split('T')[0];

  if (lastRun === today) return false;

  await AsyncStorage.setItem(SILENT_PING_KEY, today ?? '');
  return true;
};

const sendDailyPing = async () => {
  try {
    const channelId = await AsyncStorage.getItem('mehery_channel_id');
    const contactId = await AsyncStorage.getItem('contact_id');

    if (!channelId || !contactId) {
      console.warn('⚠️ Missing channel_id or contact_id. Skipping ping.');
      return;
    }

    const payload = {
      channel_id: channelId,
      contact_id: contactId,
    };

    console.log('📡 Sending silent daily ping:', payload);
    const commonHeaders = await buildCommonHeaders();

    const apiBaseUrl = await getApiBaseUrl();
    await fetch(`${apiBaseUrl}/ping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...commonHeaders,
      },
      body: JSON.stringify(payload),
    });

    console.log('✅ Silent daily ping sent');
  } catch (err) {
    console.error('❌ Silent ping failed:', err);
  }
};

// export const addNotificationDebugListener = () => {
//   if (!PushTokenManager) {
//     console.warn('⚠️ PushTokenManager not available for notification listener');
//     return;
//   }

//   if (notificationListenerAdded) {
//     console.log('ℹ️ Notification listener already added');
//     return;
//   }

//   const emitter = new NativeEventEmitter(PushTokenManager);

//   console.log('🔔 Setting up notification payload listener');

//   emitter.addListener('PushNotificationEvent', async (payload) => {
//     console.log(
//       '📦 [SDK][JS] Notification payload received:',
//       JSON.stringify(payload, null, 2)
//     );
//     console.log('🚨 LISTENER FIRED');
//     console.log('📦 Payload raw:', payload);

//     // 🚀 Send to Slack
//     // await sendPayloadToSlack(payload);
//   });

//   notificationListenerAdded = true;
// };

export const addNotificationDebugListener = () => {
  if (!PushTokenManager) return;
  if (notificationListenerAdded) return;

  const emitter = new NativeEventEmitter(PushTokenManager);

  emitter.addListener('PushNotificationEvent', async (payload) => {
    console.log('📦 Push payload received:', payload);

    if (payload?.type !== 'silent_daily_ping') return;

    // ⏰ Ensure it's after 12 noon
    if (!isAfterNoon()) {
      console.log('⏳ Silent ping received before 12 noon, skipping');
      return;
    }

    // 🧠 Ensure only once per day
    const shouldRun = await shouldRunSilentPingToday();
    if (!shouldRun) {
      console.log('⏭️ Silent ping already executed today');
      return;
    }

    await sendDailyPing();
  });

  notificationListenerAdded = true;
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

    const tenant = await storeTenantFromIdentifier(identifier);
    console.log(`🏢 Resolved tenant: ${tenant}`);

    // Keep raw identifier as channel_id for API compatibility.
    await AsyncStorage.setItem('mehery_channel_id', identifier);
    console.log(`💾 Saved Channel ID: ${identifier}`);

    // ✅ Fetch or create device ID
    fetchDeviceId();

    // ✅ iOS specific setup
    if (Platform.OS === 'ios') {
      iosChecker();
      addNotificationDebugListener(); // 👈 ADD THIS
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

      // triggerLiveActivity({
      //   message1: 'Welcome!',
      //   message2: 'Live activity running',
      //   message3: 'Tap to continue',
      //   progressPercent: '0.85',
      //   message1FontColorHex: '#000000',
      //   message2FontColorHex: '#CCCCCC',
      //   message3FontColorHex: '#888888',
      //   progressColorHex: '#00FF00',
      //   backgroundColorHex: '#FFFFFF',
      //   imageUrl: 'https://example.com/sample.png',
      //   bg_color_gradient: '',
      //   bg_color_gradient_dir: '',
      //   align: 'center',
      //   activity_id: 'demo_activity_001',
      //   theme: sandbox ? 'light' : 'dark',
      // });

      await getFcmToken();
    }

    console.log('✅ SDK Initialized Successfully');
  } catch (error) {
    console.error('❌ Error initializing SDK:', error);
  }
};
