import messaging from '@react-native-firebase/messaging';
import app from '@react-native-firebase/app';
import { PermissionsAndroid } from 'react-native';
import PushNotification from 'react-native-push-notification';
import { getDeviceId } from '../utils/device';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NativeModules, Platform } from 'react-native';
const { LiveActivityModule } = NativeModules;

let deviceRegistrationInProgress = false;
let lastApiCallTime: number | null = null;
const API_CALL_COOLDOWN_MS = 5000; // 5s cooldown

console.log('💬 Firebase messaging:', messaging);
console.log('📦 Firebase app exists:', app ? 'Yes' : 'No');

export async function registerDeviceWithFCM(token: string, deviceId: string) {
  if (!token) {
    console.warn('⚠️ No FCM token provided. Skipping registration.');
    return;
  }

  // 🧠 Skip if registration already in progress
  if (deviceRegistrationInProgress) {
    console.log(
      'ℹ️ Registration already in progress — skipping duplicate call.'
    );
    return;
  }

  // 🧊 Cooldown logic to avoid spamming
  const now = Date.now();
  if (lastApiCallTime && now - lastApiCallTime < API_CALL_COOLDOWN_MS) {
    const waitTime = Math.ceil(
      (API_CALL_COOLDOWN_MS - (now - lastApiCallTime)) / 1000
    );
    console.log(`⏳ Cooldown active. Wait ${waitTime}s before retrying.`);
    return;
  }

  deviceRegistrationInProgress = true;

  try {
    const [storedDeviceId, lastRegisteredToken, lastRegisteredState] =
      await AsyncStorage.multiGet([
        'device_id',
        'lastRegisteredToken',
        'lastRegisteredState',
      ]).then((entries) => entries.map(([_, v]) => v));

    console.log('last:', lastRegisteredToken);
    // Generate a fallback device_id if not found
    let finalDeviceId = deviceId || storedDeviceId;
    if (!finalDeviceId) {
      finalDeviceId = `${Platform.OS}_${Date.now()}`;
      await AsyncStorage.setItem('device_id', finalDeviceId);
    }

    // Create state key to check for changes
    const currentState = JSON.stringify({
      token,
      deviceId: finalDeviceId,
      platform: Platform.OS,
    });

    // 🔁 Skip if last registration is identical
    if (lastRegisteredState === currentState) {
      console.log('✅ Registration already valid. Skipping re-register.');
      deviceRegistrationInProgress = false;
      return;
    }

    const channel_id = await AsyncStorage.getItem('mehery_channel_id');

    const payload = {
      device_id: finalDeviceId,
      channel_id: channel_id,
      platform: Platform.OS,
      token: token,
    };

    console.log('📡 Registering device with payload:', payload);

    const response = await fetch(
      'https://demo.pushapp.co.in/pushapp/api/register',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const resData = await response.json();
    console.log('✅ Device registered/updated:', resData);

    lastApiCallTime = Date.now();

    // 🧩 Save new registration state
    await AsyncStorage.multiSet([
      ['lastRegisteredToken', token],
      ['lastRegisteredState', currentState],
      ['isRegistered', 'true'],
    ]);
  } catch (err) {
    console.error('❌ Failed to register/update device:', err);
    await AsyncStorage.setItem('isRegistered', 'false');
  } finally {
    deviceRegistrationInProgress = false;
  }
}

export function requestUserPermission(): void {
  // iOS-style permission
  messaging()
    .requestPermission()
    .then((authStatus) => {
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ iOS-like notification permission granted:', authStatus);
      } else {
        console.warn('❌ iOS-like notification permission denied');
      }
    })
    .catch(() => {
      // Probably not iOS
    });

  // Android POST_NOTIFICATIONS (Android 13+)
  PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS)
    .then((permission) => {
      if (permission === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✅ Android POST_NOTIFICATIONS permission granted');
      } else {
        console.warn('❌ Android POST_NOTIFICATIONS permission denied');
      }
    })
    .catch(() => {
      // Possibly not Android or permission API not available
    });

  console.log('check perms');
}

/**
 * Get the current device's FCM token
 */
