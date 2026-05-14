import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { OnAppOpen } from '../events/custom/CustomEvents';
import { buildCommonHeaders } from '../helpers/buildCommonHeaders';
import { extractChannelSegment, getApiBaseUrl } from '../helpers/tenantContext';
import { getDeviceId } from './device';
import { waitForGeoIp } from './geoIpContext';

/** AsyncStorage key; also written by device/register on some platforms. */
export const SESSION_ID_STORAGE_KEY = 'sessionId';

function extractSessionIdFromLinkResponse(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const root = data as Record<string, unknown>;
  const device = root.device;
  if (device && typeof device === 'object') {
    const sid = (device as Record<string, unknown>).session_id;
    if (typeof sid === 'string' && sid.trim()) return sid.trim();
  }
  if (typeof root.session_id === 'string' && root.session_id.trim()) {
    return root.session_id.trim();
  }
  return '';
}

// import { OnPageOpen } from '../events/custom/CustomEvents';
type UserDetails = {
  [key: string]: string;
};
// type DeviceDetails = {
//   [key: string]: string;
// };
// let storedDeviceDetails: DeviceDetails | null = null;

let storedUserDetails: UserDetails | null = null;
let loginInProgress = false;
const AUTO_REGISTER_TOKEN_WAIT_MS = 8000;
const AUTO_REGISTER_TOKEN_POLL_MS = 400;

async function waitForStoredRegistrationToken(
  timeoutMs = AUTO_REGISTER_TOKEN_WAIT_MS
): Promise<{ token: string; fcmToken: string }> {
  const startedAt = Date.now();
  let loggedWaiting = false;

  while (true) {
    const [lastRegisteredToken, apnsToken, fcmToken] =
      await AsyncStorage.multiGet([
        'lastRegisteredToken',
        'APNStoken',
        'fcmToken',
      ]).then((entries) => entries.map(([_, v]) => v || ''));

    const token = lastRegisteredToken || apnsToken || '';
    const normalizedFcmToken = fcmToken || '';
    if (token) {
      return { token, fcmToken: normalizedFcmToken };
    }

    if (!loggedWaiting) {
      console.log(
        `⏳ Waiting up to ${Math.ceil(timeoutMs / 1000)}s for stored push token before auto-register.`
      );
      loggedWaiting = true;
    }

    if (Date.now() - startedAt >= timeoutMs) {
      return { token: '', fcmToken: '' };
    }

    await new Promise((resolve) =>
      setTimeout(resolve, AUTO_REGISTER_TOKEN_POLL_MS)
    );
  }
}

