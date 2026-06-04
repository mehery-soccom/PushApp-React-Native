import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { buildCommonHeaders } from '../helpers/buildCommonHeaders';
import { postDeviceRegister } from '../helpers/deviceRegisterHttp';
import { extractChannelSegment, getApiBaseUrl } from '../helpers/tenantContext';
import { getDeviceId } from '../utils/device';
import { waitForGeoIp } from '../utils/geoIpContext';
import { SESSION_ID_STORAGE_KEY } from '../utils/user';
import messaging from '@react-native-firebase/messaging';

let deviceRegistrationInProgress = false;
let lastApiCallTime = 0;
const API_CALL_COOLDOWN_MS = 15000; // 15 seconds

async function postDeviceRegistration(
  apiBaseUrl: string,
  commonHeaders: Record<string, string>,
  payload: Record<string, unknown>
) {
  return postDeviceRegister(apiBaseUrl, commonHeaders, payload);
}

async function persistRegistrationState(params: {
  token: string;
  fcmToken: string | null;
  currentState: string;
  sessionId?: string;
  contactId?: string;
}) {
  const valuesToStore: [string, string][] = [
    ['APNStoken', params.token],
    ['fcmToken', params.fcmToken ?? ''],
    ['lastRegisteredToken', params.token],
    ['lastRegisteredState', params.currentState],
    ['UserRegistered', 'true'],
    ['isRegistered', 'true'],
  ];

  if (params.sessionId) {
    valuesToStore.push([SESSION_ID_STORAGE_KEY, params.sessionId]);
  }

  if (params.contactId) {
    valuesToStore.push(['contact_id', params.contactId]);
  }

  await AsyncStorage.multiSet(valuesToStore);
}

async function cacheRegistrationTokens(params: {
  token: string;
  fcmToken: string | null;
}) {
  await AsyncStorage.multiSet([
    ['APNStoken', params.token],
    ['fcmToken', params.fcmToken ?? ''],
  ]);
}

/**
 * Registers the device with APNS / push server.
 * Ensures registration only happens when needed and not repeatedly.
 */
export async function registerDeviceWithAPNS(token: string) {
  if (!token) {
    console.warn('⚠️ No token provided, skipping registration.');
    return;
  }

  if (deviceRegistrationInProgress) {
    console.log(
      'ℹ️ Device registration already in progress. Skipping duplicate call.'
    );
    return;
  }

  deviceRegistrationInProgress = true;

  try {
    const now = Date.now();
    if (lastApiCallTime && now - lastApiCallTime < API_CALL_COOLDOWN_MS) {
      const waitTime = Math.ceil(
        (API_CALL_COOLDOWN_MS - (now - lastApiCallTime)) / 1000
      );
      console.log(`⏳ Cooldown active. Wait ${waitTime}s before retrying.`);
      return;
    }

    const [, , lastServerToken, lastRegisteredState] =
      await AsyncStorage.multiGet([
        SESSION_ID_STORAGE_KEY,
        'contact_id',
        'lastRegisteredToken',
        'lastRegisteredState',
      ]).then((entries) => entries.map(([_, v]) => v));
    console.log('last servertoken:', lastServerToken);

    const device_id = await getDeviceId();

    // Fetch FCM token safely
    let fcmToken: string | null = null;
    try {
      fcmToken = await messaging().getToken();
      console.log('📲 Fetched iOS FCM Token:', fcmToken);
    } catch (e) {
      console.warn('⚠️ Could not fetch FCM token on iOS', e);
    }

    await cacheRegistrationTokens({ token, fcmToken });

    const channel_id = (await AsyncStorage.getItem('mehery_channel_id')) ?? '';
    console.log('channel id at custom:', channel_id);

    // Device registration should only care about token/device identity.
    // Login/session changes are handled separately by /device/link.
    const currentState = JSON.stringify({
      token,
      fcmToken,
      device_id,
      channel_id,
      platform: Platform.OS,
    });

    if (lastRegisteredState === currentState) {
      console.log('✅ Registration already valid. Skipping re-register.');
      return;
    }

    const geoIP = await waitForGeoIp();
    // Prepare payload
    const payload = {
      device_id,
      channel_id: channel_id,
      platform: Platform.OS,
      token,
      fcm_token: fcmToken,
      geoIP,
    };
    console.log('📡 Registering/updating device...', payload);
    const commonHeaders = await buildCommonHeaders();
    const apiBaseUrl = await getApiBaseUrl();
    let { response, text } = await postDeviceRegistration(
      apiBaseUrl,
      commonHeaders,
      payload
    );

    const parsedChannelSegment = extractChannelSegment(channel_id);
    const shouldRetryWithParsedChannel =
      !response.ok &&
      response.status >= 500 &&
      parsedChannelSegment &&
      parsedChannelSegment !== channel_id &&
      /non-existent collection in transaction/i.test(text);

    if (shouldRetryWithParsedChannel) {
      console.warn(
        `⚠️ /device/register failed for full identifier, retrying with parsed channel segment: ${parsedChannelSegment}`
      );
      payload.channel_id = parsedChannelSegment;
      const retryResult = await postDeviceRegistration(
        apiBaseUrl,
        commonHeaders,
        payload
      );
      response = retryResult.response;
      text = retryResult.text;
      console.log('Retry response text:', text);
    }

    if (!response.ok) {
      if (/device already exists/i.test(text)) {
        console.warn(
          'ℹ️ Device already exists on server. Treating registration as valid.'
        );
        await persistRegistrationState({
          token,
          fcmToken,
          currentState,
        });
        lastApiCallTime = Date.now();
        return;
      }
      throw new Error(`HTTP ${response.status}${text ? ` - ${text}` : ''}`);
    }

    let resData: any = null;
    try {
      resData = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(
        `Device register returned a non-JSON success response: ${text}`
      );
    }
    console.log('✅ Device registered/updated:', resData);

    lastApiCallTime = Date.now();

    const newSessionId =
      (typeof resData?.session_id === 'string' && resData.session_id) || '';
    const newContactId =
      (typeof resData?.device?.contact_id === 'string' &&
        resData.device.contact_id) ||
      '';
    const serverUserId =
      (typeof resData?.device?.user_id === 'string' && resData.device.user_id) ||
      '';

    await persistRegistrationState({
      token,
      fcmToken,
      currentState,
      sessionId: newSessionId,
      contactId: newContactId,
    });

    if (serverUserId) {
      await AsyncStorage.setItem('server_user_id', serverUserId);
    }

    return newSessionId;
  } catch (err) {
    console.error('❌ Failed to register/update device:', err);
    await AsyncStorage.multiSet([
      ['isRegistered', 'false'],
      ['UserRegistered', 'false'],
    ]);
  } finally {
    deviceRegistrationInProgress = false;
  }
}
