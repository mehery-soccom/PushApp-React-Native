/**
 * Build `event_referrer` for attributed `app_enter` (push / deep link only).
 */

export type AppEnterSourceType = 'PUSH' | 'LINK';

export type EventReferrer = {
  sourceCategory: string | null;
  sourceType: AppEnterSourceType;
  sourceChannel: 'APP';
  sourceChannelId: string;
  campaignId: string | null;
  messageId: string | null;
};

export type AppEnterInput = {
  sourceType: AppEnterSourceType;
  channelId: string;
  /** Merged push / FCM data (optional for LINK-only). */
  payload?: Record<string, unknown> | null;
  /** Deep link or notification_url (optional for PUSH without URL). */
  url?: string | null;
  /** One-shot p_id from notification when storage is empty. */
  p_id?: string | null;
};

const DEDUPE_WINDOW_MS = 2_000;

type DedupeEntry = {
  at: number;
  messageId: string | null;
  url: string | null;
};

let lastAppEnter: DedupeEntry | null = null;

const normalizedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

function firstNonEmpty(...values: unknown[]): string | null {
  for (const value of values) {
    const s = normalizedString(value);
    if (s) return s;
  }
  return null;
}

/** Parse query string from a URL (supports custom schemes). */
export function parseUrlQueryParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const trimmed = url.trim();
  if (!trimmed) return out;

  let query = '';
  const qIndex = trimmed.indexOf('?');
  if (qIndex >= 0) {
    query = trimmed.slice(qIndex + 1);
    const hash = query.indexOf('#');
    if (hash >= 0) query = query.slice(0, hash);
  }

  if (!query) return out;

  for (const part of query.split('&')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const rawKey = eq >= 0 ? part.slice(0, eq) : part;
    const rawVal = eq >= 0 ? part.slice(eq + 1) : '';
    try {
      const key = decodeURIComponent(rawKey.replace(/\+/g, ' ')).trim();
      const val = decodeURIComponent(rawVal.replace(/\+/g, ' ')).trim();
      if (key && val && !(key in out)) {
        out[key] = val;
      }
    } catch {
      /* ignore malformed pairs */
    }
  }
  return out;
}

function pickCampaignId(
  payload: Record<string, unknown> | null | undefined,
  query: Record<string, string>
): string | null {
  return firstNonEmpty(
    payload?.campaignId,
    payload?.campaign_id,
    payload?.campaign,
    payload?.utm_campaign,
    query.campaignId,
    query.campaign_id,
    query.campaign,
    query.utm_campaign
  );
}

function pickMessageId(
  payload: Record<string, unknown> | null | undefined,
  query: Record<string, string>
): string | null {
  return firstNonEmpty(
    payload?.messageId,
    payload?.message_id,
    query.messageId,
    query.message_id
  );
}

function pickSourceCategory(
  payload: Record<string, unknown> | null | undefined,
  query: Record<string, string>
): string | null {
  return firstNonEmpty(
    payload?.sourceCategory,
    payload?.source_category,
    query.sourceCategory,
    query.source_category
  );
}

/** Normalize URL for dedupe (strip trailing slash on path, lowercase scheme/host when present). */
export function normalizeUrlForDedupe(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    // Prefer URL parser for http(s); fall back to trimmed string for custom schemes.
    if (/^https?:\/\//i.test(trimmed)) {
      const u = new URL(trimmed);
      u.hash = '';
      let path = u.pathname;
      if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
      }
      return `${u.protocol}//${u.host.toLowerCase()}${path}${u.search}`.toLowerCase();
    }
  } catch {
    /* fall through */
  }
  return trimmed.toLowerCase();
}

export function buildEventReferrer(input: AppEnterInput): EventReferrer {
  const payload = input.payload ?? null;
  const url = normalizedString(input.url) || '';
  const query = url ? parseUrlQueryParams(url) : {};

  return {
    sourceCategory: pickSourceCategory(payload, query),
    sourceType: input.sourceType,
    sourceChannel: 'APP',
    sourceChannelId: input.channelId.trim(),
    campaignId: pickCampaignId(payload, query),
    messageId: pickMessageId(payload, query),
  };
}

/**
 * Returns true if this open should be skipped as a duplicate of a recent
 * `app_enter` (same messageId, or LINK URL matching a prior PUSH notification URL).
 */
export function shouldDedupeAppEnter(input: {
  messageId: string | null;
  url: string | null;
  sourceType: AppEnterSourceType;
  nowMs?: number;
}): boolean {
  const now = input.nowMs ?? Date.now();
  if (!lastAppEnter) return false;
  if (now - lastAppEnter.at > DEDUPE_WINDOW_MS) return false;

  const msg = normalizedString(input.messageId) || null;
  const lastMsg = lastAppEnter.messageId;
  if (msg && lastMsg && msg === lastMsg) {
    return true;
  }

  const url = normalizeUrlForDedupe(normalizedString(input.url) || '');
  const lastUrl = lastAppEnter.url
    ? normalizeUrlForDedupe(lastAppEnter.url)
    : '';
  if (
    url &&
    lastUrl &&
    url === lastUrl &&
    (input.sourceType === 'LINK' || lastAppEnter.messageId != null)
  ) {
    return true;
  }

  return false;
}

export function rememberAppEnterForDedupe(input: {
  messageId: string | null;
  url: string | null;
  nowMs?: number;
}): void {
  lastAppEnter = {
    at: input.nowMs ?? Date.now(),
    messageId: normalizedString(input.messageId) || null,
    url: normalizedString(input.url) || null,
  };
}

/** Test helper — not part of the public SDK surface. */
export function __resetAppEnterDedupeForTests(): void {
  lastAppEnter = null;
}

export function extractPIdFromPayload(
  payload: Record<string, unknown> | null | undefined
): string {
  if (!payload) return '';
  return (
    firstNonEmpty(payload.p_id, payload.profile_id, payload.profileId) ?? ''
  );
}
