import { useState, useEffect, useRef, RefObject } from 'react';
import * as Phaser from 'phaser';
import { IRefPhaserGame } from '../PhaserGame';
import { EventBus } from '../game/EventBus';

export const usePhaserScale = (phaserRef: RefObject<IRefPhaserGame | null>) => {
  const [uiStyle, setUiStyle] = useState<React.CSSProperties>({
    position: 'absolute',
    pointerEvents: 'none',
    transformOrigin: 'top left',
    visibility: 'hidden', // hide until first real measurement
  });

  const rafRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const gameRef = useRef<Phaser.Game | undefined>(undefined);

  useEffect(() => {
    const scheduleUpdate = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateBounds);
    };

    const updateBounds = () => {
      const game = gameRef.current;
      const canvas = game?.canvas;
      if (!game || !canvas) return;

      const { width: dispWidth, height: dispHeight } = game.scale.displaySize;
      const { width: gameWidth, height: gameHeight } = game.scale.gameSize;
      if (!gameWidth || !gameHeight) return;

      const scaleX = dispWidth / gameWidth;
      const scaleY = dispHeight / gameHeight;
      const rect = canvas.getBoundingClientRect();

      setUiStyle({
        position: 'absolute',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${gameWidth}px`,
        height: `${gameHeight}px`,
        transform: `scale(${scaleX}, ${scaleY})`,
        transformOrigin: 'top left',
        pointerEvents: 'none',
        zIndex: 10,
        visibility: 'visible',
      });
    };

    const attachScaleListeners = (game: Phaser.Game) => {
      game.scale.on(Phaser.Scale.Events.RESIZE, scheduleUpdate);
      game.scale.on(Phaser.Scale.Events.ORIENTATION_CHANGE, scheduleUpdate);

      resizeObserverRef.current = new ResizeObserver(scheduleUpdate);
      const parent = game.canvas.parentElement;
      if (parent) resizeObserverRef.current.observe(parent);
    };

    // Fires once the game has booted AND a scene is actually running —
    // by this point game.scale is fully resolved, so this replaces polling.
    const onSceneReady = () => {
      const game = phaserRef.current?.game as Phaser.Game | undefined;
      if (!game || !game.canvas) return;

      // Only attach scale/resize listeners once, even if multiple scenes start
      if (gameRef.current !== game) {
        gameRef.current = game;
        attachScaleListeners(game);
      }

      updateBounds();
    };

    EventBus.on('current-scene-ready', onSceneReady);
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      EventBus.removeListener('current-scene-ready', onSceneReady);
      window.removeEventListener('resize', scheduleUpdate);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (gameRef.current) {
        gameRef.current.scale.off(Phaser.Scale.Events.RESIZE, scheduleUpdate);
        gameRef.current.scale.off(
          Phaser.Scale.Events.ORIENTATION_CHANGE,
          scheduleUpdate
        );
      }
      resizeObserverRef.current?.disconnect();
    };
  }, [phaserRef]);

  return uiStyle;
};

