import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { buildCommonHeaders } from '../helpers/buildCommonHeaders';
import { getApiBaseUrl } from '../helpers/tenantContext';
import { getDeviceId } from './device';

const LAST_LIVE_ACTIVITY_PUSH_TOKEN_KEY = 'last_live_activity_push_token';

/**
 * Register the ActivityKit push token so the server can send liveactivity APNs updates.
 */
export async function registerLiveActivityPushToken(pushToken: string): Promise<void> {
  const token = pushToken?.trim();
  if (!token || Platform.OS !== 'ios') {
    return;
  }

  const last = await AsyncStorage.getItem(LAST_LIVE_ACTIVITY_PUSH_TOKEN_KEY);
  if (last === token) {
    return;
  }

  const device_id = await getDeviceId();
  if (!device_id) {
    console.warn(
      '⚠️ [SDK] Live Activity push token skipped: device_id unavailable'
    );
    return;
  }

  let user_id = (await AsyncStorage.getItem('user_id'))?.trim() ?? '';
  if (!user_id) {
    user_id = (await AsyncStorage.getItem('server_user_id'))?.trim() ?? '';
  }

  const apiBaseUrl = await getApiBaseUrl();
  const headers = await buildCommonHeaders();

  try {
    const response = await fetch(`${apiBaseUrl}/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        device_id,
        push_token: token,
        ...(user_id ? { user_id } : {}),
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}${text ? ` - ${text}` : ''}`);
    }

    await AsyncStorage.setItem(LAST_LIVE_ACTIVITY_PUSH_TOKEN_KEY, token);
    console.log('✅ [SDK] Live Activity push token registered');
  } catch (err) {
    console.error('❌ [SDK] Failed to register Live Activity push token:', err);
  }
}
