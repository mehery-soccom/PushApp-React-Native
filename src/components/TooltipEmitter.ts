// TooltipEmitter.ts
import { EventEmitter } from 'events';

const tooltipEmitter = global.__TOOLTIP_EMITTER__ || new EventEmitter();
global.__TOOLTIP_EMITTER__ = tooltipEmitter;

export default tooltipEmitter;
