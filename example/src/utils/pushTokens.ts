import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

export async function loadPushTokens(): Promise<{
  apnsToken: string;
  fcmToken: string;
}> {
  const [storedApns, storedFcm] = await AsyncStorage.multiGet([
    'APNStoken',
    'fcmToken',
  ]).then((entries) => entries.map(([, value]) => value ?? ''));

  let fcmToken = storedFcm;
  try {
    const liveFcm = await messaging().getToken();
    if (liveFcm) {
      fcmToken = liveFcm;
    }
  } catch (error) {
    console.warn('[Example] Failed to read FCM token', error);
  }

  return {
    apnsToken: Platform.OS === 'ios' ? (storedApns ?? '') : '',
    fcmToken: fcmToken ?? '',
  };
}
