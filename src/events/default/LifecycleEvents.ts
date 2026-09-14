import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { sendCustomEvent, schedulePollCheck } from '../custom/CustomEvents';
import { SDK_EVENT_NAMES } from './eventNames';
import { ensureDeviceRegistered } from '../../utils/ensureDeviceRegistered';
import { sdkLog } from '../../helpers/sdkLogger';
import {
  buildEventReferrer,
  extractPIdFromPayload,
  rememberAppEnterForDedupe,
  shouldDedupeAppEnter,
  type AppEnterSourceType,
} from '../../utils/appEnterReferrer';

export { SDK_EVENT_NAMES };

const APP_INSTALL_SENT_KEY = 'mehery_app_install_sent';
const APP_INSTALL_VERSION_KEY = 'mehery_app_install_version';

export type TrackAppEnterOptions = {
  sourceType: AppEnterSourceType;
  /** Merged push / FCM data (optional for LINK-only). */
  payload?: Record<string, unknown> | null;
  /** Deep link or notification_url. */
  url?: string | null;
};

export async function trackAppInstallIfNeeded(): Promise<void> {
  const currentVersion = DeviceInfo.getVersion() || 'unknown';
  const storedVersion = await AsyncStorage.getItem(APP_INSTALL_VERSION_KEY);

  if (storedVersion === currentVersion) {
    return;
  }

  // Legacy: boolean flag from older SDK — seed version without re-sending.
  if (!storedVersion) {
    const legacySent = await AsyncStorage.getItem(APP_INSTALL_SENT_KEY);
    if (legacySent === 'true') {
      await AsyncStorage.setItem(APP_INSTALL_VERSION_KEY, currentVersion);
      await AsyncStorage.removeItem(APP_INSTALL_SENT_KEY);
      return;
    }
  }

  const isUpdate = Boolean(storedVersion);
  const attributes: Record<string, string | boolean> = {
    app_version: currentVersion,
    update: isUpdate,
  };
  if (storedVersion) {
    attributes.previous_version = storedVersion;
  }

  const success = await sendCustomEvent(
    SDK_EVENT_NAMES.APP_INSTALL,
    attributes,
    { eventType: 'LOG' }
  );
  if (success) {
    await AsyncStorage.setItem(APP_INSTALL_VERSION_KEY, currentVersion);
    await AsyncStorage.removeItem(APP_INSTALL_SENT_KEY);
  }
}

export async function OnAppLaunch(): Promise<void> {
  await sendCustomEvent(SDK_EVENT_NAMES.APP_LAUNCH, {}, { eventType: 'LOG' });
}

/**
 * Attributed app open from push or deep/universal link only.
 * Does not fire on organic icon taps / OnAppOpen.
 */
export async function trackAppEnter(
  options: TrackAppEnterOptions
): Promise<boolean> {
  const channelId =
    (await AsyncStorage.getItem('mehery_channel_id'))?.trim() ?? '';
  const url = typeof options.url === 'string' ? options.url.trim() : '';
  const referrer = buildEventReferrer({
    sourceType: options.sourceType,
    channelId,
    payload: options.payload,
    url: url || null,
  });

  if (
    shouldDedupeAppEnter({
      messageId: referrer.messageId,
      url: url || null,
      sourceType: options.sourceType,
    })
  ) {
    sdkLog.log('⏭️ [SDK] Skipping duplicate app_enter');
    return false;
  }

  rememberAppEnterForDedupe({
    messageId: referrer.messageId,
    url: url || null,
  });

  const payloadPId = extractPIdFromPayload(options.payload);
  const success = await sendCustomEvent(
    SDK_EVENT_NAMES.APP_ENTER,
    { event_referrer: referrer },
    {
      eventType: 'LOG',
      ...(payloadPId ? { p_id: payloadPId } : {}),
    }
  );

  if (success) {
    sdkLog.log('✅ [SDK] app_enter sent', JSON.stringify(referrer));
  }
  return success;
}

export async function trackDefaultLifecycleEvents(): Promise<void> {
  const registered = await ensureDeviceRegistered();
  if (!registered) {
    sdkLog.warn(
      '[SDK] Skipping app_install and app_launch until device registration succeeds.'
    );
    return;
  }

  await trackAppInstallIfNeeded();
  await OnAppLaunch();
  schedulePollCheck('lifecycle');
}
