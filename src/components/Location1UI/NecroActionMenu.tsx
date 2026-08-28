import { useState } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import { useTranslation } from '../../hooks/useTranslation';
import { useAnchoredMenu } from '../../hooks/useAnchoredMenu';
import styles from './ActionMenu.module.css';
import { Button } from '../!shared/Button/Button';

interface Props {
  onGoToCave: () => void;
  onSleep: () => void;
}

export const NecromancerActionMenu = ({ onGoToCave, onSleep }: Props) => {
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();
  const containerRef = useAnchoredMenu('necromancer-ui-position');

  useEventBus('necromancer-selected', setVisible);

  if (!visible) return null;

  return (
    <div ref={containerRef} className={styles.actionMenu}>
      <Button onClick={onGoToCave}>{t('necro.toCave')}</Button>
      <Button variant="ghost" onClick={onSleep}>
        {t('necro.sleep')}
      </Button>
    </div>
  );
};

