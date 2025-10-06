import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import TooltipPoll from './TooltipPoll';
import { sendCustomEvent } from '../events/custom/CustomEvents';
import { EventEmitter } from 'events';

import tooltipEmitter from './TooltipEmitter';

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

  useEffect(() => {
    const handler = ({ placeholderId: id, tooltipData }: any) => {
      console.log(`[SDK] Event received for ${id}`);
      if (id === placeholderId) {
        console.log(`[SDK] Tooltip matches ${placeholderId}, showing it`);
        setTooltipData(tooltipData);
      }
    };

    tooltipEmitter.on('showTooltip', handler);
    return () => tooltipEmitter.off('showTooltip', handler);
  }, [placeholderId]);

  const handlePress = () => {
    console.log(`[SDK] Tooltip clicked for: ${placeholderId}`);
    sendCustomEvent('widget_open', { compare: placeholderId });
    if (tooltipData) setTooltipData(null);
  };

  return (
    <View
      pointerEvents="box-none" // important
      onTouchStart={() => {
        console.log(`[SDK] Tooltip container pressed for: ${placeholderId}`);
        sendCustomEvent('widget_open', { compare: placeholderId });
      }}
    >
      {children}
      {tooltipData && (
        <>
          {console.log('[SDK] TooltipPoll rendered:', tooltipData)}
          <TooltipPoll {...tooltipData} />
        </>
      )}
    </View>
  );
}
