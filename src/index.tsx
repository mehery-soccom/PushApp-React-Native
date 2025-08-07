export { MeheryEventSenderView } from './native/MeheryEventSenderView';
// External exports (public API)
export { BannerScreen } from './components/BannerScreen';
export { CustomBanner } from './components/CustomBanner';
export { getDeviceId } from './utils/device';
export {
  logUserDetails,
  getLoggedUserDetails,
  OnUserLogin,
  OnUserLogOut,
} from './utils/user';
// import { AppOpen } from './events/default/DefaultEvents';
export { OnPageClose, OnPageOpen } from './events/custom/CustomEvents';
import { Platform } from 'react-native';
import {
  requestUserPermission,
  getFcmToken,
  configurePushNotifications,
  setupForegroundNotificationListener,
} from './firebase/Fb';

// 👇 Internal import only (NOT exported)
import { triggerLiveActivity } from './native/LiveActivity';

// 👇 Init SDK (called by consumer app)
export const initSdk = () => {
  if (Platform.OS === 'android') {
    console.log('📱 Platform: Android - Initializing push notification setup');

    requestUserPermission();
    configurePushNotifications();
    setupForegroundNotificationListener();
    // AppOpen();
    // 👇 Internal call — not exposed to consumers
    triggerLiveActivity({
      message1: 'Welcome!',
      message2: 'Live activity running',
      message3: 'Tap to continue',
      progressPercent: '0.85',
      message1FontColorHex: '#00000', // red
      message2FontColorHex: '#CCCCCC', // Light grey
      message3FontColorHex: '#888888', // Darker grey
      progressColorHex: '#00FF00', // Green progress bar
      backgroundColorHex: '#FFFFFF', // Black background
      imageUrl: 'https://example.com/sample.png',
      bg_color_gradient: '', // No gradient
      bg_color_gradient_dir: '', // Not needed since gradient is empty
      align: 'center',
      activity_id: 'demo_activity_001',
      theme: 'dark',
    });
    getFcmToken();
  } else {
    console.log('🍏 Platform: iOS - Skipping push notification setup');
  }
};
