import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildCommonHeaders } from '../../helpers/buildCommonHeaders';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const PROFILE_UPDATED_KEY = 'mehery_profile_updated';

// 📌 Updates customer profile (PUT) – runs only once
export async function updateUserProfile(
  additionalInfo: Record<string, any> = {}
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

    const payload = {
      additionalInfo,
    };

    console.log(
      '📡 [SDK][Profile] PUT /customer/profile payload:',
      JSON.stringify(payload, null, 2)
    );

    const url = `https://demo.pushapp.co.in/pushapp/api/v1/customer/profile?code=${user_id}`;
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
