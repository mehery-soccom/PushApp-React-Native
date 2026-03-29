import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Shared in-memory cache for critical identifiers to avoid race conditions
 * between initSdk and immediate follow-up tasks (like device registration).
 */
let cachedTenant: string | null = null;
let cachedChannelId: string | null = null;

export const setInMemIdentifiers = (tenant: string, channelId: string) => {
  cachedTenant = tenant;
  cachedChannelId = channelId;
};

/**
 * Retrieves the tenant ID from memory or persistent storage.
 * Defaults to 'demo' if not found.
 */
export async function getTenant(): Promise<string> {
  if (cachedTenant) return cachedTenant;
  const tenant = await AsyncStorage.getItem('mehery_tenant_id');
  if (tenant) {
    cachedTenant = tenant;
    return tenant;
  }
  return 'demo';
}

/**
 * Retrieves the channel ID from memory or persistent storage.
 */
export async function getChannelId(): Promise<string | null> {
  if (cachedChannelId) return cachedChannelId;
  const channelId = await AsyncStorage.getItem('mehery_channel_id');
  if (channelId) {
    cachedChannelId = channelId;
  }
  return cachedChannelId;
}

/**
 * Constructs the base API URL dynamically.
 */
export async function getApiBaseUrl(): Promise<string> {
  const tenant = await getTenant();
  console.log('tenant:', tenant);
  return `https://${tenant}.pushapp.co.in/pushapp/api`;
}

/**
 * Constructs the base WebSocket URL dynamically.
 */
export async function getSocketUrl(): Promise<string> {
  const tenant = await getTenant();
  return `wss://${tenant}.pushapp.co.in/pushapp`;
}
