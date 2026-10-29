jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
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
  multiSet: jest.fn((pairs: [string, string][]) => {
    for (const [key, value] of pairs) mockStorage[key] = value;
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys: string[]) => {
    for (const key of keys) delete mockStorage[key];
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
}));

jest.mock('../utils/androidPushTrackSync', () => ({
  syncAndroidPushTrackContactId: jest.fn(),
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

import { getEffectiveContactId } from '../utils/user';
import { syncAndroidPushTrackContactId } from '../utils/androidPushTrackSync';

describe('getEffectiveContactId', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockStorage)) delete mockStorage[key];
    jest.clearAllMocks();
  });

  it('returns stored contact_id without rewriting', async () => {
    mockStorage.contact_id = 'stored_contact';
    await expect(getEffectiveContactId('dev-1')).resolves.toBe('stored_contact');
    expect(syncAndroidPushTrackContactId).not.toHaveBeenCalled();
  });

  it('synthesizes userId_deviceId, persists, and syncs Android prefs', async () => {
    mockStorage.user_id = 'alice';
    await expect(getEffectiveContactId('dev-9')).resolves.toBe('alice_dev-9');
    expect(mockStorage.contact_id).toBe('alice_dev-9');
    expect(syncAndroidPushTrackContactId).toHaveBeenCalledWith('alice_dev-9');
  });
});
