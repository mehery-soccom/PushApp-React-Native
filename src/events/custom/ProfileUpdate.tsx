import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildCommonHeaders } from '../../helpers/buildCommonHeaders';
import { getApiBaseUrl } from '../../helpers/getApiBaseUrl';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const PROFILE_UPDATED_KEY = 'mehery_profile_updated';

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

    if (!channel_code || !user_id) {
      console.warn(
        '⚠️ [SDK][Profile] Aborting profile update: channel_code or user_id is missing'
      );
      return;
    }

    // ✅ EXTRACT STANDARD FIELDS & FORMAT DATES
    const { expiry_date, dob, gender, ...restInfo } = info;

    const formatToUTC = (val: any) => {
      if (!val) return undefined;
      const d = typeof val === 'number' ? new Date(val * 1000) : new Date(val);
      return isNaN(d.getTime()) ? val : d.toISOString();
    };

    const payload: Record<string, any> = {
      channel_id: channel_code,
      additionalInfo: restInfo,
      cohorts,
    };

    if (expiry_date) payload.expiry_date = formatToUTC(expiry_date);
    if (dob) payload.dob = formatToUTC(dob);
    if (gender) payload.gender = gender;

    console.log(
      '📡 [SDK][Profile] PUT /v1/customer/profile payload:',
      JSON.stringify(payload, null, 2)
    );

    const baseUrl = await getApiBaseUrl();
    console.log('code for profile:', user_id);
    const url = `${baseUrl}/v1/customer/profile?code=${user_id}`;
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
