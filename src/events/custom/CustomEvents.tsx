import AsyncStorage from '@react-native-async-storage/async-storage';
import { showPollOverlay } from '../../components/PollOverlay';
import BannerPoll from '../../components/BannerPoll';
import PipPoll from '../../components/PipPoll';
import BottomSheetPoll from '../../components/BottomSheetPoll';
import RoadblockPoll from '../../components/RoadblockPoll';
import { renderInlinePoll } from '../../components/RenderInlinePoll';
import { renderTooltipPoll } from '../../components/TooltipPollManager';
import Floater from '../../components/FloaterPoll';

// 📌 Sends a custom event, then triggers the poll fetchi
export async function sendCustomEvent(event_name: string, event_data: object) {
  const user_id = await AsyncStorage.getItem('user_id');
  const device_id = await AsyncStorage.getItem('device_id');
  console.log('device id:', device_id);

  const channel_id = await AsyncStorage.getItem('mehery_channel_id');
  console.log('channel id at custom:', channel_id);

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
// export async function sendPollEvent() {
//   const user_id = await AsyncStorage.getItem('user_id');
//   const device_id = await AsyncStorage.getItem('device_id');
//   if (!user_id || !device_id) return;

//   console.log('showing poll:', showingPoll);
//   const payload = { contact_id: `${user_id}_${device_id}` };

//   try {
//     const res = await fetch(
//       'https://demo.pushapp.co.in/pushapp/api/v1/notification/in-app/poll',
//       {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload),
//       }
//     );

//     const data = await res.json();
//     console.log('poll data:', data);

//     if (data.results?.length > 0) {
//       data.results.forEach((poll: any) => {
//         const htmlContent = poll?.template?.style?.html;
//         const code = poll?.template?.style?.code ?? '';
//         const style = poll?.template?.style ?? {};
//         const event = poll?.event ?? {};

//         const filter_id = poll?.filterId ?? '';
//         const messag_id = poll?.messageId ?? '';

//         console.log('poll.filterId from poll api:', poll.filterId);
//         console.log('poll.contactId from poll api:', poll.contactId);

//         console.log('poll.messageId from poll api:', poll.messageId);
//         sendAck(poll.contactId, poll.messageId);
//         // 🔹 Handle inline poll case
//         if (code.includes('inline') && event?.event_data?.compare) {
//           const placeholderId = event.event_data.compare;

//           // Dispatch/render inline poll → you’ll use WebView or a component
//           renderInlinePoll(placeholderId, htmlContent, style);
//         } else if (event?.event_data?.compare && code.includes('tooltip')) {
//           console.log('style:', style);

//           const tooltipData = {
//             compare: event.event_data.compare,
//             html: style?.html,
//             width: style?.width || 70,
//             align: style?.align || 'center',
//             bgColor: style?.bg_color || '',
//             line1: style?.line_1 || '',
//             line2: style?.line_2 || '',
//             line1Icon: style?.line1_icon || '',
//             line1IconPosition: style?.line1_icon_position || 'prepend',
//             line1Color: style?.line1_font_color || '#000000',
//             line2Color: style?.line2_font_color || '#000000',
//             line1FontSize: style?.line1_font_size || 12,
//             line2FontSize: style?.line2_font_size || 10,
//             line1TextStyles: style?.line1_text_styles || [],
//             line2TextStyles: style?.line2_text_styles || [],
//             line1FontTextStyles: style?.line1_font_text_styles || [],
//             line2FontTextStyles: style?.line2_font_text_styles || [],
//           };

//           console.log('✅ Final tooltipData:', tooltipData);

//           // ✅ Now dispatch to the TooltipPoll container
//           // setTimeout(() => {
//           //   renderTooltipPoll(event.event_data.compare, {
//           //     ...tooltipData,
//           //     tooltipKey: event.eventId || Date.now(), // unique key
//           //   });
//           // }, 2000); // 10,000 ms = 10 seconds

//           // console.log('setting widget send');

//           renderTooltipPoll(event.event_data.compare, {
//             ...tooltipData,
//             tooltipKey: event.eventId || Date.now(), // unique key
//           });

//           console.log('🎯 Tooltip candidate:', {
//             code,
//             compare: event?.event_data?.compare,
//             tooltipData,
//           });
//         } else if (code.includes('roadblock')) {
//           // Only roadblocks go into the queue
//           pollQueue.push({ htmlContent, code, style });
//         } else if (code.includes('floater')) {
//           const overlayProps = {
//             html: htmlContent,
//             visible: true,
//             pollType: code,
//           };
//           showPollOverlay(<Floater {...overlayProps} />);
//         } else {
//           // All others show immediately
//           const overlayProps = {
//             html: htmlContent,
//             visible: true,
//             pollType: code,
//           };
//           if (code.includes('banner')) {
//             console.log('🎯 Showing Banner Poll');
//             showPollOverlay(<BannerPoll {...overlayProps} />);
//           } else if (code.includes('picture-in-picture')) {
//             const alignment = getAlignment(style);
//             console.log('🎯 Showing Pip Poll');
//             showPollOverlay(
//               <PipPoll
//                 {...overlayProps}
//                 alignment={alignment}
//                 fullscreen={false}
//               />
//             );
//           } else if (code.includes('bottomsheet')) {
//             console.log('🎯 Showing BottomSheet Poll');
//             showPollOverlay(
//               <BottomSheetPoll
//                 {...overlayProps}
//                 onClose={() => console.log('BottomSheet closed')}
//               />
//             );
//           }
//         }
//       });

//       showNextPoll();
//     }
//   } catch (err) {
//     console.error('❌ API error:', err);
//   }
// }

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
    console.log('poll data:', data);

    if (data.results?.length > 0) {
      data.results.forEach((poll: any) => {
        const htmlContent = poll?.template?.style?.html;
        const code = poll?.template?.style?.code ?? '';
        const style = poll?.template?.style ?? {};
        const event = poll?.event ?? {};
        const filter_id = poll?.filterId ?? '';
        const message_id = poll?.messageId ?? '';

        console.log('poll.filterId:', filter_id);
        console.log('poll.messageId:', message_id);

        sendAck(poll.contactId, message_id);

        // Common props passed to all poll components
        const commonProps = {
          html: htmlContent,
          visible: true,
          pollType: code,
          filterId: filter_id,
          messageId: message_id,
        };

        if (code.includes('inline') && event?.event_data?.compare) {
          const placeholderId = event.event_data.compare;
          renderInlinePoll(placeholderId, htmlContent, style);
        } else if (event?.event_data?.compare && code.includes('tooltip')) {
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
            filterId: filter_id,
            messageId: message_id,
          };

          renderTooltipPoll(event.event_data.compare, {
            ...tooltipData,
            tooltipKey: event.eventId || Date.now(),
          });
        } else if (code.includes('roadblock')) {
          pollQueue.push({
            htmlContent,
            code,
            style,
            filterId: filter_id,
            messageId: message_id,
          });
        } else if (code.includes('floater')) {
          showPollOverlay(<Floater {...commonProps} />);
        } else {
          if (code.includes('banner')) {
            showPollOverlay(<BannerPoll {...commonProps} />);
          } else if (code.includes('picture-in-picture')) {
            const alignment = getAlignment(style);
            showPollOverlay(
              <PipPoll
                {...commonProps}
                alignment={alignment}
                fullscreen={false}
              />
            );
          } else if (code.includes('bottomsheet')) {
            showPollOverlay(
              <BottomSheetPoll
                {...commonProps}
                onClose={() => console.log('BottomSheet closed')}
              />
            );
          }
        }
      });

      showNextPoll();
    }
  } catch (err) {
    console.error('❌ API error:', err);
  }
}

