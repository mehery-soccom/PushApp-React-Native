/**
 * iOS push notification payload helpers for POST …/notification/push/track
 * (aligns with AppDelegate merged fields + Android NotificationCtaUtils).
 */

const normalizedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const EMBEDDED_JSON_BLOB_KEYS = [
  'payload',
  'extras',
  'custom',
  'mehery_data',
] as const;

function mergeJsonObjectBlobInto(
  merged: Record<string, unknown>,
  rawBlob: unknown
): void {
  if (
    rawBlob != null &&
    typeof rawBlob === 'object' &&
    !Array.isArray(rawBlob)
  ) {
    Object.assign(merged, rawBlob as Record<string, unknown>);
    return;
  }
  if (typeof rawBlob !== 'string') return;
  const text = rawBlob.trim();
  if (!text.startsWith('{')) return;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      Object.assign(merged, parsed as Record<string, unknown>);
    }
  } catch {
    /* ignore */
  }
}

export function mergeIosNotificationPayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...payload };
  const rawData = payload.data;
  if (
    rawData != null &&
    typeof rawData === 'object' &&
    !Array.isArray(rawData)
  ) {
    Object.assign(merged, rawData as Record<string, unknown>);
  } else if (typeof rawData === 'string') {
    const text = rawData.trim();
    if (text) {
      try {
        const parsed = JSON.parse(text) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          Object.assign(merged, parsed as Record<string, unknown>);
        }
      } catch {
        /* ignore */
      }
    }
  }
  for (const k of EMBEDDED_JSON_BLOB_KEYS) {
    mergeJsonObjectBlobInto(merged, merged[k]);
  }
  return merged;
}

/** Same host keys as Android [NotificationCtaUtils.trackBaseUrl] (payload-first). */
export function getPushTrackBaseFromMerged(
  merged: Record<string, unknown>
): string {
  const keys = [
    'track_base_url',
    'api_base_url',
    'apiBaseUrl',
    'base_url',
    'push_api_url',
    'pushapp_api_url',
    'mehery_api_base_url',
  ] as const;
  for (const k of keys) {
    const v = normalizedString(merged[k]);
    if (v) return v;
  }
  return '';
}

export function extractClickTrackToken(
  merged: Record<string, unknown>
): string | undefined {
  const keys = [
    't',
    'click_token',
    'clickToken',
    'track_token',
    'trackToken',
  ] as const;
  for (const k of keys) {
    const v = normalizedString(merged[k]);
    if (v) return v;
  }
  return undefined;
}

function parseCtaButtonArray(raw: unknown): Record<string, unknown>[] {
  if (raw == null) return [];
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return [];
    try {
      parsed = JSON.parse(t) as unknown;
    } catch {
      return [];
    }
  }
  if (Array.isArray(parsed)) {
    return parsed.filter(
      (x): x is Record<string, unknown> => !!x && typeof x === 'object'
    );
  }
  if (parsed && typeof parsed === 'object') {
    const o = parsed as Record<string, unknown>;
    const nested =
      (Array.isArray(o.buttons) ? o.buttons : null) ??
      (Array.isArray(o.items) ? o.items : null) ??
      (Array.isArray(o.ctas) ? o.ctas : null);
    if (Array.isArray(nested)) {
      return nested.filter(
        (x): x is Record<string, unknown> => !!x && typeof x === 'object'
      );
    }
  }
  return [];
}

function trackIdFromButton(
  btn: Record<string, unknown>,
  fallback: string
): string {
  const idKeys = [
    'id',
    'ctaId',
    'cta_id',
    'actionId',
    'action_id',
    'value',
  ] as const;
  for (const k of idKeys) {
    const s = normalizedString(btn[k]);
    if (s) return s;
  }
  const labelKeys = ['title', 'label', 'text', 'name', 'buttonTitle'] as const;
  for (const k of labelKeys) {
    const s = normalizedString(btn[k]);
    if (s) return s;
  }
  return fallback;
}

function iosActionButtonIndex(actionId: string): number | null {
  if (
    actionId === 'PUSHAPP_ACTION_1' ||
    actionId === 'PUSHAPP_OPT_IN' ||
    actionId === 'PUSHAPP_YES'
  ) {
    return 0;
  }
  if (actionId === 'PUSHAPP_ACTION_2' || actionId.endsWith('_MID')) {
    return 1;
  }
  if (
    actionId === 'PUSHAPP_ACTION_3' ||
    actionId === 'PUSHAPP_NOT_INTERESTED' ||
    actionId === 'PUSHAPP_NO'
  ) {
    return 2;
  }
  const parts = actionId.split('_');
  const last = parts[parts.length - 1] ?? '';
  const n = parseInt(last, 10);
  if (!Number.isNaN(n) && last !== '') {
    return Math.max(0, n - 1);
  }
  return null;
}

function legacyTrackIdAtIndex(
  merged: Record<string, unknown>,
  index: number
): string {
  const titleKeys = [
    ['title1', 'cta1_title', 'button1_title'],
    ['title2', 'cta2_title', 'button2_title'],
    ['title3', 'cta3_title', 'button3_title'],
  ] as const;
  const defaults = ['Open', 'View', 'More'] as const;
  const keys = titleKeys[index];
  if (!keys) return '';
  for (const k of keys) {
    const s = normalizedString(merged[k]);
    if (s) return s;
  }
  return defaults[index] ?? '';
}

/**
 * Map UNNotification actionIdentifier to semantic CTA id for track body `data.ctaId`.
 */
export function resolveIosSemanticCtaId(
  actionId: string,
  merged: Record<string, unknown>
): string {
  const id = normalizedString(actionId);
  if (!id) return '';

  for (let i = 1; i <= 3; i++) {
    const ak = `action${i}` as const;
    if (normalizedString(merged[ak]) === id) {
      const label = legacyTrackIdAtIndex(merged, i - 1);
      return label || id;
    }
  }

  const buttons = parseCtaButtonArray(merged.cta_buttons ?? merged.buttons);
  if (buttons.length > 0) {
    const idx = iosActionButtonIndex(id);
    if (idx !== null && idx >= 0 && idx < buttons.length) {
      return trackIdFromButton(buttons[idx]!, `cta_${idx + 1}`);
    }
    for (const btn of buttons) {
      const bid = normalizedString(btn.id);
      if (bid && bid === id) {
        return trackIdFromButton(btn, id);
      }
    }
  }

  const idx = iosActionButtonIndex(id);
  if (idx !== null) {
    const legacy = legacyTrackIdAtIndex(merged, idx);
    if (legacy) return legacy;
  }

  return id;
}
