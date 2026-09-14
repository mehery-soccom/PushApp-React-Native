import {
  DEEP_LINK_SCHEME,
  DEEP_LINK_URLS,
  parsePageIdFromDeepLink,
} from '../utils/deepLinks';

describe('deepLinks', () => {
  it('exposes mehery scheme URLs for each page', () => {
    expect(DEEP_LINK_SCHEME).toBe('mehery');
    expect(DEEP_LINK_URLS).toEqual({
      home: 'mehery://home',
      explore: 'mehery://explore',
      account: 'mehery://account',
    });
  });

  it('parses host-style page links', () => {
    expect(parsePageIdFromDeepLink('mehery://home')).toBe('home');
    expect(parsePageIdFromDeepLink('mehery://explore')).toBe('explore');
    expect(parsePageIdFromDeepLink('mehery://account')).toBe('account');
  });

  it('parses path-style and page/ prefixes', () => {
    expect(parsePageIdFromDeepLink('mehery:///home')).toBe('home');
    expect(parsePageIdFromDeepLink('mehery://page/explore')).toBe('explore');
    expect(parsePageIdFromDeepLink('mehery://page/account?x=1')).toBe(
      'account'
    );
  });

  it('is case-insensitive and ignores unknown URLs', () => {
    expect(parsePageIdFromDeepLink('MEHERY://Home')).toBe('home');
    expect(parsePageIdFromDeepLink('mehery://unknown')).toBeNull();
    expect(parsePageIdFromDeepLink('')).toBeNull();
  });
});
