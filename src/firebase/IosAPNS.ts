import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

let deviceRegistrationInProgress = false;
let lastApiCallTime = 0;
const API_CALL_COOLDOWN_MS = 15000; // 15 seconds

/**
 * Registers the device with APNS / push server.
 * Ensures registration only happens when needed and not repeatedly.
 */
export async function registerDeviceWithAPNS(token: string) {
  if (!token) {
    console.warn('⚠️ No token provided, skipping registration.');
    return;
  }

  // 🧠 Check login state first
  const isLoggedIn = await AsyncStorage.getItem('UserRegistered');
  if (isLoggedIn === 'true') {
    console.log('🚫 User is logged in — skipping device registration.');
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

    const [
      storedDeviceId,
      storedSessionId,
      storedContactId,
      lastServerToken,
      lastRegisteredState,
    ] = await AsyncStorage.multiGet([
      'device_id',
      'sessionId',
      'contact_id',
      'lastRegisteredToken',
      'lastRegisteredState',
    ]).then((entries) => entries.map(([_, v]) => v));
    console.log('last servertoken:', lastServerToken);

    // Generate device_id if missing
    let device_id = storedDeviceId;
    if (!device_id) {
      device_id = `${Platform.OS}_${Date.now()}`;
      await AsyncStorage.setItem('device_id', device_id);
    }

    // Compose a stable key representing last known registration
    const currentState = JSON.stringify({
      token,
      storedSessionId,
      storedContactId,
    });

    // If registration state hasn’t changed, skip entirely
    if (lastRegisteredState === currentState) {
      console.log('✅ Registration already valid. Skipping re-register.');
      deviceRegistrationInProgress = false;
      return storedSessionId;
    }
    await AsyncStorage.setItem('UserRegistered', 'true');

    // Prepare payload
    const payload = {
      device_id,
      channel_id: 'demo_1754408042569',
      platform: Platform.OS,
      token,
    };

    console.log('📡 Registering/updating device...', payload);

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

    const newSessionId = resData.session_id || '';
    const newContactId = resData.device?.contact_id || '';

    // Save updated state
    await AsyncStorage.multiSet([
      ['APNStoken', token],
      ['lastRegisteredToken', token],
      ['sessionId', newSessionId],
      ['contact_id', newContactId],
      [
        'lastRegisteredState',
        JSON.stringify({
          token,
          storedSessionId: newSessionId,
          storedContactId: newContactId,
        }),
      ],
      ['isRegistered', 'true'],
    ]);

    return newSessionId;
  } catch (err) {
    console.error('❌ Failed to register/update device:', err);
    await AsyncStorage.setItem('isRegistered', 'false');
  } finally {
    deviceRegistrationInProgress = false;
  }
}
