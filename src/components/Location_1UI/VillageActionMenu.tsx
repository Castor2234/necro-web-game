import { useState } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import { useTranslation } from '../../hooks/useTranslation';
import { useAnchoredMenu } from '../../hooks/useAnchoredMenu';
import { isRaidActive } from '../../game/state/worldSim';
import styles from './ActionMenu.module.css';
import { Button } from '../1shared/Button/Button';

interface Props {
  onAttack: (villageId: string) => void;
  onLoot: (villageId: string) => void;
  onScout: (villageId: string) => void;
}

export const VillageActionMenu = ({ onAttack, onLoot, onScout }: Props) => {
  const [selected, setSelected] = useState<{ id: string } | null>(null);
  // Pull the initial busy state from WorldSim: a raid started in another scene
  // must still lock the buttons when this UI mounts.
  const [busy, setBusy] = useState<boolean>(isRaidActive);
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
      <Button
        variant="green"
        disabled={busy}
        onClick={() => onLoot(selected.id)}
      >
        {t('village.loot')}
      </Button>
      <Button
        variant="blue"
        disabled={busy}
        onClick={() => onScout(selected.id)}
      >
        {t('village.scout')}
      </Button>
    </div>
  );
};
