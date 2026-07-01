import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { OnAppOpen } from '../events/custom/CustomEvents';
import { buildCommonHeaders } from '../helpers/buildCommonHeaders';
import { sdkLog } from '../helpers/sdkLogger';
import {
  extractChannelSegment,
  getApiBaseUrl,
  MEHERY_PUSHAPP_HOST_ROOT_KEY,
} from '../helpers/tenantContext';
import { getDeviceId } from './device';
import { waitForGeoIp } from './geoIpContext';
import { clearStoredProfileSnapshot } from './profileSnapshot';
import {
  extractContactIdFromRegisterResponse,
  extractSessionIdFromRegisterResponse,
  extractUserIdFromRegisterResponse,
  isAcceptableEventUserId,
  tryParseRegisterResponse,
} from './registerResponse';

export {
  extractContactIdFromRegisterResponse,
  extractSessionIdFromRegisterResponse,
  extractUserIdFromRegisterResponse,
  isAcceptableEventUserId,
  tryParseRegisterResponse,
} from './registerResponse';

/** AsyncStorage key; also written by device/register on some platforms. */
export const SESSION_ID_STORAGE_KEY = 'sessionId';

/** Server-assigned guest id from `/device/register` (`device.user_id`). */
export const REGISTERED_USER_ID_STORAGE_KEY = 'registered_user_id';

const USER_ID_POLL_MS = 400;
export const DEFAULT_USER_ID_WAIT_MS = 15_000;

const LAST_LINKED_CHANNEL_KEY = 'mehery_last_linked_channel_id';
const LAST_LINKED_HOST_KEY = 'mehery_last_linked_host_root';

export async function persistRegisterIdentity(data: unknown): Promise<void> {
  const registeredUserId = extractUserIdFromRegisterResponse(data);
  const contactId = extractContactIdFromRegisterResponse(data);
  const sessionId = extractSessionIdFromRegisterResponse(data);
  const valuesToStore: [string, string][] = [];

  if (registeredUserId) {
    valuesToStore.push([REGISTERED_USER_ID_STORAGE_KEY, registeredUserId]);
  }
  if (contactId) {
    valuesToStore.push(['contact_id', contactId]);
  }
  if (sessionId) {
    valuesToStore.push([SESSION_ID_STORAGE_KEY, sessionId]);
  }

  if (valuesToStore.length > 0) {
    await AsyncStorage.multiSet(valuesToStore);
    if (registeredUserId) {
      sdkLog.log('✅ registered_user_id stored:', registeredUserId);
    }
  }
}

export async function getEffectiveUserId(): Promise<string> {
  const [loginUserId, registeredUserId] = await AsyncStorage.multiGet([
    'user_id',
    REGISTERED_USER_ID_STORAGE_KEY,
  ]).then((entries) => entries.map(([_, value]) => value?.trim() ?? ''));

  return loginUserId || registeredUserId || '';
}

/** Poll until login or register API user id is available (never returns hardcoded guest). */
export async function waitForEffectiveUserId(
  timeoutMs = DEFAULT_USER_ID_WAIT_MS
): Promise<string> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const userId = await getEffectiveUserId();
    if (isAcceptableEventUserId(userId)) return userId.trim();
    await new Promise((resolve) => setTimeout(resolve, USER_ID_POLL_MS));
  }

  const finalUserId = await getEffectiveUserId();
  return isAcceptableEventUserId(finalUserId) ? finalUserId.trim() : '';
}

