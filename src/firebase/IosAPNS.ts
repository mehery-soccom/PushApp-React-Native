import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

let deviceRegistrationInProgress = false;
let lastApiCallTime = 0;
const API_CALL_COOLDOWN_MS = 15000; // 15 seconds

/**
 * Registers the device with APNS / push server.
 * Skips API call entirely if sessionId, contact_id, and token are unchanged.
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
    if (lastApiCallTime !== 0 && now - lastApiCallTime < API_CALL_COOLDOWN_MS) {
      const waitTime = Math.ceil(
        (API_CALL_COOLDOWN_MS - (now - lastApiCallTime)) / 1000
      );
      console.log(
        `⏳ API cool-down active. Wait ${waitTime}s before retrying.`
      );
      return;
    }

    // Get stored device/session/contact info
    const [storedDeviceId, storedSessionId, storedContactId, lastServerToken] =
      await AsyncStorage.multiGet([
        'device_id',
        'sessionId',
        'contact_id',
        'lastRegisteredToken',
      ]).then((entries) => entries.map(([_, value]) => value));

    // Generate device_id if missing
    let device_id = storedDeviceId;
    if (!device_id) {
      device_id = `${Platform.OS}_${Date.now()}`;
      await AsyncStorage.setItem('device_id', device_id);
    }

    // --- Early exit: skip API call if nothing changed ---
    if (
      storedSessionId &&
      storedSessionId.length > 0 &&
      storedContactId &&
      storedContactId.startsWith('guest_') &&
      token === lastServerToken
    ) {
      console.log(
        'ℹ️ Nothing changed (sessionId, contact_id, token). Skipping API call.'
      );
      return storedSessionId;
    }

    // Prepare payload
    const payload = {
      device_id,
      channel_id: 'demo_1754408042569',
      platform: Platform.OS,
      token,
    };

    console.log('📡 Registering/updating device...', payload);

    // --- API Call ---
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

    // Save updated info
    const newSessionId = resData.session_id || '';
    const newContactId = resData.device?.contact_id || '';

    await AsyncStorage.multiSet([
      ['APNStoken', token],
      ['lastRegisteredToken', token],
      ['sessionId', newSessionId],
      ['contact_id', newContactId],
    ]);

    return newSessionId;
  } catch (err) {
    console.error('❌ Failed to register/update device:', err);
    await AsyncStorage.setItem('isRegistered', 'false');
  } finally {
    deviceRegistrationInProgress = false;
  }
}
