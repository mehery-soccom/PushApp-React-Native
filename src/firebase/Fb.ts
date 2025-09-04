import messaging from '@react-native-firebase/messaging';
import app from '@react-native-firebase/app';
import { PermissionsAndroid } from 'react-native';
import PushNotification from 'react-native-push-notification';
import { Platform } from 'react-native';
import { getDeviceId } from '../utils/device';
import AsyncStorage from '@react-native-async-storage/async-storage';

console.log('💬 Firebase messaging:', messaging);
console.log('📦 Firebase app exists:', app ? 'Yes' : 'No');

/**
 * Request notification permissions (platform-agnostic)
 */

export function registerDeviceWithFCM(token: string, deviceId: string) {
  const payload = {
    device_id: deviceId,
    channel_id: 'demo_1757000275474',
    platform: Platform.OS,
    token: token,
  };

  console.log('📡 Registering device with payload:', payload);

  fetch('https://demo.pushapp.co.in/pushapp/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then((res) => res.json())
    .then((resData) => {
      console.log('✅ Device registered:', resData);
    })
    .catch((err) => {
      console.error('❌ Failed to register device:', err);
    });
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
    .then((token) => {
      console.log('📲 FCM Token:', token);
      getDeviceId().then((id) => {
        console.log('✅ Device is being registered with ID:', id);

        // localStorage.setItem('device_id', id); // Save user_id to localStorage
        try {
          AsyncStorage.setItem('device_id', id); // ✅ Store it persistently
        } catch (err) {
          console.error('❌ Failed to store user_id:', err);
        }
        registerDeviceWithFCM(token, id); // <-- Register after getting token
      });
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
export function setupForegroundNotificationListener(): () => void {
  const unsubscribe = messaging().onMessage((remoteMessage) => {
    console.log('📨 Foreground FCM message:', JSON.stringify(remoteMessage));

    const title =
      remoteMessage.notification?.title ||
      remoteMessage.data?.title ||
      'Notification';

    const message =
      remoteMessage.notification?.body ||
      remoteMessage.data?.body ||
      'You have a new message';

    console.log('📲 Displaying local notification:', title, message);

    PushNotification.localNotification({
      channelId: 'default-channel-id',
      title,
      message,
      playSound: true,
      soundName: 'default',
      importance: 'high',
      vibrate: true,
    });
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
