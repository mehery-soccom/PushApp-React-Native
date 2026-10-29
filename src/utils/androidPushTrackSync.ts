import { NativeModules, Platform } from 'react-native';
import { sdkLog } from '../helpers/sdkLogger';

type MeheryPushTrackNative = {
  setApiBaseUrl?: (url: string) => void;
  setContactId?: (contactId: string) => void;
  setUserId?: (userId: string) => void;
  setDeviceId?: (deviceId: string) => void;
  setProfileId?: (profileId: string) => void;
  setSessionId?: (sessionId: string) => void;
};

function getNative(): MeheryPushTrackNative | undefined {
  return NativeModules?.MeheryPushTrack as MeheryPushTrackNative | undefined;
}

/**
 * Persist contact_id for Android background notification track
 * (NotificationPushTrack reads SharedPreferences when JS is not running).
 */
export function syncAndroidPushTrackContactId(contactId: string): void {
  if (Platform.OS !== 'android') return;
  const MeheryPushTrack = getNative();
  if (!MeheryPushTrack?.setContactId) {
    sdkLog.warn(
      '[PushTrack] MeheryPushTrack.setContactId unavailable — background CTA track will omit contact_id'
    );
    return;
  }
  try {
    MeheryPushTrack.setContactId(contactId.trim());
  } catch {
    /* non-blocking */
  }
}

/** Cache identity so native track can synthesize contact_id and attach p_id / session_id. */
export function syncAndroidPushTrackIdentity(parts: {
  contactId?: string;
  userId?: string;
  deviceId?: string;
  p_id?: string;
  session_id?: string;
}): void {
  if (Platform.OS !== 'android') return;
  const MeheryPushTrack = getNative();
  if (!MeheryPushTrack) return;
  try {
    if (parts.contactId != null && MeheryPushTrack.setContactId) {
      MeheryPushTrack.setContactId(parts.contactId.trim());
    }
    if (parts.userId != null && MeheryPushTrack.setUserId) {
      MeheryPushTrack.setUserId(parts.userId.trim());
    }
    if (parts.deviceId != null && MeheryPushTrack.setDeviceId) {
      MeheryPushTrack.setDeviceId(parts.deviceId.trim());
    }
    if (parts.p_id != null && MeheryPushTrack.setProfileId) {
      MeheryPushTrack.setProfileId(parts.p_id.trim());
    }
    if (parts.session_id != null && MeheryPushTrack.setSessionId) {
      MeheryPushTrack.setSessionId(parts.session_id.trim());
    }
  } catch {
    /* non-blocking */
  }
}
