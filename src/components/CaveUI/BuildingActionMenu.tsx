import { useState } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import { useAnchoredMenu } from '../../hooks/useAnchoredMenu';
import type { BuildingType } from '../../game/events';
import styles from '../Location1UI/ActionMenu.module.css'; // reuse existing menu styles
import { Button } from '../!shared/Button/Button';

interface Props {
  onGoTo: (type: BuildingType) => void;
  onUpgrade: (type: BuildingType) => void;
}

const BUILDING_LABELS: Record<BuildingType, string> = {
  tent: 'Tent',
  workshop: 'Workshop',
};

export const BuildingActionMenu = ({ onGoTo, onUpgrade }: Props) => {
  const [selected, setSelected] = useState<{ type: BuildingType } | null>(null);
  const containerRef = useAnchoredMenu('building-ui-position');

  useEventBus('building-selected', setSelected);

  if (!selected) return null;

  const label = BUILDING_LABELS[selected.type];

  return (
    <div ref={containerRef} className={styles.actionMenu}>
      <Button onClick={() => onGoTo(selected.type)}>To {label}</Button>
      <Button onClick={() => onUpgrade(selected.type)}>Upgrade {label}</Button>
    </div>
  );
};

