import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import * as Phaser from 'phaser';
import { IRefPhaserGame } from '../PhaserGame';
import { useEventBus } from './useEventBus';
import { setCanvasScale } from '../game/state/secondary/canvasScale';

export const usePhaserScale = (phaserRef: RefObject<IRefPhaserGame | null>) => {
  const [uiStyle, setUiStyle] = useState<React.CSSProperties>({
    position: 'absolute',
    pointerEvents: 'none',
    transformOrigin: 'top left',
    zIndex: 10,
    visibility: 'hidden',
  });

  const rafRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const gameRef = useRef<Phaser.Game | undefined>(undefined);
  const detachScaleListenersRef = useRef<(() => void) | null>(null);

  const updateBounds = useCallback(() => {
    const game = gameRef.current;
    const canvas = game?.canvas;
    if (!game || !canvas) return;

    const { width: dispWidth, height: dispHeight } = game.scale.displaySize;
    const { width: gameWidth, height: gameHeight } = game.scale.gameSize;
    if (!gameWidth || !gameHeight) return;

    const scaleX = dispWidth / gameWidth;
    const scaleY = dispHeight / gameHeight;
    const rect = canvas.getBoundingClientRect();
    // The overlay is absolutely positioned inside #app, so compute the canvas
    // offset relative to #app (not the viewport) — otherwise the overlay
    // misaligns when #app is shifted by page centering (viewports taller
    // than 16:9).
    const appRect =
      canvas.closest('#app')?.getBoundingClientRect() ?? new DOMRect();

    setCanvasScale({ scaleX, scaleY });

    setUiStyle({
      position: 'absolute',
      left: `${rect.left - appRect.left}px`,
      top: `${rect.top - appRect.top}px`,
      width: `${gameWidth}px`,
      height: `${gameHeight}px`,
      transform: `scale(${scaleX}, ${scaleY})`,
      transformOrigin: 'top left',
      pointerEvents: 'none',
      zIndex: 10,
      visibility: 'visible',
    });
  }, []);

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateBounds);
  }, [updateBounds]);

  const attachScaleListeners = useCallback(
    (game: Phaser.Game) => {
      game.scale.on(Phaser.Scale.Events.RESIZE, scheduleUpdate);
      game.scale.on(Phaser.Scale.Events.ORIENTATION_CHANGE, scheduleUpdate);

      const observer = new ResizeObserver(scheduleUpdate);
      const parent = game.canvas.parentElement;
      if (parent) observer.observe(parent);
      resizeObserverRef.current = observer;

      // Store a single detach fn so cleanup doesn't need to know internals
      detachScaleListenersRef.current = () => {
        game.scale.off(Phaser.Scale.Events.RESIZE, scheduleUpdate);
        game.scale.off(Phaser.Scale.Events.ORIENTATION_CHANGE, scheduleUpdate);
        observer.disconnect();
      };
    },
    [scheduleUpdate]
  );

  // EventBus subscription — useEventBus owns subscribe/unsubscribe entirely
  useEventBus('current-scene-ready', () => {
    const game = phaserRef.current?.game as Phaser.Game | undefined;
    if (!game || !game.canvas) return;

    if (gameRef.current !== game) {
      gameRef.current = game;
      attachScaleListeners(game);
    }
    updateBounds();
  });

  // window resize + final cleanup of Phaser-side listeners (not EventBus)
  useEffect(() => {
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.removeEventListener('resize', scheduleUpdate);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      detachScaleListenersRef.current?.();
    };
  }, [scheduleUpdate]);

  return uiStyle;
};

