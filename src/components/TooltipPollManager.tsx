import tooltipEmitter from './TooltipEmitter';
import { sdkLog } from '../helpers/sdkLogger';

export function renderTooltipPoll(placeholderId: string, tooltipData: any) {
  sdkLog.log('🎯 renderTooltipPoll called with:', placeholderId, tooltipData);
  tooltipEmitter.emit('showTooltip', { placeholderId, tooltipData });
}
