import { PAGE_ORDER, type PageId } from '../constants/pages';

/** Custom URL scheme for the example app (iOS + Android). */
export const DEEP_LINK_SCHEME = 'mehery';

export const DEEP_LINK_URLS: Record<PageId, string> = {
  home: `${DEEP_LINK_SCHEME}://home`,
  explore: `${DEEP_LINK_SCHEME}://explore`,
  account: `${DEEP_LINK_SCHEME}://account`,
};

const PAGE_IDS = new Set<string>(PAGE_ORDER);

function normalizePageToken(raw: string): PageId | null {
  const key = raw.trim().toLowerCase();
  if (PAGE_IDS.has(key)) {
    return key as PageId;
  }
  return null;
}

/**
 * Parse a deep link into a tab page id.
 * Supports:
 * - mehery://home
 * - mehery://explore
 * - mehery://account
 * - mehery:///home
 * - mehery://page/home
 */
export function parsePageIdFromDeepLink(url: string): PageId | null {
  const trimmed = typeof url === 'string' ? url.trim() : '';
  if (!trimmed) return null;

  const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:/i, '');
  const withoutSlashes = withoutScheme.replace(/^\/\//, '');
  const pathOnly = withoutSlashes.split(/[?#]/)[0] ?? '';
  const parts = pathOnly.split('/').filter(Boolean);

  for (const part of parts) {
    const pageId = normalizePageToken(part);
    if (pageId) return pageId;
  }

  return null;
}
