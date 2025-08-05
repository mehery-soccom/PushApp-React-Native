// External exports (public API)
export { BannerScreen } from './components/BannerScreen';
export { CustomBanner } from './components/CustomBanner';
export { getDeviceId } from './utils/device';
export { logUserDetails, getLoggedUserDetails } from './utils/user';
export { MeheryEventSenderView } from './native/MeheryEventSenderView';

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
    getFcmToken();
    configurePushNotifications();
    setupForegroundNotificationListener();

    // 👇 Internal call — not exposed to consumers
    triggerLiveActivity({
      message1: 'Welcome!',
      message2: 'Live activity running',
      message3: 'Tap to continue',
      progressPercent: '0.35',
      message1FontColorHex: '#FF0000',
      message2FontColorHex: '#000000',
      message3FontColorHex: '#CCCCCC',
      progressColorHex: '#00FF00',
      backgroundColorHex: '#FFFFFF',
      imageUrl: 'https://example.com/sample.png',
      bg_color_gradient: '#FF5733,#33FFCE',
      bg_color_gradient_dir: 'top_to_bottom',
      align: 'center',
      activity_id: 'demo_activity_001',
    });
  } else {
    console.log('🍏 Platform: iOS - Skipping push notification setup');
  }
};
