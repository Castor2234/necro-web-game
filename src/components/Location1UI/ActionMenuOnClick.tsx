// components/VillageActionMenu.tsx
import { useRef, useState } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import styles from './ActionMenu.module.css';
import { Button } from '../Button/Button';

interface VillageSelection {
  id: string;
}

interface Props {
  onAttack: (villageId: string) => void;
  onLoot: (villageId: string) => void;
  onScout: (villageId: string) => void;
}

export function VillageActionMenu({ onAttack, onLoot, onScout }: Props) {
  const [selected, setSelected] = useState<VillageSelection | null>(null);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEventBus<VillageSelection | null>('village-selected', setSelected);
  useEventBus<boolean>('rats-busy', setBusy);

  const scaleRef = useRef({ scaleX: 1, scaleY: 1 });
  const posRef = useRef({ x: 0, y: 0 });

  const applyTransform = () => {
    const { x, y } = posRef.current;
    const { scaleX, scaleY } = scaleRef.current;
    if (containerRef.current) {
      containerRef.current.style.transform = `translate(${x}px, ${y}px) scale(${1 / scaleX}, ${1 / scaleY})`;
    }
  };

  useEventBus<{ x: number; y: number }>('village-ui-position', (pos) => {
    posRef.current = pos;
    applyTransform();
  });

  useEventBus<{ scaleX: number; scaleY: number }>('canvas-scale', (s) => {
    scaleRef.current = s;
    applyTransform();
  });

  if (!selected) return null;

  return (
    <div ref={containerRef} className={styles.actionMenu}>
      <Button
        variant="danger"
        disabled={busy}
        onClick={() => onAttack(selected.id)}
      >
        Attack
      </Button>
      <Button disabled={busy} onClick={() => onLoot(selected.id)}>
        Loot
      </Button>
      <Button disabled={busy} onClick={() => onScout(selected.id)}>
        Scout
      </Button>
    </div>
  );
}

