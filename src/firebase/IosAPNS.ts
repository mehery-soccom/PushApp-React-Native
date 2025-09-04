import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export async function registerDeviceWithAPNS(token: string) {
  const device_id = await AsyncStorage.getItem('device_id');
  console.log('device id at apns is:', device_id);
  console.log('Rtoken id at apns is:', token);

  const payload = {
    device_id: device_id,
    channel_id: 'demo_1757000275474',
    platform: Platform.OS,
    token: token,
  };

  console.log('📡 Registering device with payload:', payload);

  fetch('https://demo.pushapp.co.in/pushapp/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then((res) => res.json())
    .then((resData) => {
      console.log('✅ Device registered:', resData);
    })
    .catch((err) => {
      console.error('❌ Failed to register device:', err);
    });
}
