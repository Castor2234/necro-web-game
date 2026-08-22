import { useRef, useState } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import styles from './ActionMenu.module.css';
import { Button } from '../Button/Button';
import { getCanvasScale } from '../../game/states/canvasScale';

interface Props {
  onGoToBase: () => void;
  onSleep: () => void;
}

export const NecromancerActionMenu = ({ onGoToBase, onSleep }: Props) => {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEventBus<boolean>('necromancer-selected', setVisible);

  const scaleRef = useRef(getCanvasScale());
  const posRef = useRef({ x: 0, y: 0 });

  const applyTransform = () => {
    const { x, y } = posRef.current;
    const { scaleX, scaleY } = scaleRef.current;
    if (containerRef.current) {
      containerRef.current.style.transform = `translate(${x}px, ${y}px) scale(${1 / scaleX}, ${1 / scaleY})`;
    }
  };

  useEventBus<{ x: number; y: number }>('necromancer-ui-position', (pos) => {
    posRef.current = pos;
    applyTransform();
  });

  useEventBus<{ scaleX: number; scaleY: number }>('canvas-scale', (s) => {
    scaleRef.current = s;
    applyTransform();
  });

  if (!visible) return null;

  return (
    <div ref={containerRef} className={styles.actionMenu}>
      <Button onClick={onGoToBase}>To Base</Button>
      <Button variant="ghost" onClick={onSleep}>
        Sleep
      </Button>
    </div>
  );
};
