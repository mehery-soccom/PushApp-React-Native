import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
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

  // 🔹 Listen for tooltip show events
  useEffect(() => {
    const handler = ({ placeholderId: id, tooltipData: data }: any) => {
      if (id !== placeholderId) return;

      if (data) {
        console.log(`[SDK] Tooltip matches ${placeholderId}, showing it`);
        setTooltipData(data);
      } else {
        console.log(`[SDK] No tooltip for ${placeholderId}, hiding tooltip`);
        setTooltipData(null);
      }
    };

    tooltipEmitter.on('showTooltip', handler);
    return () => {
      tooltipEmitter.off('showTooltip', handler);
    };
  }, [placeholderId]);

  // 🔹 Dismiss handler
  const handleTooltipDismiss = () => {
    if (!tooltipData) return;
    setTooltipData(null);
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
