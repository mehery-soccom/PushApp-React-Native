import uuid from 'react-native-uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  try {
    // 1️⃣ Check if it exists in memory or persistent storage
    const storedId = await AsyncStorage.getItem('device_id');
    if (storedId) {
      console.log('📦 Loaded Device ID from storage:', storedId);
      cachedDeviceId = storedId;
      return storedId;
    }

    // 2️⃣ If not found, generate a new one
    const newId = `-mehery-${uuid.v4()}__${Date.now()}`;
    console.log('🎉 New Device ID generated:', newId);

    // 3️⃣ Save it persistently
    await AsyncStorage.setItem('device_id', newId);
    cachedDeviceId = newId;

    return newId;
  } catch (error) {
    console.error('❌ Error generating Device ID:', error);
    return 'unknown-device';
  }
}
