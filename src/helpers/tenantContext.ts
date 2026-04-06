import AsyncStorage from '@react-native-async-storage/async-storage';

export const MEHERY_TENANT_KEY = 'mehery_tenant';
const DEFAULT_TENANT = 'demo';

function sanitizeTenant(tenant: string): string {
  return tenant.trim().toLowerCase();
}

function getDelimiterIndex(value: string): number {
  const underscoreIndex = value.indexOf('_');
  const hashIndex = value.indexOf('#');
  const delimiterIndexes = [underscoreIndex, hashIndex].filter(
    (index) => index > 0
  );
  return delimiterIndexes.length ? Math.min(...delimiterIndexes) : -1;
}

export function extractTenantFromIdentifier(identifier: string): string {
  const rawIdentifier = (identifier ?? '').trim();
  if (!rawIdentifier) return DEFAULT_TENANT;

  const splitIndex = getDelimiterIndex(rawIdentifier);

  const tenantPart =
    splitIndex > -1 ? rawIdentifier.slice(0, splitIndex) : rawIdentifier;
  const tenant = sanitizeTenant(tenantPart);

  return tenant || DEFAULT_TENANT;
}

export function extractChannelSegment(identifier: string): string {
  const rawIdentifier = (identifier ?? '').trim();
  if (!rawIdentifier) return rawIdentifier;

  const splitIndex = getDelimiterIndex(rawIdentifier);
  if (splitIndex === -1) return rawIdentifier;

  const channelSegment = rawIdentifier.slice(splitIndex + 1).trim();
  return channelSegment || rawIdentifier;
}

export async function storeTenantFromIdentifier(
  identifier: string
): Promise<string> {
  const tenant = extractTenantFromIdentifier(identifier);
  await AsyncStorage.setItem(MEHERY_TENANT_KEY, tenant);
  return tenant;
}

export async function getTenantFromStorage(): Promise<string> {
  const tenant = await AsyncStorage.getItem(MEHERY_TENANT_KEY);
  return sanitizeTenant(tenant ?? '') || DEFAULT_TENANT;
}

export async function getHttpHostBaseUrl(): Promise<string> {
  const tenant = await getTenantFromStorage();
  return `https://${tenant}.pushapp.co.in`;
}

export async function getWsHostUrl(): Promise<string> {
  const tenant = await getTenantFromStorage();
  return `wss://${tenant}.pushapp.co.in/pushapp`;
}

export async function getApiBaseUrl(): Promise<string> {
  const host = await getHttpHostBaseUrl();
  return `${host}/pushapp/api`;
}
