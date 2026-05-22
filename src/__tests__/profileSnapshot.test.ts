import {
  buildProfileApiPayload,
  profilePayloadsEqual,
  profileSnapshotStorageKey,
  stableStringify,
} from '../utils/profileSnapshotCompare';

describe('profileSnapshot', () => {
  it('profileSnapshotStorageKey scopes by user id', () => {
    expect(profileSnapshotStorageKey('user_123')).toBe(
      'mehery_last_profile_snapshot:user_123'
    );
  });

  it('stableStringify is independent of key order', () => {
    const a = { b: 2, a: { z: 1, y: 2 } };
    const b = { a: { y: 2, z: 1 }, b: 2 };
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it('profilePayloadsEqual treats reordered additionalInfo as equal', () => {
    const left = buildProfileApiPayload(
      { city: 'Mumbai', name: 'Jane' },
      { plan: 'free' }
    );
    const right = buildProfileApiPayload(
      { name: 'Jane', city: 'Mumbai' },
      { plan: 'free' }
    );
    expect(profilePayloadsEqual(left, right)).toBe(true);
  });

  it('profilePayloadsEqual detects cohort changes', () => {
    const left = buildProfileApiPayload({ name: 'Jane' }, { plan: 'free' });
    const right = buildProfileApiPayload({ name: 'Jane' }, { plan: 'paid' });
    expect(profilePayloadsEqual(left, right)).toBe(false);
  });

  it('buildProfileApiPayload omits empty cohorts consistently', () => {
    const withEmpty = buildProfileApiPayload({ name: 'Jane' }, {});
    const withoutCohorts = buildProfileApiPayload({ name: 'Jane' }, {});
    expect(withEmpty).toEqual({ additionalInfo: { name: 'Jane' } });
    expect(profilePayloadsEqual(withEmpty, withoutCohorts)).toBe(true);
    expect(stableStringify(withEmpty)).not.toContain('cohorts');
  });

  it('profilePayloadsEqual detects additionalInfo changes', () => {
    const left = buildProfileApiPayload(
      { expiry_date: '2030-01-01T00:00:00.000Z' },
      {}
    );
    const right = buildProfileApiPayload(
      { expiry_date: '2031-01-01T00:00:00.000Z' },
      {}
    );
    expect(profilePayloadsEqual(left, right)).toBe(false);
  });
});
