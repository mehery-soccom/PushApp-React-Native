import {
  __resetAppEnterDedupeForTests,
  buildEventReferrer,
  extractPIdFromPayload,
  normalizeUrlForDedupe,
  parseUrlQueryParams,
  rememberAppEnterForDedupe,
  shouldDedupeAppEnter,
} from '../utils/appEnterReferrer';

describe('appEnterReferrer', () => {
  beforeEach(() => {
    __resetAppEnterDedupeForTests();
  });

  it('builds PUSH referrer from payload with nulls for missing fields', () => {
    expect(
      buildEventReferrer({
        sourceType: 'PUSH',
        channelId: 'tenant_channel',
        payload: { message_id: 'msg-1' },
      })
    ).toEqual({
      sourceCategory: null,
      sourceType: 'PUSH',
      sourceChannel: 'APP',
      sourceChannelId: 'tenant_channel',
      campaignId: null,
      messageId: 'msg-1',
    });
  });

  it('merges notification_url query into the same PUSH event', () => {
    expect(
      buildEventReferrer({
        sourceType: 'PUSH',
        channelId: 'ch_1',
        payload: { messageId: 'm-push' },
        url: 'https://example.com/path?utm_campaign=spring&sourceCategory=promo',
      })
    ).toEqual({
      sourceCategory: 'promo',
      sourceType: 'PUSH',
      sourceChannel: 'APP',
      sourceChannelId: 'ch_1',
      campaignId: 'spring',
      messageId: 'm-push',
    });
  });

  it('prefers payload campaign over URL query', () => {
    expect(
      buildEventReferrer({
        sourceType: 'PUSH',
        channelId: 'ch',
        payload: { campaign_id: 'from-payload' },
        url: 'https://x.test/?utm_campaign=from-url',
      }).campaignId
    ).toBe('from-payload');
  });

  it('builds LINK referrer from URL query only', () => {
    expect(
      buildEventReferrer({
        sourceType: 'LINK',
        channelId: 'ch',
        url: 'myapp://home?messageId=link-msg&campaignId=c1',
      })
    ).toEqual({
      sourceCategory: null,
      sourceType: 'LINK',
      sourceChannel: 'APP',
      sourceChannelId: 'ch',
      campaignId: 'c1',
      messageId: 'link-msg',
    });
  });

  it('parseUrlQueryParams handles custom schemes', () => {
    expect(
      parseUrlQueryParams('scheme://open?message_id=a&utm_campaign=b')
    ).toEqual({
      message_id: 'a',
      utm_campaign: 'b',
    });
  });

  it('dedupes second open with same messageId within 2s', () => {
    rememberAppEnterForDedupe({
      messageId: 'msg-1',
      url: 'https://example.com/a',
      nowMs: 1_000,
    });
    expect(
      shouldDedupeAppEnter({
        messageId: 'msg-1',
        url: null,
        sourceType: 'LINK',
        nowMs: 2_000,
      })
    ).toBe(true);
  });

  it('dedupes LINK when URL matches prior PUSH notification_url', () => {
    rememberAppEnterForDedupe({
      messageId: 'msg-1',
      url: 'https://Example.com/path/?x=1',
      nowMs: 1_000,
    });
    expect(
      shouldDedupeAppEnter({
        messageId: null,
        url: 'https://example.com/path?x=1',
        sourceType: 'LINK',
        nowMs: 1_500,
      })
    ).toBe(true);
  });

  it('does not dedupe after window expires', () => {
    rememberAppEnterForDedupe({
      messageId: 'msg-1',
      url: null,
      nowMs: 1_000,
    });
    expect(
      shouldDedupeAppEnter({
        messageId: 'msg-1',
        url: null,
        sourceType: 'PUSH',
        nowMs: 4_000,
      })
    ).toBe(false);
  });

  it('normalizeUrlForDedupe lowercases host and strips trailing slash', () => {
    expect(normalizeUrlForDedupe('https://Example.COM/Path/')).toBe(
      'https://example.com/path'
    );
  });

  it('extractPIdFromPayload reads p_id and fallbacks', () => {
    expect(extractPIdFromPayload({ p_id: 'pid-1' })).toBe('pid-1');
    expect(extractPIdFromPayload({ profile_id: 'pid-2' })).toBe('pid-2');
    expect(extractPIdFromPayload({})).toBe('');
  });
});