export function getFcmToken() {
  messaging()
    .getToken()
    .then(async (token) => {
      console.log('📲 FCM Token:', token);
      const id = await getDeviceId();
      console.log('✅ Device is being registered with ID:', id);
      await AsyncStorage.setItem('device_id', id);
      await registerDeviceWithFCM(token, id);
    })
    .catch((error) => {
      console.error('Error getting FCM token:', error);
    });
}

/**
 * Configure push notifications
 */
export function configurePushNotifications(): void {
  PushNotification.configure({
    onNotification: function (notification: any) {
      console.log('🔔 LOCAL NOTIFICATION:', notification);
    },
    popInitialNotification: true,
    requestPermissions: false,
  });

  PushNotification.createChannel(
    {
      channelId: 'default-channel-id',
      channelName: 'Default Channel',
      channelDescription: 'Used for default notifications',
      importance: 4,
      vibrate: true,
    },
    (created: boolean) =>
      console.log(`📡 Notification channel created: ${created}`)
  );
}

/**
 * Setup foreground listener
 */
// export function setupForegroundNotificationListener(): () => void {
//   const unsubscribe = messaging().onMessage((remoteMessage) => {
//     console.log('📨 Foreground FCM message:', JSON.stringify(remoteMessage));

//     const title =
//       remoteMessage.notification?.title ||
//       remoteMessage.data?.title ||
//       'Notification';

//     const message =
//       remoteMessage.notification?.body ||
//       remoteMessage.data?.body ||
//       'You have a new message';

//     console.log('📲 Displaying local notification:', title, message);

//     PushNotification.localNotification({
//       channelId: 'default-channel-id',
//       title,
//       message,
//       playSound: true,
//       soundName: 'default',
//       importance: 'high',
//       vibrate: true,
//     });
//   });

//   return unsubscribe;
// }

export function setupForegroundNotificationListener(): () => void {
  const unsubscribe = messaging().onMessage((remoteMessage) => {
    console.log('📨 Foreground FCM message:', JSON.stringify(remoteMessage));

    const data = remoteMessage.data || {};

    const title =
      remoteMessage.notification?.title || data.title || 'Notification';

    const message =
      remoteMessage.notification?.body || data.body || 'You have a new message';

    const image =
      remoteMessage.notification?.android?.imageUrl ||
      remoteMessage.notification?.image ||
      data.image ||
      null;

    // 👇 Detect carousel payload
    let carouselImages: string[] = [];

    const carouselImagesRaw = data.carousel_images;

    if (carouselImagesRaw) {
      try {
        const rawString =
          typeof carouselImagesRaw === 'string'
            ? carouselImagesRaw
            : JSON.stringify(carouselImagesRaw);

        carouselImages = JSON.parse(rawString);

        console.log('🖼️ Carousel images parsed:', carouselImages);
      } catch (err) {
        console.error('❌ Failed to parse carousel images:', err);
      }
    }

    // 👇 If carousel pushed → activate native module
    if (carouselImages.length > 0) {
      console.log('🚀 Triggering Carousel Live Activity...');
      if (Platform.OS === 'android' && LiveActivityModule?.triggerCarousel) {
        LiveActivityModule.triggerCarousel({
          title,
          message,
          images: carouselImages,
        });
        return; // skip normal notification
      }
    }

    // ===== Normal Notification Flow =====
    console.log('📲 Displaying local notification:', title, message, image);

    const localNotif: any = {
      channelId: 'default-channel-id',
      title,
      message,
      playSound: true,
      soundName: 'default',
      importance: 'high',
      vibrate: true,
    };

    if (image) {
      localNotif.bigPicture = image;
      localNotif.largeIcon = image;
      localNotif.bigLargeIcon = image;
      localNotif.largeIconUrl = image;
    }

    PushNotification.localNotification(localNotif);

    if (Platform.OS === 'android' && LiveActivityModule?.triggerLiveActivity) {
      LiveActivityModule.triggerLiveActivity(data);
    }
  });

  return unsubscribe;
}

// Fb.ts or Fb.js

// export const requestUserPermission = () => {
//   console.log('Requesting permission...');
// };

// export const getFcmToken = () => {
//   console.log('Getting FCM token...');
// };

// export const configurePushNotifications = () => {
//   console.log('Configuring push notifications...');
// };

// export const setupForegroundNotificationListener = () => {
//   console.log('Setting up foreground listener...');
// };
