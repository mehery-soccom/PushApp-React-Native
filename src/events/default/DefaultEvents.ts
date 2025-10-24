import AsyncStorage from '@react-native-async-storage/async-storage';

async function sendEvent(event_name: string) {
  const user_id = await AsyncStorage.getItem('user_id');
  const deviceId = await AsyncStorage.getItem('device_id');

  const channel_id = 'demo_1754408042569';
  console.log('user id is:', user_id);
  console.log('device id is:', deviceId);

  //   if (!user_id) {
  //     console.warn(`❌ user_id is missing. Skipping ${event_name} event.`);
  //     return;
  //   }

  const payload = {
    user_id,
    channel_id,
    event_name,
    event_data: {},
    device_id: deviceId,
  };

  console.log(`📡 Sending ${event_name} event:`, payload);

  fetch('https://demo.pushapp.co.in/pushapp/api/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      return res.json();
    })
    .then((data) => {
      console.log(`✅ ${event_name} event logged successfully:`, data);
    })
    .catch((err) => {
      console.error(`❌ Failed to log ${event_name} event:`, err);
    });
}

export function OnAppOpen() {
  sendEvent('app_open');
}

export function OnAppClose() {
  sendEvent('app_close');
}
