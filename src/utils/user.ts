import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnAppOpen } from '../events/custom/CustomEvents';
import { buildCommonHeaders } from '../helpers/buildCommonHeaders';
import { extractChannelSegment, getApiBaseUrl } from '../helpers/tenantContext';

// import { OnPageOpen } from '../events/custom/CustomEvents';
type UserDetails = {
  [key: string]: string;
};
// type DeviceDetails = {
//   [key: string]: string;
// };
// let storedDeviceDetails: DeviceDetails | null = null;

let storedUserDetails: UserDetails | null = null;

export function logUserDetails(details: UserDetails) {
  console.log('User Details:');
  Object.entries(details).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });

  storedUserDetails = details;
}

export async function OnUserLogin(user_id: string) {
  console.log('userid from front end:', user_id);

  try {
    await AsyncStorage.setItem('user_id', user_id);
    console.log('✅ user_id stored:', user_id);
  } catch (err) {
    console.error('❌ Failed to store user_id:', err);
  }

  const device_id = await AsyncStorage.getItem('device_id');
  const userID = await AsyncStorage.getItem('user_id');

  if (!device_id) {
    console.warn('❌ Device ID not available.');
    return;
  }

  const channel_id = await AsyncStorage.getItem('mehery_channel_id');
  console.log('channel id at custom:', channel_id);

  const commonHeaders = await buildCommonHeaders();
  const apiBaseUrl = await getApiBaseUrl();
  const loginUserId = userID || user_id;
  const primaryChannelId = channel_id ?? '';

  const linkDevice = async (channelIdValue: string) => {
    const payload = {
      device_id,
      user_id: loginUserId,
      channel_id: channelIdValue,
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

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status} - ${text}`);
    }

    const data = JSON.parse(text);
    console.log('✅ Log in successfully:', data);

    // 🔑 Set UserLoggedIn = true
    await AsyncStorage.setItem('UserLoggedIn', 'true');
    console.log('🟢 UserLoggedIn set to true');

    OnAppOpen();
  } catch (error: any) {
    console.warn('❌ Error registering device:', error.message);
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
