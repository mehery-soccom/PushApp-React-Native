/**
 * In-app track payload helpers (POST stays in poll components).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { sdkLog } from '../helpers/sdkLogger';
import {
  buildInAppCtaData,
  type CtaTrackFields,
} from './ctaTrackPayload';

export type InAppTrackEvent =
  | 'cta'
  | 'dismissed'
  | 'longPress'
  | 'openUrl'
  | 'unknown';

/** Build `data` for in-app track when event is `cta`. */
export function buildInAppTrackData(
  eventType: InAppTrackEvent,
  cta?: CtaTrackFields
): Record<string, unknown> {
  if (eventType === 'cta' && cta) {
    return buildInAppCtaData(cta);
  }
  return {};
}

export type InAppTrackPayloadInput = {
  messageId?: string;
  filterId?: string;
  journiId?: string;
  event: InAppTrackEvent;
  data?: Record<string, unknown>;
};

/**
 * Resolve contact_id without importing user.ts (avoids cycle with poll components).
 * Same fallback as getEffectiveContactId: stored → synthesize userId_deviceId.
 */
async function resolveInAppContactId(): Promise<string> {
  const stored = (await AsyncStorage.getItem('contact_id'))?.trim() ?? '';
  if (stored) return stored;

  const deviceId = (await AsyncStorage.getItem('device_id'))?.trim() ?? '';
  if (!deviceId) return '';

  const pairs = await AsyncStorage.multiGet(['user_id', 'registered_user_id']);
  const userId = (pairs[0]?.[1] || pairs[1]?.[1] || '').trim();
  if (!userId) return '';

  const synthesized = `${userId}_${deviceId}`;
  await AsyncStorage.setItem('contact_id', synthesized);
  return synthesized;
}

/**
 * Full body for POST …/v1/notification/in-app/track.
 * Includes top-level `contact_id`, `p_id`, and `session_id` when available.
 */
export async function buildInAppTrackPayload(
  input: InAppTrackPayloadInput
): Promise<Record<string, unknown>> {
  const contactId = await resolveInAppContactId();
  const identityPairs = await AsyncStorage.multiGet(['p_id', 'sessionId']);
  const profileId = (identityPairs[0]?.[1] || '').trim();
  const sessionId = (identityPairs[1]?.[1] || '').trim();

  const payload: Record<string, unknown> = {
    event: input.event,
    data: input.data ?? {},
  };
  if (input.messageId) payload.messageId = input.messageId;
  if (input.filterId) payload.filterId = input.filterId;
  if (input.journiId) payload.journiId = input.journiId;
  if (contactId) payload.contact_id = contactId;
  if (profileId) payload.p_id = profileId;
  if (sessionId) payload.session_id = sessionId;
  sdkLog.log(
    '[InAppTrack] click POST body:',
    JSON.stringify(payload)
  );
  return payload;
}
