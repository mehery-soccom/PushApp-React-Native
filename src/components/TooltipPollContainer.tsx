import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TooltipPoll from './TooltipPoll';
import { sendCustomEvent } from '../events/custom/CustomEvents';
import tooltipEmitter from './TooltipEmitter';

// ✅ External API to trigger tooltip
export function renderTooltipPoll(placeholderId: string, tooltipData: any) {
  tooltipEmitter.emit('showTooltip', { placeholderId, tooltipData });
}

export function TooltipPollContainer({
  placeholderId,
  children,
}: {
  placeholderId: string;
  children: React.ReactNode;
}) {
  const [tooltipData, setTooltipData] = useState<any>(null);

  // 🔹 Restore tooltip from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('persistedTooltip');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Show only if it belongs to this placeholder and is not expired
          if (
            parsed.placeholderId === placeholderId &&
            Date.now() - parsed.timestamp < 2000 * 60 * 1 // 1 minute
          ) {
            console.log(
              `[SDK] Restoring persisted tooltip for ${placeholderId}`
            );
            setTooltipData(parsed.tooltipData);
          } else {
            await AsyncStorage.removeItem('persistedTooltip');
            setTooltipData(null);
          }
        }
      } catch (e) {
        console.log('[SDK] Error restoring tooltip:', e);
      }
    })();
  }, [placeholderId]);

  // 🔹 Listen for tooltip show events
  useEffect(() => {
    const handler = async ({ placeholderId: id, tooltipData: data }: any) => {
      if (id !== placeholderId) return;

      if (data) {
        console.log(`[SDK] Tooltip matches ${placeholderId}, showing it`);
        setTooltipData(data);

        try {
          await AsyncStorage.setItem(
            'persistedTooltip',
            JSON.stringify({
              placeholderId,
              tooltipData: data,
              timestamp: Date.now(),
            })
          );
        } catch (err) {
          console.warn('[SDK] Failed to persist tooltip', err);
        }
      } else {
        console.log(
          `[SDK] No tooltip for ${placeholderId}, removing stored tooltip`
        );
        setTooltipData(null);
        await AsyncStorage.removeItem('persistedTooltip');
      }
    };

    tooltipEmitter.on('showTooltip', handler);
    return () => {
      tooltipEmitter.off('showTooltip', handler);
    };
  }, [placeholderId]);

  // 🔹 Dismiss handler
  const handleTooltipDismiss = async () => {
    if (!tooltipData) return;
    setTooltipData(null);
    try {
      await AsyncStorage.removeItem('persistedTooltip');
    } catch (err) {
      console.warn('[SDK] Failed to remove persisted tooltip', err);
    }
    sendCustomEvent('widget_open', { compare: placeholderId });
  };

  return (
    <View pointerEvents="box-none">
      {children}
      {tooltipData && (
        <TooltipPoll {...tooltipData} onClose={handleTooltipDismiss} />
      )}
    </View>
  );
}
