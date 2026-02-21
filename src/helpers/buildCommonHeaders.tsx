import { Dimensions, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDeviceMetadata } from '../utils/deviceMetadata';

export async function buildCommonHeaders() {
  const { width, height } = Dimensions.get('window');

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';

  const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en';

  let deviceId = '';
  try {
    deviceId = (await AsyncStorage.getItem('device_id')) ?? '';
  } catch {
    deviceId = '';
  }

  const orientation = width > height ? 'Landscape' : 'Portrait';

  // 🔹 Base SDK headers (always present)
  const baseHeaders: Record<string, string> = {
    'X-App-Version': '1.0.33',
    'X-SDK-Version': '0.0.10',

    'X-Screen-Resolution': `${Math.round(width)}x${Math.round(height)}`,
    'X-Device-Orientation': orientation,

    'X-OS-Name': Platform.OS.toUpperCase(),
    'X-OS-Version': String(Platform.Version),

    'X-Timezone': timezone,
    'X-Locale': locale,

    'X-Device-ID': deviceId,

    // Defaults for parity with Flutter
    'X-Bundle-ID': 'com.meheryeventsender',
    'X-Device-Model': 'unknown',
    'X-System-Name': 'unknown',
    'X-Device-Name': 'unknown',
    'X-Manufacturer': 'unknown',
    'X-API-Level': 'unknown',
    'X-CPU-ABI': 'unknown',
    'X-Boot-Time': 'unknown',
  };

  // 🔹 App-provided overrides (safe, optional)
  const deviceMetadata = getDeviceMetadata?.() ?? {};

  return {
    ...baseHeaders,
    ...deviceMetadata, // ✅ app overrides "unknown" fields
  };
}
