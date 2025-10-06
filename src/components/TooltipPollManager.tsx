import tooltipEmitter from './TooltipEmitter';

export function renderTooltipPoll(placeholderId: string, tooltipData: any) {
  console.log('🎯 renderTooltipPoll called with:', placeholderId, tooltipData);
  tooltipEmitter.emit('showTooltip', { placeholderId, tooltipData });
}
