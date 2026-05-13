import {
  extractClickTrackToken,
  getPushTrackBaseFromMerged,
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

  it('mergeIosNotificationPayload merges payload / extras JSON blobs', () => {
    const merged = mergeIosNotificationPayload({
      payload: '{"click_token":"jwt2","title":"x"}',
      extras: '{"url1":"https://one.example"}',
    });
    expect(merged.click_token).toBe('jwt2');
    expect(merged.url1).toBe('https://one.example');
  });

  it('getPushTrackBaseFromMerged reads api_base_url', () => {
    expect(
      getPushTrackBaseFromMerged({
        track_base_url: ' https://t.example/ ',
      })
    ).toBe('https://t.example/');
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

  it('resolveIosSemanticCtaId maps PUSHAPP_* to title via action1..3', () => {
    const merged = {
      title1: 'Buy',
      title2: 'Sell',
      title3: 'Later',
      action1: 'PUSHAPP_BUY',
      action2: 'PUSHAPP_SELL',
      action3: 'PUSHAPP_LATER',
    };
    expect(resolveIosSemanticCtaId('PUSHAPP_SELL', merged)).toBe('Sell');
    expect(resolveIosSemanticCtaId('PUSHAPP_LATER', merged)).toBe('Later');
  });
});
