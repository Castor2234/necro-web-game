import { useState, useEffect, RefObject } from 'react';
import * as Phaser from 'phaser';
import { IRefPhaserGame } from '../PhaserGame';

export const usePhaserScale = (phaserRef: RefObject<IRefPhaserGame | null>) => {
    const [uiStyle, setUiStyle] = useState<React.CSSProperties>({
        position: 'absolute',
        pointerEvents: 'none', // Allows clicks to pass through to canvas if needed
        transformOrigin: 'top left',
    });

    useEffect(() => {
        if (!phaserRef.current) return;

        const gameInstance: Phaser.Game = phaserRef.current?.game as Phaser.Game 

        const updateBounds = () => {

            const canvas = phaserRef.current?.game?.canvas;
            if (!canvas) return;

            // Get Phaser's internal scale manager size data
            const { width: dispWidth, height: dispHeight } = gameInstance.scale.displaySize;
            const { width: gameWidth, height: gameHeight } = gameInstance.scale.gameSize;

            // Calculate the scaling factor between the virtual game logic coordinates and the actual CSS pixels
            const scaleX = dispWidth / gameWidth;
            const scaleY = dispHeight / gameHeight;

            // Find where the canvas sits inside its parent container
            const rect = canvas.getBoundingClientRect();

            setUiStyle({
                position: 'absolute',
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${gameWidth}px`,
                height: `${gameHeight}px`,
                // Scale the React elements to exactly match the canvas stretching/scaling
                transform: `scale(${scaleX}, ${scaleY})`,
                transformOrigin: 'top left',
                pointerEvents: 'none',
            });
        };

        // Run initially when game instances becomes active
        updateBounds();

        // Bind directly to Phaser's scale manager event loop
        gameInstance.scale.on('resize', updateBounds);

        // Standard window resize backup
        window.addEventListener('resize', updateBounds);

        return () => {
            gameInstance.scale.off('resize', updateBounds);
            window.removeEventListener('resize', updateBounds);
        };
    }, [phaserRef]);

    return uiStyle;
};
