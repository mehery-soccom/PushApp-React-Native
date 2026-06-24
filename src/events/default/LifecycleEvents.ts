import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendCustomEvent } from '../custom/CustomEvents';
import { SDK_EVENT_NAMES } from './eventNames';
import { ensureDeviceRegistered } from '../../utils/ensureDeviceRegistered';

export { SDK_EVENT_NAMES };

const APP_INSTALL_SENT_KEY = 'mehery_app_install_sent';

export async function trackAppInstallIfNeeded(): Promise<void> {
  const alreadySent = await AsyncStorage.getItem(APP_INSTALL_SENT_KEY);
  if (alreadySent) return;

  const success = await sendCustomEvent(
    SDK_EVENT_NAMES.APP_INSTALL,
    {},
    { eventType: 'LOG' }
  );
  if (success) {
    await AsyncStorage.setItem(APP_INSTALL_SENT_KEY, 'true');
  }
}

export async function OnAppLaunch(): Promise<void> {
  await sendCustomEvent(SDK_EVENT_NAMES.APP_LAUNCH, {}, { eventType: 'LOG' });
}

export async function trackDefaultLifecycleEvents(): Promise<void> {
  const registered = await ensureDeviceRegistered();
  if (!registered) {
    console.warn(
      '[SDK] Skipping app_install and app_launch until device registration succeeds.'
    );
    return;
  }

  await trackAppInstallIfNeeded();
  await OnAppLaunch();
}
