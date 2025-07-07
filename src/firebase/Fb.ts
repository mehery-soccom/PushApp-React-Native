import messaging from '@react-native-firebase/messaging';
import app from '@react-native-firebase/app';
import { Alert } from 'react-native';

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
    console.log('Authorization status:', authStatus);
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
function setupForegroundNotificationListener(): () => void {
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    Alert.alert('A new FCM message arrived!', JSON.stringify(remoteMessage));
  });
  return unsubscribe;
}

export {
  requestUserPermission,
  getFcmToken,
  setupForegroundNotificationListener,
};
