jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  NativeModules: {},
}));

const mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  multiGet: jest.fn((keys: string[]) =>
    Promise.resolve(keys.map((key: string) => [key, mockStorage[key] ?? null]))
  ),
}));

jest.mock('../utils/androidPushTrackSync', () => ({
  syncAndroidPushTrackContactId: jest.fn(),
  syncAndroidPushTrackIdentity: jest.fn(),
}));

jest.mock('../events/custom/CustomEvents', () => ({
  OnAppOpen: jest.fn(),
  flushPendingCustomEvents: jest.fn(),
}));

jest.mock('../socket/WebSock', () => ({
  reauthenticateWebSocket: jest.fn(),
}));

jest.mock('../helpers/sdkLogger', () => ({
  sdkLog: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../helpers/buildCommonHeaders', () => ({
  buildCommonHeaders: jest.fn().mockResolvedValue({}),
}));

jest.mock('../helpers/tenantContext', () => ({
  getApiBaseUrl: jest.fn().mockResolvedValue('https://example.com'),
  MEHERY_PUSHAPP_HOST_ROOT_KEY: 'mehery_pushapp_host_root',
  extractChannelSegment: jest.fn(),
}));

jest.mock('../utils/device', () => ({
  getDeviceId: jest.fn().mockResolvedValue('device-1'),
}));

jest.mock('../utils/ensureDeviceRegistered', () => ({
  ensureDeviceRegistered: jest.fn(),
  settleAfterRegister: jest.fn(),
}));

jest.mock('../utils/geoIpContext', () => ({
  waitForGeoIp: jest.fn().mockResolvedValue({}),
}));

jest.mock('../utils/profileSnapshot', () => ({
  clearStoredProfileSnapshot: jest.fn(),
}));

jest.mock('../utils/sdkReadiness', () => ({
  waitForSdkReady: jest.fn().mockResolvedValue(undefined),
}));

import {
  buildInAppTrackData,
  buildInAppTrackPayload,
} from '../utils/inAppTrack';
import { buildCtaData, buildSyntheticCtaData } from '../utils/ctaTrackPayload';

describe('inAppTrack', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  });

  it('buildInAppTrackData includes ctaId and button_id for cta events', () => {
    expect(
      buildInAppTrackData('cta', buildCtaData('Save', 'PUSHAPP_SAVE'))
    ).toEqual({
      ctaId: 'Save',
      button_id: 'PUSHAPP_SAVE',
    });
  });

  it('buildInAppTrackData omits fields for non-cta events', () => {
    expect(buildInAppTrackData('dismissed')).toEqual({});
    expect(buildInAppTrackData('openUrl')).toEqual({});
  });

  it('buildInAppTrackData supports synthetic CTA ids', () => {
    expect(
      buildInAppTrackData('cta', buildSyntheticCtaData('MEDIA_CLICK'))
    ).toEqual({
      ctaId: 'MEDIA_CLICK',
      button_id: 'MEDIA_CLICK',
    });
  });

  it('buildInAppTrackPayload includes contact_id when stored', async () => {
    mockStorage.contact_id = 'user_device_1';
    mockStorage.device_id = 'device_1';
    const payload = await buildInAppTrackPayload({
      messageId: 'msg-1',
      filterId: 'flt-1',
      journiId: 'j-1',
      event: 'cta',
      data: { ctaId: 'Buy', button_id: 'PUSHAPP_BUY' },
    });
    expect(payload).toEqual({
      messageId: 'msg-1',
      filterId: 'flt-1',
      journiId: 'j-1',
      event: 'cta',
      data: { ctaId: 'Buy', button_id: 'PUSHAPP_BUY' },
      contact_id: 'user_device_1',
    });
    expect(payload).not.toHaveProperty('p_id');
    expect(payload).not.toHaveProperty('session_id');
  });

  it('buildInAppTrackPayload includes p_id and session_id when stored', async () => {
    mockStorage.contact_id = 'user_device_1';
    mockStorage.p_id = 'profile-doc-1';
    mockStorage.sessionId = 'sess-abc';
    const payload = await buildInAppTrackPayload({
      messageId: 'msg-1',
      filterId: 'flt-1',
      event: 'cta',
      data: { ctaId: 'Buy', button_id: 'PUSHAPP_BUY' },
    });
    expect(payload.contact_id).toBe('user_device_1');
    expect(payload.p_id).toBe('profile-doc-1');
    expect(payload.session_id).toBe('sess-abc');
  });

  it('buildInAppTrackPayload synthesizes contact_id from user+device', async () => {
    mockStorage.device_id = 'dev-9';
    mockStorage.user_id = 'alice';
    const payload = await buildInAppTrackPayload({
      messageId: 'm',
      filterId: 'f',
      event: 'dismissed',
      data: {},
    });
    expect(payload.contact_id).toBe('alice_dev-9');
  });
});
