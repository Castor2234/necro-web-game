import { useRef, useState } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import styles from '../Location1UI/ActionMenu.module.css'; // reuse existing menu styles
import { Button } from '../Button/Button';
import { getCanvasScale } from '../../game/states/canvasScale';

type BuildingType = 'tent' | 'workshop';

interface BuildingSelection {
  type: BuildingType;
}

interface Props {
  onGoTo: (type: BuildingType) => void;
  onUpgrade: (type: BuildingType) => void;
}

const BUILDING_LABELS: Record<BuildingType, string> = {
  tent: 'Tent',
  workshop: 'Workshop',
};

export const BuildingActionMenu = ({ onGoTo, onUpgrade }: Props) => {
  const [selected, setSelected] = useState<BuildingSelection | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEventBus<BuildingSelection | null>('building-selected', setSelected);

  const scaleRef = useRef(getCanvasScale());
  const posRef = useRef({ x: 0, y: 0 });

  const applyTransform = () => {
    const { x, y } = posRef.current;
    const { scaleX, scaleY } = scaleRef.current;
    if (containerRef.current) {
      containerRef.current.style.transform = `translate(${x}px, ${y}px) scale(${1 / scaleX}, ${1 / scaleY})`;
    }
  };

  useEventBus<{ x: number; y: number }>('building-ui-position', (pos) => {
    posRef.current = pos;
    applyTransform();
  });

  useEventBus<{ scaleX: number; scaleY: number }>('canvas-scale', (s) => {
    scaleRef.current = s;
    applyTransform();
  });

  if (!selected) return null;

  const label = BUILDING_LABELS[selected.type];

  return (
    <div ref={containerRef} className={styles.actionMenu}>
      <Button onClick={() => onGoTo(selected.type)}>To {label}</Button>
      <Button onClick={() => onUpgrade(selected.type)}>Upgrade {label}</Button>
    </div>
  );
};

