import { useState } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import { useAnchoredMenu } from '../../hooks/useAnchoredMenu';
import styles from './ActionMenu.module.css';
import { Button } from '../!shared/Button/Button';

interface Props {
  onGoToCave: () => void;
  onSleep: () => void;
}

export const NecromancerActionMenu = ({ onGoToCave, onSleep }: Props) => {
  const [visible, setVisible] = useState(false);
  const containerRef = useAnchoredMenu('necromancer-ui-position');

  useEventBus('necromancer-selected', setVisible);

  if (!visible) return null;

  return (
    <div ref={containerRef} className={styles.actionMenu}>
      <Button onClick={onGoToCave}>To Cave</Button>
      <Button variant="ghost" onClick={onSleep}>
        Sleep
      </Button>
    </div>
  );
};

