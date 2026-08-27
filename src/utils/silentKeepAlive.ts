import { buildCommonHeaders } from '../helpers/buildCommonHeaders';
import { sdkLog } from '../helpers/sdkLogger';
import { getHttpHostBaseUrl } from '../helpers/tenantContext';
import { getDeviceId } from './device';
import { silentKeepAliveDedupeKey } from './silentKeepAliveType';

export { isSilentKeepAlive } from './silentKeepAliveType';

const recentReplyKeys = new Set<string>();
const RECENT_REPLY_LIMIT = 50;

/** POST /pushapp/silent/ping so the server can update last_active (pong). */
export async function replySilentKeepAlive(payload?: unknown): Promise<void> {
  const key = silentKeepAliveDedupeKey(payload);
  if (key) {
    if (recentReplyKeys.has(key)) {
      sdkLog.log('⏭️ Silent keep-alive already replied:', key);
      return;
    }
    recentReplyKeys.add(key);
    if (recentReplyKeys.size > RECENT_REPLY_LIMIT) {
      const oldest = recentReplyKeys.values().next().value as
        | string
        | undefined;
      if (oldest) recentReplyKeys.delete(oldest);
    }
  }

  try {
    const device_id = await getDeviceId();
    if (!device_id) {
      sdkLog.warn('⚠️ Silent keep-alive skipped: missing device_id');
      return;
    }

    const host = await getHttpHostBaseUrl();
    const commonHeaders = await buildCommonHeaders();
    const url = `${host}/pushapp/silent/ping`;
    sdkLog.log('📡 Silent keep-alive pong:', { url, device_id });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...commonHeaders,
      },
      body: JSON.stringify({ device_id }),
    });

    if (!res.ok) {
      sdkLog.warn('⚠️ Silent keep-alive HTTP', res.status);
      return;
    }
    sdkLog.log('✅ Silent keep-alive pong sent');
  } catch (err) {
    sdkLog.error('❌ Silent keep-alive failed:', err);
  }
}
