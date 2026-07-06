import React, { useEffect, useState, useCallback } from 'react';
import { View, Linking } from 'react-native';
import TooltipPoll from './TooltipPoll';
import tooltipEmitter from './TooltipEmitter';
import { sdkLog } from '../helpers/sdkLogger';
import { buildCommonHeaders } from '../helpers/buildCommonHeaders';
import { getApiBaseUrl } from '../helpers/tenantContext';

// ✅ External API to trigger tooltip
export function renderTooltipPoll(placeholderId: string, tooltipData: any) {
  tooltipEmitter.emit('showTooltip', { placeholderId, tooltipData });
}

function normalizeUrl(rawUrl?: string) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const value = rawUrl.trim().replace(/^['"]|['"]$/g, '');
  if (!value) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^www\./i.test(value)) return `https://${value}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) return `https://${value}`;
  return '';
}

export function TooltipPollContainer({
  placeholderId,
  children,
}: {
  placeholderId: string;
  children: React.ReactNode;
}) {
  const [tooltipData, setTooltipData] = useState<any>(null);

  const sendTrackEvent = useCallback(
    async (
      eventType: 'cta' | 'dismissed' | 'longPress' | 'openUrl' | 'unknown',
      ctaId?: string
    ) => {
      if (!tooltipData) return;

      const payload = {
        messageId: tooltipData.messageId,
        filterId: tooltipData.filterId,
        ...(tooltipData.journiId ? { journiId: tooltipData.journiId } : {}),
        event: eventType,
        data: ctaId ? { ctaId } : {},
      };

      sdkLog.log('📤 Sending track event:', payload);
      const commonHeaders = await buildCommonHeaders();
      const apiBaseUrl = await getApiBaseUrl();

      try {
        const res = await fetch(`${apiBaseUrl}/v1/notification/in-app/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...commonHeaders,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        sdkLog.log('✅ Track API response:', data);
      } catch (error) {
        sdkLog.error('❌ Track API error:', error);
      }
    },
    [tooltipData]
  );

  const handleTooltipPress = useCallback(async () => {
    const url = normalizeUrl(tooltipData?.notificationUrl || '');
    if (!url) return;

    await sendTrackEvent('cta', 'MEDIA_CLICK');
    await sendTrackEvent('openUrl', url);
    Linking.openURL(encodeURI(url)).catch((err) =>
      sdkLog.error('Failed to open URL:', err)
    );
  }, [tooltipData, sendTrackEvent]);

  // 🔹 Listen for tooltip show events
  useEffect(() => {
    const handler = ({ placeholderId: id, tooltipData: data }: any) => {
      if (id !== placeholderId) return;

      if (data) {
        sdkLog.log(`[SDK] Tooltip matches ${placeholderId}, showing it`);
        setTooltipData(data);
      } else {
        sdkLog.log(`[SDK] No tooltip for ${placeholderId}, hiding tooltip`);
        setTooltipData(null);
      }
    };

    tooltipEmitter.on('showTooltip', handler);
    return () => {
      tooltipEmitter.off('showTooltip', handler);
    };
  }, [placeholderId]);

  return (
    <View pointerEvents="box-none">
      {children}
      {tooltipData && (
        <TooltipPoll
          {...tooltipData}
          onPress={
            tooltipData.notificationUrl ? handleTooltipPress : undefined
          }
        />
      )}
    </View>
  );
}
