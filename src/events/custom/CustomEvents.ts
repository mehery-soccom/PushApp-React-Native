import AsyncStorage from '@react-native-async-storage/async-storage';
import { showPollOverlay } from '../../components/PollOverlay';

// 📌 Sends a custom event, then triggers the poll fetch
export async function sendCustomEvent(event_name: string, event_data: object) {
  const user_id = await AsyncStorage.getItem('user_id');
  const device_id = await AsyncStorage.getItem('device_id');
  const channel_id = 'demo_1754408042569';
  const payload = { user_id, channel_id, event_name, event_data };

  console.log(`📡 Sending ${event_name} event:`, payload);

  try {
    const res = await fetch('https://demo.pushapp.co.in/pushapp/api/v1/event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': device_id ?? '',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    const data = await res.json();
    console.log(`✅ ${event_name} event logged successfully:`, data);

    // Always fetch poll after event
    await sendPollEvent();
  } catch (err) {
    console.error(`❌ Failed to log ${event_name} event:`, err);
  }
}

// 📌 Fetches poll HTML and shows in overlay
export async function sendPollEvent() {
  const user_id = await AsyncStorage.getItem('user_id');
  const device_id = await AsyncStorage.getItem('device_id');

  if (!user_id || !device_id) {
    console.error('❌ Missing user_id or device_id');
    return;
  }

  const contact_id = `${user_id}_${device_id}`;
  const payload = { contact_id };

  try {
    const res = await fetch(
      'https://demo.pushapp.co.in/pushapp/api/v1/notification/in-app/poll',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

    const data = await res.json();
    console.log('✅ Full poll API response:', data);

    if (data.results && data.results.length > 0) {
      const htmlContent = data.results[0]?.template?.style?.html;
      if (htmlContent) {
        console.log('📜 HTML Content:', htmlContent);
        showPollOverlay(htmlContent); // SDK handles modal automatically
      } else {
        console.log('⚠ No HTML found in style');
      }
    } else {
      console.log('⚠ No results found');
    }
  } catch (err) {
    console.error('❌ API error:', err);
  }
}

export function OnPageOpen() {
  sendCustomEvent('page_open', { page: 'login' });
}

export function OnPageClose() {
  sendCustomEvent('page_closed', { page: 'login' });
}
