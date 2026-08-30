import { useState } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import { useTranslation } from '../../hooks/useTranslation';
import { useAnchoredMenu } from '../../hooks/useAnchoredMenu';
import styles from './ActionMenu.module.css';
import { Button } from '../!shared/Button/Button';

interface Props {
  onAttack: (villageId: string) => void;
  onLoot: (villageId: string) => void;
  onScout: (villageId: string) => void;
}

export const VillageActionMenu = ({ onAttack, onLoot, onScout }: Props) => {
  const [selected, setSelected] = useState<{ id: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const { t } = useTranslation();
  const containerRef = useAnchoredMenu('village-ui-position');

  useEventBus('village-selected', setSelected);
  useEventBus('rats-busy', setBusy);

  if (!selected) return null;

  return (
    <div ref={containerRef} className={styles.actionMenu}>
      <Button
        variant="danger"
        disabled={busy}
        onClick={() => onAttack(selected.id)}
      >
        {t('village.attack')}
      </Button>
      <Button disabled={busy} onClick={() => onLoot(selected.id)}>
        {t('village.loot')}
      </Button>
      <Button disabled={busy} onClick={() => onScout(selected.id)}>
        {t('village.scout')}
      </Button>
    </div>
  );
};

