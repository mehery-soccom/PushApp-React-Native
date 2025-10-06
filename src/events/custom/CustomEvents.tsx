import AsyncStorage from '@react-native-async-storage/async-storage';
import { showPollOverlay } from '../../components/PollOverlay';
import BannerPoll from '../../components/BannerPoll';
import PipPoll from '../../components/PipPoll';
import BottomSheetPoll from '../../components/BottomSheetPoll';
import RoadblockPoll from '../../components/RoadblockPoll';
import { renderInlinePoll } from '../../components/RenderInlinePoll';
import { renderTooltipPoll } from '../../components/TooltipPollManager';

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
    console.log('data from poll api:', data);

    if (data.results?.length > 0) {
      data.results.forEach((poll: any) => {
        const htmlContent = poll?.template?.style?.html;
        const code = poll?.template?.style?.code ?? '';
        const style = poll?.template?.style ?? {};
        const event = poll?.event ?? {};

        // 🔹 Handle inline poll case
        if (code.includes('inline') && event?.event_data?.compare) {
          const placeholderId = event.event_data.compare;

          // Dispatch/render inline poll → you’ll use WebView or a component
          renderInlinePoll(placeholderId, htmlContent, style);
        } else if (event?.event_data?.compare && code.includes('tooltip')) {
          console.log('style:', style);

          const tooltipData = {
            compare: event.event_data.compare,
            html: style?.html,
            width: style?.width || 70,
            align: style?.align || 'center',
            bgColor: style?.bg_color || '',
            line1: style?.line_1 || '',
            line2: style?.line_2 || '',
            line1Icon: style?.line1_icon || '',
            line1IconPosition: style?.line1_icon_position || 'prepend',
            line1Color: style?.line1_font_color || '#000000',
            line2Color: style?.line2_font_color || '#000000',
            line1FontSize: style?.line1_font_size || 12,
            line2FontSize: style?.line2_font_size || 10,
            line1TextStyles: style?.line1_text_styles || [],
            line2TextStyles: style?.line2_text_styles || [],
            line1FontTextStyles: style?.line1_font_text_styles || [],
            line2FontTextStyles: style?.line2_font_text_styles || [],
          };

          console.log('✅ Final tooltipData:', tooltipData);

          // ✅ Now dispatch to the TooltipPoll container
          setTimeout(() => {
            renderTooltipPoll(event.event_data.compare, {
              ...tooltipData,
              tooltipKey: event.eventId || Date.now(), // unique key
            });
          }, 5000); // 10,000 ms = 10 seconds

          console.log('🎯 Tooltip candidate:', {
            code,
            compare: event?.event_data?.compare,
            tooltipData,
          });
        } else {
          // Add normal overlays to the queue
          pollQueue.push({ htmlContent, code, style });
        }
      });

      showNextPoll();
    }
  } catch (err) {
    console.error('❌ API error:', err);
  }
}

// Show next poll in the queue// Show next poll in the queue
function showNextPoll() {
  if (pollQueue.length === 0) {
    showingPoll = false;
    return;
  }

  showingPoll = true;
  const nextPoll = pollQueue.shift();
  if (!nextPoll?.htmlContent) {
    // if no HTML, skip and go to next with delay
    return setTimeout(showNextPoll, 3000);
  }

  const onClose = () => {
    // hidePollOverlay();

    // ⏳ Add delay before showing next poll
    setTimeout(() => {
      showNextPoll();
    }, 5000); // 3 sec delay (adjust as needed)
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
