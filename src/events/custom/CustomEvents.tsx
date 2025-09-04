import AsyncStorage from '@react-native-async-storage/async-storage';
import { showPollOverlay, hidePollOverlay } from '../../components/PollOverlay';
import BannerPoll from '../../components/BannerPoll';
import PipPoll from '../../components/PipPoll';
import BottomSheetPoll from '../../components/BottomSheetPoll';
import RoadblockPoll from '../../components/RoadblockPoll';

// 📌 Sends a custom event, then triggers the poll fetch
export async function sendCustomEvent(event_name: string, event_data: object) {
  const user_id = await AsyncStorage.getItem('user_id');
  const device_id = await AsyncStorage.getItem('device_id');
  console.log('device id:', device_id);
  const channel_id = 'demo_1757000275474';
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

let pollQueue: any[] = [];
let showingPoll: boolean; // no initial value
export async function sendPollEvent() {
  const user_id = await AsyncStorage.getItem('user_id');
  const device_id = await AsyncStorage.getItem('device_id');
  if (!user_id || !device_id) return;
  // if (showingPoll) return; // don't fetch new poll if one is showing
  console.log('showing poll:', showingPoll);
  const payload = { contact_id: `${user_id}_${device_id}` };

  try {
    const res = await fetch(
      'https://demo.pushapp.co.in/pushapp/api/v1/notification/in-app/poll',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();
    if (data.results?.length > 0) {
      // Fill the queue with all templates
      pollQueue = data.results.map((poll: any) => {
        const htmlContent = poll?.template?.style?.html;
        const code = poll?.template?.style?.code ?? '';
        return { htmlContent, code, style: poll?.template?.style };
      });

      showNextPoll();
    }
  } catch (err) {
    console.error('❌ API error:', err);
  }
}

// Show next poll in the queue
function showNextPoll() {
  if (pollQueue.length === 0) {
    showingPoll = false;
    return;
  }

  showingPoll = true;
  const nextPoll = pollQueue.shift();
  if (!nextPoll.htmlContent) return showNextPoll();

  const onClose = () => {
    hidePollOverlay();
    showNextPoll(); // automatically show the next poll
  };

  const { htmlContent, code, style } = nextPoll;

  if (code.includes('roadblock')) {
    showPollOverlay(
      <RoadblockPoll html={htmlContent} visible={true} onClose={onClose} />
    );
  } else if (code.includes('banner')) {
    showPollOverlay(
      <BannerPoll html={htmlContent} visible={true} onClose={onClose} />
    );
  } else if (code.includes('picture-in-picture')) {
    const alignment = getAlignment(style);
    showPollOverlay(
      <PipPoll
        html={htmlContent}
        visible={true}
        onClose={onClose}
        alignment={alignment}
      />
    );
  } else if (code.includes('bottomsheet')) {
    showPollOverlay(
      <BottomSheetPoll html={htmlContent} visible={true} onClose={onClose} />
    );
  }
}

function getAlignment(style: any) {
  const vertical = (style['vertical_align'] ?? 'flex-end').toString();
  const horizontal = (style['horizontal_align'] ?? 'flex-end').toString();

  let verticalPart = 'bottom';
  if (vertical === 'flex-start') verticalPart = 'top';
  if (vertical === 'center') verticalPart = 'center';

  let horizontalPart = 'right';
  if (horizontal === 'flex-start') horizontalPart = 'left';
  if (horizontal === 'center') horizontalPart = 'center';

  return `${verticalPart}-${horizontalPart}`;
}
export function OnPageOpen() {
  sendCustomEvent('page_open', { page: 'login' });
}

export function OnPageClose() {
  sendCustomEvent('page_closed', { page: 'login' });
}