export async function sendAck(contactId: string, messageId: string) {
  if (!contactId || !messageId) {
    console.warn('⚠️ Missing contactId or messageId for ACK');
    return;
  }

  const payload = {
    messageId,
    contact_id: contactId,
  };

  try {
    const res = await fetch(
      'https://demo.pushapp.co.in/pushapp/api/v1/notification/in-app/ack',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json();
    console.log('✅ Acknowledgement response:', data);
  } catch (error) {
    console.error('❌ ACK API error:', error);
  }
}
function showNextPoll(): void {
  if (pollQueue.length === 0) {
    showingPoll = false;
    return;
  }

  showingPoll = true;
  const nextPoll = pollQueue.shift();

  if (!nextPoll?.htmlContent) {
    setTimeout(showNextPoll, 3000);
    return;
  }

  const { htmlContent, code, filterId, messageId, style } = nextPoll;
  if (code.includes('roadblock')) {
    showPollOverlay(
      <RoadblockPoll
        html={htmlContent}
        // visible={true}
        pollType={code}
        style={style}
        filterId={filterId}
        messageId={messageId}
      />
    );
  }
}

export function triggerNextPoll() {
  console.log('✅ Triggering next poll');
  showNextPoll();
}
function getAlignment(style: any) {
  const vertical = (style.vertical_align ?? 'flex-end').toString();
  const horizontal = (style.horizontal_align ?? 'flex-end').toString();

  let verticalPart = 'bottom';
  if (vertical === 'flex-start') verticalPart = 'top';
  if (vertical === 'center') verticalPart = 'center';

  let horizontalPart = 'right';
  if (horizontal === 'flex-start') horizontalPart = 'left';
  if (horizontal === 'center') horizontalPart = 'center';

  return `${verticalPart}-${horizontalPart}`;
}
export function OnPageOpen(page_name: string) {
  setTimeout(() => {
    try {
      // sendCustomEvent('app_open');
      // sendCustomEvent('app_open', { page: page_name });

      sendCustomEvent('page_open', { page: page_name });
      sendCustomEvent('widget_open', { compare: 'center' });
      sendCustomEvent('widget_open', { compare: 'login_banner' });
    } catch (error) {
      console.log(`Error sending events for page: ${page_name}`, error);
    }
  }, 2000); // 2000ms = 2 seconds
}

export function OnPageClose() {
  sendCustomEvent('page_closed', { page: 'login' });
}

export function OnAppOpen() {
  sendCustomEvent('app_open', {});
}

export function OnAppClose() {
  sendCustomEvent('app_close', {});
}

/**
 * 📌 Sends a custom event from anywhere in the front-end
 * @param eventName - The name of the event
 * @param eventData - Any object data you want to send with the event
 */
