import {
  extractClickTrackToken,
  mergeIosNotificationPayload,
  resolveIosSemanticCtaId,
} from '../utils/pushTrackPayload';

describe('pushTrackPayload', () => {
  it('mergeIosNotificationPayload flattens string data JSON over top-level', () => {
    const merged = mergeIosNotificationPayload({
      message_id: 'top',
      data: '{"message_id":"nested","t":"jwt1"}',
    });
    expect(merged.message_id).toBe('nested');
    expect(merged.t).toBe('jwt1');
  });

  it('mergeIosNotificationPayload exposes api_base_url from nested data JSON', () => {
    const merged = mergeIosNotificationPayload({
      title: 'Hi',
      data: '{"api_base_url":"https://api.example/pushapp/api","cta_buttons":"[]"}',
    });
    expect(merged.api_base_url).toBe('https://api.example/pushapp/api');
    expect(merged.title).toBe('Hi');
  });

  it('extractClickTrackToken prefers t', () => {
    expect(
      extractClickTrackToken({ t: '  abc  ', click_token: 'other' })
    ).toBe('abc');
    expect(extractClickTrackToken({ clickToken: 'x' })).toBe('x');
  });

  it('resolveIosSemanticCtaId uses cta_buttons index for PUSHAPP_ACTION_1', () => {
    const merged = {
      cta_buttons: JSON.stringify([
        { title: 'Buy', url: 'https://a.com', id: 'buy_now' },
        { title: 'Later', url: 'https://b.com', ctaId: 'later' },
      ]),
    };
    expect(resolveIosSemanticCtaId('PUSHAPP_ACTION_1', merged)).toBe('buy_now');
    expect(resolveIosSemanticCtaId('PUSHAPP_ACTION_2', merged)).toBe('later');
  });

  it('resolveIosSemanticCtaId matches button id to actionIdentifier', () => {
    const merged = {
      cta_buttons: [{ title: 'X', url: 'https://x.com', id: 'custom_action' }],
    };
    expect(resolveIosSemanticCtaId('custom_action', merged)).toBe(
      'custom_action'
    );
  });
});
