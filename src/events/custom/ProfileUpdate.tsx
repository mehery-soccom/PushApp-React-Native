import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildCommonHeaders } from '../../helpers/buildCommonHeaders';
import { getApiBaseUrl } from '../../helpers/tenantContext';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const PROFILE_UPDATED_KEY = 'mehery_profile_updated';
const DATE_FIELD_KEY_REGEX = /(dob|date|birth|expiry|expires|expir)/i;
const DATE_ONLY_FIELD_KEY_REGEX = /(dob|birth)/i;

function toUtcTimestampMs(value: unknown): number | null {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    // Treat 10-digit unix values as seconds and convert to ms.
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

function formatUtcDateOnly(value: Date): string {
  return value.toISOString().split('T')[0] ?? '';
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
      normalized[key] = DATE_ONLY_FIELD_KEY_REGEX.test(key)
        ? formatUtcDateOnly(parsedDate)
        : parsedDate.toISOString();
      continue;
    }

    console.warn(
      `⚠️ [SDK][Profile] Invalid date in "${sourceName}.${key}", dropping field to prevent API 500`
    );
    delete normalized[key];
  }

  return normalized;
}

// 📌 Updates customer profile (PUT) – runs only once
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

    console.log('⏳ [SDK][Profile] Waiting 5 seconds before API call...');
    await delay(5000);
    console.log('🚀 [SDK][Profile] Delay complete, proceeding with API call');

    console.log('📦 [SDK][Profile] Fetching identifiers from AsyncStorage...');

    const channel_code = await AsyncStorage.getItem('mehery_channel_id');
    const user_id = await AsyncStorage.getItem('user_id');

    console.log('🏷️ [SDK][Profile] channel_code:', channel_code);
    console.log('👤 [SDK][Profile] user_id:', user_id);

    if (!channel_code) {
      console.warn(
        '⚠️ [SDK][Profile] Aborting profile update: channel_code is missing'
      );
      return;
    }

    if (!user_id) {
      console.warn(
        '⚠️ [SDK][Profile] Aborting profile update: user_id is missing'
      );
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
    const url = `${baseUrl}/v1/customer/profile?code=${encodeURIComponent(
      user_id
    )}`;
    console.log('🌐 [SDK][Profile] Request URL:', url);

    // ✅ BUILD COMMON HEADERS (SAFE, JS-ONLY)
    const commonHeaders = await buildCommonHeaders();

    console.log('🧾 [SDK][Profile] Request headers:', {
      'Content-Type': 'application/json',
      ...commonHeaders,
    });

    const startTime = Date.now();

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...commonHeaders,
      },
      body: JSON.stringify(payload),
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️ [SDK][Profile] Response received in ${duration}ms`);

    const rawText = await res.text();
    console.log('📥 [SDK][Profile] Raw response body:', rawText);

    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch (parseErr) {
      console.error(
        '❌ [SDK][Profile] Failed to parse JSON response',
        parseErr
      );
    }

    if (!res.ok) {
      console.error('🚨 [SDK][Profile] Non-2xx response', {
        status: res.status,
        body: data,
      });
      throw new Error(`[SDK][Profile] HTTP ${res.status}`);
    }

    console.log('✅ [SDK][Profile] Profile updated successfully:', data);

    // 🔐 MARK AS DONE (ONLY AFTER SUCCESS)
    await AsyncStorage.setItem(PROFILE_UPDATED_KEY, 'true');
    console.log('🔒 [SDK][Profile] Profile update flag saved');

    return data;
  } catch (err) {
    console.error('❌ [SDK][Profile] updateUserProfile failed', err);
    throw err;
  } finally {
    console.log('🏁 [SDK][Profile] updateUserProfile finished');
  }
}
