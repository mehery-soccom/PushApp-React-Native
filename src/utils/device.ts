import uuid from 'react-native-uuid';

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  try {
    const newId = `-mehery-${uuid.v4()}`;
    console.log('🎉 New Device ID generated:', newId);
    cachedDeviceId = newId;
    return newId;
  } catch (error) {
    console.error('❌ Error generating Device ID:', error);
    return 'unknown-device';
  }
}
