import { withOptionalProfileId } from '../utils/withOptionalProfileId';

describe('withOptionalProfileId', () => {
  it('adds p_id when non-empty', () => {
    expect(
      withOptionalProfileId(
        { additionalInfo: { city: 'Mumbai' }, cohorts: { plan: 'free' } },
        'profile-doc-1'
      )
    ).toEqual({
      additionalInfo: { city: 'Mumbai' },
      cohorts: { plan: 'free' },
      p_id: 'profile-doc-1',
    });
  });

  it('trims p_id', () => {
    expect(withOptionalProfileId({ name: 'Jane' }, '  pid-2  ')).toEqual({
      name: 'Jane',
      p_id: 'pid-2',
    });
  });

  it('omits p_id when empty, whitespace, null, or undefined', () => {
    const base = { name: 'Jane' };
    expect(withOptionalProfileId(base, '')).toBe(base);
    expect(withOptionalProfileId(base, '   ')).toBe(base);
    expect(withOptionalProfileId(base, null)).toBe(base);
    expect(withOptionalProfileId(base, undefined)).toBe(base);
    expect(withOptionalProfileId(base, '')).not.toHaveProperty('p_id');
  });
});
