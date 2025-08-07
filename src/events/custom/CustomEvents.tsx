import AsyncStorage from '@react-native-async-storage/async-storage';

async function sendCustomEvent(event_name: string, event_data: object) {
  const user_id = await AsyncStorage.getItem('user_id');
  const channel_id = 'demo_1754408042569';

  const payload = {
    user_id,
    channel_id,
    event_name,
    event_data, // ✅ use passed event_data
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

// ✅ Use these to log page open/close with correct event_name and data
export function OnPageOpen() {
  sendCustomEvent('page_open', { page: 'loginpage' });
}

export function OnPageClose() {
  sendCustomEvent('page_closed', { page: 'loginpage' });
}
