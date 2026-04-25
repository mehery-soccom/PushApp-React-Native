import AsyncStorage from '@react-native-async-storage/async-storage';
import { showPollOverlay } from '../../components/PollOverlay';
import BannerPoll from '../../components/BannerPoll';
import PipPoll from '../../components/PipPoll';
import BottomSheetPoll from '../../components/BottomSheetPoll';
import RoadblockPoll from '../../components/RoadblockPoll';
import { renderInlinePoll } from '../../components/RenderInlinePoll';
import { renderTooltipPoll } from '../../components/TooltipPollManager';
import Floater from '../../components/FloaterPoll';
import { buildCommonHeaders } from '../../helpers/buildCommonHeaders';
import { getApiBaseUrl } from '../../helpers/tenantContext';

function htmlToPlainText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveTemplateValue(
  context: Record<string, any>,
  path: string
): string {
  const keys = path
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean);
  let current: any = context;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return '';
    current = current[key];
  }
  if (current == null) return '';
  return String(current);
}

function interpolateTemplateString(
  value: unknown,
  context: Record<string, any>
): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, rawKey) => {
    const key = String(rawKey || '').trim();
    if (!key) return '';
    const directValue = resolveTemplateValue(context, key);
    if (directValue) return directValue;
    if (key.startsWith('data.')) {
      return resolveTemplateValue(context, key.slice(5));
    }
    return '';
  });
}

// 📌 Sends a custom event, then triggers the poll fetchi
export async function sendCustomEvent(event_name: string, event_data: object) {
  const stored_user_id = await AsyncStorage.getItem('user_id');
  const user_id = stored_user_id || 'guest';
  const device_id = await AsyncStorage.getItem('device_id');
  console.log('device id:', device_id);

  const channel_id = await AsyncStorage.getItem('mehery_channel_id');
  console.log('channel id at custom:', channel_id);

  const payload = { user_id, channel_id, event_name, event_data };

  console.log(`📡 Sending ${event_name} event:`, payload);
  const commonHeaders = await buildCommonHeaders();
  const apiBaseUrl = await getApiBaseUrl();
  try {
    const res = await fetch(`${apiBaseUrl}/v1/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': device_id ?? '',
        ...commonHeaders,
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
  if (!device_id) return;

  const final_user_id = user_id || 'guest';

  console.log('showing poll:', showingPoll);
  const payload = { contact_id: `${final_user_id}_${device_id}` };
  const commonHeaders = await buildCommonHeaders();
  const apiBaseUrl = await getApiBaseUrl();

  try {
    const res = await fetch(`${apiBaseUrl}/v1/notification/in-app/poll`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...commonHeaders,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log('poll data:', data);

    if (data.results?.length > 0) {
      data.results.forEach((poll: any) => {
        const htmlContent = poll?.template?.style?.html;
        const code = poll?.template?.style?.code ?? '';
        const style = poll?.template?.style ?? {};
        const event = poll?.event ?? {};
        const templateModelData = poll?.template?.model?.data ?? {};
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

          renderInlinePoll(placeholderId, htmlContent, style, {
            filterId: filter_id,
            messageId: message_id,
          });
          // setTimeout(() => {}, 2000);
        } else if (event?.event_data?.compare && code.includes('tooltip')) {
          const interpolationContext = {
            ...templateModelData,
            ...(event?.event_data ?? {}),
            ...(poll?.event_data ?? {}),
          };
          const rawTooltipTitle =
            htmlToPlainText(style?.richline_1) || style?.line_1 || '';
          const tooltipTitle = interpolateTemplateString(
            rawTooltipTitle,
            interpolationContext
          );
          const tooltipBody = interpolateTemplateString(
            style?.line_2 || '',
            interpolationContext
          );
          const tooltipData = {
            compare: event.event_data.compare,
            html: style?.html,
            width: style?.width || 70,
            align: style?.align || 'center',
            bgColor: style?.bg_color || '',
            line1: tooltipTitle,
            line2: tooltipBody,
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
          const verticalAlign = String(style?.vertical_align ?? 'flex-end');
          const horizontalAlign = String(style?.horizontal_align ?? 'center');
          const floaterPosition =
            verticalAlign === 'flex-start'
              ? 'top'
              : verticalAlign === 'center'
                ? 'center'
                : 'bottom';
          const floaterHorizontalAlign =
            horizontalAlign === 'flex-start'
              ? 'left'
              : horizontalAlign === 'flex-end'
                ? 'right'
                : 'center';
          showPollOverlay(
            <Floater
              {...commonProps}
              position={floaterPosition}
              horizontalAlign={floaterHorizontalAlign}
            />
          );
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

  const commonHeaders = await buildCommonHeaders();
  const apiBaseUrl = await getApiBaseUrl();

  try {
    const res = await fetch(`${apiBaseUrl}/v1/notification/in-app/ack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...commonHeaders,
      },
      body: JSON.stringify(payload),
    });

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
  console.log('⏳ Waiting 3 seconds before triggering app_open...');

  setTimeout(() => {
    try {
      console.log('🚀 Triggering app_open event');
      sendCustomEvent('app_open', {});
    } catch (error) {
      console.error('❌ Error during OnAppOpen:', error);
    }
  }, 1000); // 1000ms = 1 seconds delay
}

export function OnAppClose() {
  sendCustomEvent('app_close', {});
}

/**
 * 📌 Sends a custom event from anywhere in the front-end
 * @param eventName - The name of the event
 * @param eventData - Any object data you want to send with the event
 */
