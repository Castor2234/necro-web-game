// hooks/useAnchoredMenu.ts
import { useCallback, useRef } from 'react';
import { useEventBus } from './useEventBus';
import { getCanvasScale } from '../game/state/helpers/canvasScale';

/** Events whose payload is a screen-space { x, y } anchor pushed by a scene. */
export type UiPositionEvent =
  'building-ui-position' | 'village-ui-position' | 'necromancer-ui-position';

/**
 * Attaches a floating action menu to a world-space anchor.
 *
 * The owning scene emits `positionEvent` with screen-space coordinates —
 * typically every frame from update(), so the menu tracks camera pan/zoom.
 * The menu is counter-scaled by the inverse of the canvas scale, so it renders
 * at a constant pixel size regardless of canvas scaling.
 *
 * Returns a ref to attach to the menu's root <div>.
 */
export function useAnchoredMenu(positionEvent: UiPositionEvent) {
  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(getCanvasScale());

  const applyTransform = useCallback(() => {
    const { x, y } = posRef.current;
    const { scaleX, scaleY } = scaleRef.current;
    if (containerRef.current) {
      containerRef.current.style.transform = `translate(${x}px, ${y}px) scale(${
        1 / scaleX
      }, ${1 / scaleY})`;
    }
  }, []);

  useEventBus(positionEvent, (pos) => {
    posRef.current = pos;
    applyTransform();
  });

  useEventBus('canvas-scale', (scale) => {
    scaleRef.current = scale;
    applyTransform();
  });

  return containerRef;
}
