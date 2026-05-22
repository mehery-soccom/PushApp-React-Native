export const LEGACY_PROFILE_UPDATED_KEY = 'mehery_profile_updated';

const PROFILE_SNAPSHOT_KEY_PREFIX = 'mehery_last_profile_snapshot:';

export type ProfileApiPayload = {
  additionalInfo: Record<string, unknown>;
  cohorts?: Record<string, unknown>;
};

export function profileSnapshotStorageKey(userId: string): string {
  return `${PROFILE_SNAPSHOT_KEY_PREFIX}${userId.trim()}`;
}

function sortKeysDeep(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortKeysDeep(obj[key]);
  }
  return sorted;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

export function profilePayloadsEqual(
  a: ProfileApiPayload,
  b: ProfileApiPayload
): boolean {
  return stableStringify(a) === stableStringify(b);
}

export function buildProfileApiPayload(
  additionalInfo: Record<string, unknown>,
  cohorts: Record<string, unknown>
): ProfileApiPayload {
  return {
    additionalInfo,
    ...(Object.keys(cohorts).length ? { cohorts } : {}),
  };
}
