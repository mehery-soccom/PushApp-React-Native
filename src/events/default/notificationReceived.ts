import { sendCustomEvent } from '../custom/CustomEvents';
import { sdkLog } from '../../helpers/sdkLogger';
import { mergeIosNotificationPayload } from '../../utils/pushTrackPayload';
import { SDK_EVENT_NAMES } from './eventNames';

const seenReceivedKeys = new Set<string>();
const RECEIVED_CACHE_LIMIT = 100;

const SILENT_TYPES = new Set(['silent_keepalive', 'silent_daily_ping']);

const normalizedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

function firstString(
  merged: Record<string, unknown>,
  keys: readonly string[]
): string {
  for (const key of keys) {
    const value = normalizedString(merged[key]);
    if (value) return value;
  }
  return '';
}

function isSilentDelivery(merged: Record<string, unknown>): boolean {
  return SILENT_TYPES.has(firstString(merged, ['type']));
}

/** Stable id shared by the FCM message and the local notification we schedule from it. */
export function notificationReceivedDedupeKey(
  merged: Record<string, unknown>
): string {
  return firstString(merged, [
    'messageId',
    'message_id',
    'gcm.message_id',
    'notification_id',
    'notificationId',
  ]);
}

export function buildNotificationReceivedEventData(
  merged: Record<string, unknown>
): Record<string, string> {
  const data: Record<string, string> = {};
  const messageId = firstString(merged, [
    'messageId',
    'message_id',
    'gcm.message_id',
  ]);
  const notificationId = firstString(merged, [
    'notification_id',
    'notificationId',
  ]);
  const filterId = firstString(merged, ['filterId', 'filter_id']);
  const title = firstString(merged, ['title']);
  const body = firstString(merged, ['body', 'message']);

  if (messageId) data.message_id = messageId;
  if (notificationId) data.notification_id = notificationId;
  if (filterId) data.filter_id = filterId;
  if (title) data.title = title;
  if (body) data.body = body;
  return data;
}

export function __resetNotificationReceivedDedupeForTests(): void {
  seenReceivedKeys.clear();
}

/**
 * Custom event when a notification is delivered to the device.
 * Taps stay on push/track (`opened` / `cta`). Silent keep-alives are ignored.
 */
export async function trackNotificationReceived(
  payload: Record<string, unknown> | null | undefined
): Promise<boolean> {
  if (!payload) return false;
  const merged = mergeIosNotificationPayload(payload);
  if (isSilentDelivery(merged)) return false;

  const dedupeKey = notificationReceivedDedupeKey(merged);
  if (dedupeKey) {
    if (seenReceivedKeys.has(dedupeKey)) return false;
    seenReceivedKeys.add(dedupeKey);
    if (seenReceivedKeys.size > RECEIVED_CACHE_LIMIT) {
      const oldest = seenReceivedKeys.values().next().value as
        | string
        | undefined;
      if (oldest) seenReceivedKeys.delete(oldest);
    }
  }

  const sent = await sendCustomEvent(
    SDK_EVENT_NAMES.NOTIFICATION_RECEIVED,
    buildNotificationReceivedEventData(merged),
    { eventType: 'LOG' }
  );
  if (sent) {
    sdkLog.log('[SDK] notification_received', dedupeKey || '(no message id)');
  }
  return sent;
}
