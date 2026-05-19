import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildCommonHeaders } from '../../helpers/buildCommonHeaders';
import { getApiBaseUrl } from '../../helpers/tenantContext';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const PROFILE_UPDATED_KEY = 'mehery_profile_updated';
const DATE_FIELD_KEY_REGEX = /(dob|date|birth|expiry|expires|expir)/i;

// Wait until UserLoggedIn is set in AsyncStorage, up to `timeoutMs`.
// Falls back to a plain delay if the flag never appears.
async function waitForUserLoggedIn(
  timeoutMs = 30_000,
  pollIntervalMs = 500
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const flag = await AsyncStorage.getItem('UserLoggedIn');
    if (flag === 'true') return true;
    await delay(pollIntervalMs);
  }
  return false;
}

function toUtcTimestampMs(value: unknown): number | null {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1_000_000_000_000
      ? Math.trunc(value * 1000)
      : Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric < 1_000_000_000_000
        ? Math.trunc(numeric * 1000)
        : Math.trunc(numeric);
    }

    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function parseDateLikeValue(value: unknown): Date | null {
  const utcTs = toUtcTimestampMs(value);
  if (utcTs !== null) {
    const parsed = new Date(utcTs);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Support common DOB inputs like DD/MM/YYYY or DD-MM-YYYY.
    const dateOnlyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dateOnlyMatch) {
      const day = Number(dateOnlyMatch[1]);
      const month = Number(dateOnlyMatch[2]);
      const year = Number(dateOnlyMatch[3]);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        const parsed = new Date(Date.UTC(year, month - 1, day));
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
    }
  }

  return null;
}

function normalizeAdditionalInfoDates(
  data: Record<string, any>,
  sourceName: string
): Record<string, any> {
  const normalized = { ...data };

  for (const [key, value] of Object.entries(normalized)) {
    if (!DATE_FIELD_KEY_REGEX.test(key)) continue;

    const parsedDate = parseDateLikeValue(value);
    if (parsedDate) {
      // Always send full ISO UTC string — backend isValidUTC requires
      // the "YYYY-MM-DDTHH:mm:ss.sssZ" format; date-only strings fail.
      normalized[key] = parsedDate.toISOString();
      continue;
    }

    console.warn(
      `⚠️ [SDK][Profile] Invalid date in "${sourceName}.${key}", dropping field to prevent API 500`
    );
    delete normalized[key];
  }

  return normalized;
}

async function attemptProfileUpdate(
  url: string,
  payload: object,
  headers: Record<string, string>
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    // non-JSON body — keep data as null
  }

  return { ok: res.ok, status: res.status, data };
}

// 📌 Updates customer profile (PUT) – runs only once per install
export async function updateUserProfile(
  info: Record<string, any> = {},
  cohorts: Record<string, any> = {}
) {
  console.log('🧩 [SDK][Profile] updateUserProfile called');

  try {
    // 🔒 ONE-TIME GUARD
    const alreadyUpdated = await AsyncStorage.getItem(PROFILE_UPDATED_KEY);
    if (alreadyUpdated === 'true') {
      console.log(
        '⏭️ [SDK][Profile] Profile already updated – skipping API call'
      );
      return;
    }

    // Wait for OnUserLogin to complete before hitting the profile endpoint.
    // The server creates the profile record during /device/link; if we fire
    // too early the backend returns "profile not found" → 500.
    console.log('⏳ [SDK][Profile] Waiting for UserLoggedIn flag...');
    const loggedIn = await waitForUserLoggedIn(30_000);
    if (!loggedIn) {
      console.warn(
        '⚠️ [SDK][Profile] Timed out waiting for login – aborting profile update'
      );
      return;
    }
    console.log('✅ [SDK][Profile] User is logged in, proceeding');

    const channel_code = await AsyncStorage.getItem('mehery_channel_id');
    const user_id = await AsyncStorage.getItem('user_id');

    console.log('🏷️ [SDK][Profile] channel_code:', channel_code);
    console.log('👤 [SDK][Profile] user_id:', user_id);

    if (!channel_code) {
      console.warn('⚠️ [SDK][Profile] Aborting: channel_code is missing');
      return;
    }
    if (!user_id) {
      console.warn('⚠️ [SDK][Profile] Aborting: user_id is missing');
      return;
    }

    const normalizedAdditionalInfo = normalizeAdditionalInfoDates(
      info,
      'additionalInfo'
    );
    const normalizedCohorts = normalizeAdditionalInfoDates(cohorts, 'cohorts');

    const payload = {
      additionalInfo: normalizedAdditionalInfo,
      ...(Object.keys(normalizedCohorts).length
        ? { cohorts: normalizedCohorts }
        : {}),
    };

    console.log(
      '📡 [SDK][Profile] PUT /customer/profile payload:',
      JSON.stringify(payload, null, 2)
    );

    const baseUrl = await getApiBaseUrl();
    const url = `${baseUrl}/v1/customer/profile?code=${encodeURIComponent(user_id)}`;
    console.log('🌐 [SDK][Profile] Request URL:', url);

    const commonHeaders = await buildCommonHeaders();

    // Retry up to 3 times on 5xx — the profile record may still be
    // propagating shortly after device registration completes.
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [2_000, 5_000, 10_000];
    let lastStatus = 0;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`🔄 [SDK][Profile] Attempt ${attempt}/${MAX_RETRIES}`);
      const startTime = Date.now();

      const { ok, status, data } = await attemptProfileUpdate(
        url,
        payload,
        commonHeaders
      );
      lastStatus = status;

      console.log(
        `⏱️ [SDK][Profile] Response in ${Date.now() - startTime}ms — status ${status}`
      );
      console.log('📥 [SDK][Profile] Response body:', data);

      if (ok) {
        console.log('✅ [SDK][Profile] Profile updated successfully:', data);
        await AsyncStorage.setItem(PROFILE_UPDATED_KEY, 'true');
        console.log('🔒 [SDK][Profile] Profile update flag saved');
        return data;
      }

      // 4xx errors are data/auth problems — retrying won't help
      if (status >= 400 && status < 500) {
        console.error(
          `🚨 [SDK][Profile] Client error ${status}, not retrying`,
          data
        );
        throw new Error(`[SDK][Profile] HTTP ${status}`);
      }

      // 5xx — retry after a back-off delay
      if (attempt < MAX_RETRIES) {
        const wait = RETRY_DELAYS[attempt - 1] ?? 5_000;
        console.warn(
          `⚠️ [SDK][Profile] Server error ${status}, retrying in ${wait}ms...`
        );
        await delay(wait);
      }
    }

    throw new Error(
      `[SDK][Profile] HTTP ${lastStatus} after ${MAX_RETRIES} attempts`
    );
  } catch (err) {
    console.error('❌ [SDK][Profile] updateUserProfile failed', err);
    throw err;
  } finally {
    console.log('🏁 [SDK][Profile] updateUserProfile finished');
  }
}
