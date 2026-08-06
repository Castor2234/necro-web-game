// components/LootProgressBar.tsx
import { useEffect, useRef, useState } from 'react';
import { EventBus } from '../game/EventBus'; // adjust path to your EventBus

export function LootProgressBar() {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    const onStart = ({ duration }: { duration: number }) => {
      setVisible(true);
      setProgress(0);
      startRef.current = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startRef.current;
        const pct = Math.min((elapsed / duration) * 100, 100);
        setProgress(pct);

        if (pct < 100) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    const onFinish = () => {
      setVisible(false);
      cancelAnimationFrame(rafRef.current);
    };

    EventBus.on('village-loot-started', onStart);
    EventBus.on('village-loot-finished', onFinish);

    return () => {
      EventBus.off('village-loot-started', onStart);
      EventBus.off('village-loot-finished', onFinish);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 320,
        padding: 12,
        background: 'rgba(0, 0, 0, 0.75)',
        borderRadius: 8,
        border: '1px solid #ff4444',
        zIndex: 1000,
        pointerEvents: 'none', // let clicks pass through to canvas
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          color: '#ffcccc',
          fontSize: 14,
          fontWeight: 600,
          textAlign: 'center',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        Looting Village...
      </div>

      <div
        style={{
          width: '100%',
          height: 12,
          background: '#2a0a0a',
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #ff4444 0%, #ff8800 100%)',
            borderRadius: 6,
            transition: 'width 0.05s linear',
          }}
        />
      </div>
    </div>
  );
}

