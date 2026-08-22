import { EventBus } from '../EventBus';

export interface CanvasScale {
  scaleX: number;
  scaleY: number;
}

let currentScale: CanvasScale = { scaleX: 1, scaleY: 1 };

export function setCanvasScale(scale: CanvasScale): void {
  currentScale = scale;
  EventBus.emit('canvas-scale', scale);
}

export function getCanvasScale(): CanvasScale {
  return currentScale;
}