export async function getEffectiveContactId(
  deviceId: string
): Promise<string> {
  const trimmedDeviceId = deviceId.trim();
  if (!trimmedDeviceId) return '';

  const storedContactId = (await AsyncStorage.getItem('contact_id'))?.trim();
  if (storedContactId) return storedContactId;

  const effectiveUserId = await getEffectiveUserId();
  if (!effectiveUserId) return '';

  return `${effectiveUserId}_${trimmedDeviceId}`;
}

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
      sdkLog.log(
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
    sdkLog.warn(
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
  const text = await response.text();
  if (!response.ok) {
    if (/device already exists/i.test(text)) {
      sdkLog.warn(
        'ℹ️ Device already exists during auto-register before relink; continuing to /device/link retry.'
      );
      const parsed = tryParseRegisterResponse(text);
      if (parsed) {
        await persistRegisterIdentity(parsed);
      }
    } else {
      sdkLog.warn(
        `⚠️ Auto-register failed before relink. Status: ${response.status} - ${text}`
      );
      return false;
    }
  } else {
    const parsed = tryParseRegisterResponse(text);
    await persistRegisterIdentity(parsed);
  }
  await AsyncStorage.multiSet([
    ['APNStoken', token],
    ['fcmToken', fcmToken ?? ''],
    ['lastRegisteredToken', token],
    ['UserRegistered', 'true'],
    ['isRegistered', 'true'],
  ]);
  sdkLog.log('✅ Auto-registered device before relink.');
  return true;
}

export function logUserDetails(details: UserDetails) {
  sdkLog.log('User Details:');
  Object.entries(details).forEach(([key, value]) => {
    sdkLog.log(`${key}: ${value}`);
  });

  storedUserDetails = details;
}

export async function OnUserLogin(user_id: string) {
  const normalizedUserId = user_id.trim();
  if (!normalizedUserId) {
    sdkLog.warn('⏭️ [SDK][OnUserLogin] Skipped: user_id is missing/empty.');
    return;
  }

  if (loginInProgress) {
    sdkLog.log(
      '⏭️ [SDK][OnUserLogin] Skipped: login already in progress (duplicate call).'
    );
    return;
  }
  loginInProgress = true;

  sdkLog.log('userid from front end:', normalizedUserId);

  try {
    await AsyncStorage.setItem('user_id', normalizedUserId);
    sdkLog.log('✅ user_id stored:', normalizedUserId);
  } catch (err) {
    sdkLog.error('❌ Failed to store user_id:', err);
    loginInProgress = false;
    return;
  }

  try {
    const storedDeviceId = await AsyncStorage.getItem('device_id');
    const device_id = storedDeviceId || (await getDeviceId());
    const userID = await AsyncStorage.getItem('user_id');
    const loginUserId = (userID || normalizedUserId).trim();

    if (!device_id) {
      sdkLog.warn(
        '⏭️ [SDK][OnUserLogin] Skipped: device_id is not available.'
      );
      return;
    }
    if (!loginUserId) {
      sdkLog.warn(
        '⏭️ [SDK][OnUserLogin] Skipped: user_id unavailable after storage.'
      );
      return;
    }

    const currentContactId = `${loginUserId}_${device_id}`;
    const channel_id = await AsyncStorage.getItem('mehery_channel_id');
    const currentHostRoot =
      (await AsyncStorage.getItem(MEHERY_PUSHAPP_HOST_ROOT_KEY))?.trim() ?? '';
    const [storedContactId, userLoggedInFlag, storedSessionId, lastLinkedChannel, lastLinkedHost] =
      await AsyncStorage.multiGet([
        'contact_id',
        'UserLoggedIn',
        SESSION_ID_STORAGE_KEY,
        LAST_LINKED_CHANNEL_KEY,
        LAST_LINKED_HOST_KEY,
      ]).then((entries) => entries.map(([_, v]) => v || ''));
    const isUserLoggedIn = (userLoggedInFlag ?? '').toLowerCase() === 'true';
    const loginContextMatches =
      storedContactId === currentContactId &&
      isUserLoggedIn &&
      lastLinkedChannel === (channel_id ?? '') &&
      lastLinkedHost === currentHostRoot;

    if (loginContextMatches) {
      sdkLog.log(
        '⏭️ [SDK][OnUserLogin] Skipped: same contact already logged in.',
        JSON.stringify({
          contact_id: storedContactId,
          hasSession: Boolean(storedSessionId),
          channel_id,
          host: currentHostRoot,
        })
      );
      return;
    }

    if (isUserLoggedIn && !loginContextMatches) {
      sdkLog.log(
        '🔁 [SDK][OnUserLogin] Re-linking: channel or environment changed since last login.',
        JSON.stringify({
          lastLinkedChannel,
          currentChannel: channel_id,
          lastLinkedHost,
          currentHost: currentHostRoot,
        })
      );
    }
    sdkLog.log('channel id at custom:', channel_id);

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
      sdkLog.log('📦 Payload of login:', payload);
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
      sdkLog.log('Response text:', text);

      const parsedChannelSegment = extractChannelSegment(primaryChannelId);
      const shouldRetryWithParsedChannel =
        !response.ok &&
        response.status >= 500 &&
        parsedChannelSegment &&
        parsedChannelSegment !== primaryChannelId &&
        /non-existent collection in transaction/i.test(text);

      if (shouldRetryWithParsedChannel) {
        sdkLog.warn(
          `⚠️ /device/link failed for full identifier, retrying with parsed channel segment: ${parsedChannelSegment}`
        );
        const retryResult = await linkDevice(parsedChannelSegment);
        response = retryResult.response;
        text = retryResult.text;
        sdkLog.log('Retry response text:', text);
      }

      const shouldRecoverMissingDevice =
        !response.ok &&
        response.status === 404 &&
        /device not found/i.test(text);
      if (shouldRecoverMissingDevice) {
        sdkLog.warn(
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
          sdkLog.log('Retry response text after auto-register:', text);

          const shouldRetryLinkWithParsedChannel =
            !response.ok &&
            response.status === 404 &&
            parsedChannelSegment &&
            parsedChannelSegment !== primaryChannelId &&
            /device not found/i.test(text);
          if (shouldRetryLinkWithParsedChannel) {
            sdkLog.warn(
              `⚠️ /device/link still missing after auto-register; retrying with parsed channel segment: ${parsedChannelSegment}`
            );
            const parsedRetry = await linkDevice(parsedChannelSegment);
            response = parsedRetry.response;
            text = parsedRetry.text;
            sdkLog.log('Retry response text with parsed channel:', text);
          }
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} - ${text}`);
      }

      const data = JSON.parse(text);
      sdkLog.log('✅ Log in successfully:', data);

      const sessionFromLink = extractSessionIdFromLinkResponse(data);
      const responseContactId =
        typeof data?.device?.contact_id === 'string'
          ? data.device.contact_id.trim()
          : '';
      const finalContactId = responseContactId || currentContactId;
      const valuesToStore: [string, string][] = [
        ['UserLoggedIn', 'true'],
        ['contact_id', finalContactId],
        [LAST_LINKED_CHANNEL_KEY, primaryChannelId],
        [LAST_LINKED_HOST_KEY, currentHostRoot],
      ];

      if (sessionFromLink) {
        valuesToStore.push([SESSION_ID_STORAGE_KEY, sessionFromLink]);
      } else {
        sdkLog.warn('⚠️ /device/link response had no device.session_id');
      }

      await AsyncStorage.multiSet(valuesToStore);
      sdkLog.log('🟢 UserLoggedIn set to true');
      sdkLog.log('✅ contact_id stored:', finalContactId);
      if (sessionFromLink) {
        sdkLog.log('✅ session_id stored from /device/link');
      }

      OnAppOpen();
    } catch (error: any) {
      sdkLog.warn('❌ Error registering device:', error.message);
    }
  } finally {
    loginInProgress = false;
  }
}

export async function OnUserLogOut(user_id: string) {
  sdkLog.log('userid from fornt end:', user_id);
  // if (!user_id) {
  //   console.warn('❌ user_id is missing. Skipping device registration.');
  //   return;
  // }
  const userID = await AsyncStorage.getItem('user_id');

  const device_id = await AsyncStorage.getItem('device_id');

  const channel_id = await AsyncStorage.getItem('mehery_channel_id');
  sdkLog.log('channel id at custom:', channel_id);

  if (!device_id) {
    sdkLog.warn('❌ Device ID not available.');
    return;
  }

  await clearStoredProfileSnapshot(userID);

  await AsyncStorage.multiRemove([
    SESSION_ID_STORAGE_KEY,
    'UserLoggedIn',
    'contact_id',
    LAST_LINKED_CHANNEL_KEY,
    LAST_LINKED_HOST_KEY,
  ]);

  sdkLog.log('✅ Device is being registered with ID:', device_id);

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
      sdkLog.log('Logged out successfully:', data);
    })
    .catch((error) => {
      sdkLog.warn('❌ Error registering device:', error);
    });
}
export function getLoggedUserDetails(): UserDetails | null {
  return storedUserDetails;
}