async function recoverDeviceRegistration(
  apiBaseUrl: string,
  commonHeaders: Record<string, string>,
  deviceId: string,
  channelId: string
): Promise<boolean> {
  const { token, fcmToken } = await waitForStoredRegistrationToken();
  if (!token) {
    console.warn(
      '⚠️ Cannot auto-register device: token is missing in storage.'
    );
    return false;
  }

  const geoIP = await waitForGeoIp();
  const payload: Record<string, unknown> = {
    device_id: deviceId,
    channel_id: channelId,
    platform: Platform.OS,
    token,
    geoIP,
  };
  if (Platform.OS === 'ios' && fcmToken) {
    payload.fcm_token = fcmToken;
  }

  const response = await fetch(`${apiBaseUrl}/device/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...commonHeaders,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    console.warn(
      `⚠️ Auto-register failed before relink. Status: ${response.status} - ${text}`
    );
    return false;
  }

  const text = await response.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  const sessionId =
    typeof parsed?.session_id === 'string' ? parsed.session_id.trim() : '';
  const contactId =
    typeof parsed?.device?.contact_id === 'string'
      ? parsed.device.contact_id.trim()
      : '';
  if (sessionId) {
    await AsyncStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
  }
  if (contactId) {
    await AsyncStorage.setItem('contact_id', contactId);
  }
  await AsyncStorage.multiSet([
    ['APNStoken', token],
    ['fcmToken', fcmToken ?? ''],
    ['lastRegisteredToken', token],
    ['UserRegistered', 'true'],
    ['isRegistered', 'true'],
  ]);
  console.log('✅ Auto-registered device before relink.');
  return true;
}

export function logUserDetails(details: UserDetails) {
  console.log('User Details:');
  Object.entries(details).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });

  storedUserDetails = details;
}

export async function OnUserLogin(user_id: string) {
  const normalizedUserId = user_id.trim();
  if (!normalizedUserId) {
    console.warn('⏭️ [SDK][OnUserLogin] Skipped: user_id is missing/empty.');
    return;
  }

  if (loginInProgress) {
    console.log(
      '⏭️ [SDK][OnUserLogin] Skipped: login already in progress (duplicate call).'
    );
    return;
  }
  loginInProgress = true;

  console.log('userid from front end:', normalizedUserId);

  try {
    await AsyncStorage.setItem('user_id', normalizedUserId);
    console.log('✅ user_id stored:', normalizedUserId);
  } catch (err) {
    console.error('❌ Failed to store user_id:', err);
    loginInProgress = false;
    return;
  }

  try {
    const storedDeviceId = await AsyncStorage.getItem('device_id');
    const device_id = storedDeviceId || (await getDeviceId());
    const userID = await AsyncStorage.getItem('user_id');
    const loginUserId = (userID || normalizedUserId).trim();

    if (!device_id) {
      console.warn(
        '⏭️ [SDK][OnUserLogin] Skipped: device_id is not available.'
      );
      return;
    }
    if (!loginUserId) {
      console.warn(
        '⏭️ [SDK][OnUserLogin] Skipped: user_id unavailable after storage.'
      );
      return;
    }

    const currentContactId = `${loginUserId}_${device_id}`;
    const [storedContactId, userLoggedInFlag, storedSessionId] =
      await AsyncStorage.multiGet([
        'contact_id',
        'UserLoggedIn',
        SESSION_ID_STORAGE_KEY,
      ]).then((entries) => entries.map(([_, v]) => v || ''));
    const isUserLoggedIn = (userLoggedInFlag ?? '').toLowerCase() === 'true';
    if (storedContactId === currentContactId && isUserLoggedIn) {
      console.log(
        '⏭️ [SDK][OnUserLogin] Skipped: same contact already logged in.',
        JSON.stringify({
          contact_id: storedContactId,
          hasSession: Boolean(storedSessionId),
        })
      );
      return;
    }

    const channel_id = await AsyncStorage.getItem('mehery_channel_id');
    console.log('channel id at custom:', channel_id);

    const commonHeaders = await buildCommonHeaders();
    const apiBaseUrl = await getApiBaseUrl();
    const primaryChannelId = channel_id ?? '';

    const linkDevice = async (channelIdValue: string) => {
      const geoIP = await waitForGeoIp();
      const payload = {
        device_id,
        user_id: loginUserId,
        channel_id: channelIdValue,
        geoIP,
      };
      console.log('📦 Payload of login:', payload);
      const response = await fetch(`${apiBaseUrl}/device/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...commonHeaders,
        },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      return { response, text, payload };
    };

    try {
      let { response, text } = await linkDevice(primaryChannelId);
      console.log('Response text:', text);

      const parsedChannelSegment = extractChannelSegment(primaryChannelId);
      const shouldRetryWithParsedChannel =
        !response.ok &&
        response.status >= 500 &&
        parsedChannelSegment &&
        parsedChannelSegment !== primaryChannelId &&
        /non-existent collection in transaction/i.test(text);

      if (shouldRetryWithParsedChannel) {
        console.warn(
          `⚠️ /device/link failed for full identifier, retrying with parsed channel segment: ${parsedChannelSegment}`
        );
        const retryResult = await linkDevice(parsedChannelSegment);
        response = retryResult.response;
        text = retryResult.text;
        console.log('Retry response text:', text);
      }

      const shouldRecoverMissingDevice =
        !response.ok &&
        response.status === 404 &&
        /device not found/i.test(text);
      if (shouldRecoverMissingDevice) {
        console.warn(
          '⚠️ /device/link reported missing device. Attempting auto-register then retry.'
        );
        const recovered = await recoverDeviceRegistration(
          apiBaseUrl,
          commonHeaders,
          device_id,
          primaryChannelId
        );
        if (recovered) {
          const retryResult = await linkDevice(primaryChannelId);
          response = retryResult.response;
          text = retryResult.text;
          console.log('Retry response text after auto-register:', text);
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} - ${text}`);
      }

      const data = JSON.parse(text);
      console.log('✅ Log in successfully:', data);

      const sessionFromLink = extractSessionIdFromLinkResponse(data);
      const responseContactId =
        typeof data?.device?.contact_id === 'string'
          ? data.device.contact_id.trim()
          : '';
      const finalContactId = responseContactId || currentContactId;
      const valuesToStore: [string, string][] = [
        ['UserLoggedIn', 'true'],
        ['contact_id', finalContactId],
      ];

      if (sessionFromLink) {
        valuesToStore.push([SESSION_ID_STORAGE_KEY, sessionFromLink]);
      } else {
        console.warn('⚠️ /device/link response had no device.session_id');
      }

      await AsyncStorage.multiSet(valuesToStore);
      console.log('🟢 UserLoggedIn set to true');
      console.log('✅ contact_id stored:', finalContactId);
      if (sessionFromLink) {
        console.log('✅ session_id stored from /device/link');
      }

      OnAppOpen();
    } catch (error: any) {
      console.warn('❌ Error registering device:', error.message);
    }
  } finally {
    loginInProgress = false;
  }
}

export async function OnUserLogOut(user_id: string) {
  console.log('userid from fornt end:', user_id);
  // if (!user_id) {
  //   console.warn('❌ user_id is missing. Skipping device registration.');
  //   return;
  // }
  const userID = await AsyncStorage.getItem('user_id');

  const device_id = await AsyncStorage.getItem('device_id');

  const channel_id = await AsyncStorage.getItem('mehery_channel_id');
  console.log('channel id at custom:', channel_id);

  if (!device_id) {
    console.warn('❌ Device ID not available.');
    return;
  }

  await AsyncStorage.multiRemove([
    SESSION_ID_STORAGE_KEY,
    'UserLoggedIn',
    'contact_id',
  ]);

  console.log('✅ Device is being registered with ID:', device_id);

  const payload = {
    device_id,
    user_id: userID,
    channel_id: channel_id,
  };

  // fetch('https://demo.pushapp.co.in/pushapp/api/register/logout', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify(payload),
  // })

  const commonHeaders = await buildCommonHeaders();
  const apiBaseUrl = await getApiBaseUrl();

  fetch(`${apiBaseUrl}/device/delink`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...commonHeaders,
    },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log('Logged out successfully:', data);
    })
    .catch((error) => {
      console.warn('❌ Error registering device:', error);
    });
}
export function getLoggedUserDetails(): UserDetails | null {
  return storedUserDetails;
}
