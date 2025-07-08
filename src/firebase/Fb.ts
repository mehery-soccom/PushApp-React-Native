import messaging from '@react-native-firebase/messaging';
import app from '@react-native-firebase/app';
import { Platform, PermissionsAndroid } from 'react-native';
import PushNotification from 'react-native-push-notification';

console.log('💬 Firebase messaging:', messaging);
console.log('📦 Firebase app exists:', app ? 'Yes' : 'No');

/**
 * Request notification permissions
 */
async function requestUserPermission(): Promise<void> {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('✅ Notification permission granted:', authStatus);
  } else {
    console.warn('❌ Notification permission denied');
  }

  // Android 13+ (API 33+) POST_NOTIFICATIONS permission
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const permission = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    if (permission === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('✅ Android POST_NOTIFICATIONS permission granted');
    } else {
      console.warn('❌ Android POST_NOTIFICATIONS permission denied');
    }
  }
}

/**
 * Get the current device's FCM token
 */
async function getFcmToken(): Promise<string | null> {
  try {
    const token = await messaging().getToken();
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Listen for foreground messages
 */

function configurePushNotifications(): void {
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

function setupForegroundNotificationListener(): () => void {
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
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
      message, // MUST be 'message', not 'body'
      playSound: true,
      soundName: 'default',
      importance: 'high',
      vibrate: true,
    });
  });

  return unsubscribe;
}

export {
  requestUserPermission,
  getFcmToken,
  configurePushNotifications,
  setupForegroundNotificationListener,
};
