import { useState } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import { useTranslation } from '../../hooks/useTranslation';
import { useAnchoredMenu } from '../../hooks/useAnchoredMenu';
import { isRaidActive, isGroupRaiding, getGroups } from '../../game/state/worldSim';
import styles from './ActionMenu.module.css';
import { Button } from '../1shared/Button/Button';

interface Props {
  onAttack: (villageId: string, groupId: number) => void;
  onLoot: (villageId: string, groupId: number) => void;
  onScout: (villageId: string, groupId: number) => void;
}

export const VillageActionMenu = ({ onAttack, onLoot, onScout }: Props) => {
  const [selected, setSelected] = useState<{ id: string } | null>(null);
  const [busy, setBusy] = useState<boolean>(isRaidActive);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const { t } = useTranslation();
  const containerRef = useAnchoredMenu('village-ui-position');

  useEventBus('village-selected', setSelected);
  useEventBus('rats-busy', setBusy);
  useEventBus('groups-changed', () => setSelectedGroupId(null));

  if (!selected) return null;

  const groups = getGroups();
  const availableGroups = groups.filter(
    (g) => !isGroupRaiding(g.id) && Object.values(g.creatures).some((c) => c && c > 0)
  );

  // Auto-select if only one group available.
  const activeGroupId = availableGroups.length === 1 ? availableGroups[0].id : selectedGroupId;

  const handleAction = (action: 'attack' | 'loot' | 'scout') => {
    if (activeGroupId === null) return;
    if (action === 'attack') onAttack(selected.id, activeGroupId);
    else if (action === 'loot') onLoot(selected.id, activeGroupId);
    else if (action === 'scout') onScout(selected.id, activeGroupId);
  };

  return (
    <div ref={containerRef} className={styles.actionMenu}>
      {availableGroups.length > 1 && (
        <div className={styles.groupPicker}>
          {availableGroups.map((g) => (
            <Button
              key={g.id}
              variant={activeGroupId === g.id ? 'primary' : 'ghost'}
              onClick={() => setSelectedGroupId(g.id)}
            >
              Group {g.id}
            </Button>
          ))}
        </div>
      )}
      <Button
        variant="danger"
        disabled={busy || activeGroupId === null}
        onClick={() => handleAction('attack')}
      >
        {t('village.attack')}
      </Button>
      <Button
        variant="green"
        disabled={busy || activeGroupId === null}
        onClick={() => handleAction('loot')}
      >
        {t('village.loot')}
      </Button>
      <Button
        variant="blue"
        disabled={busy || activeGroupId === null}
        onClick={() => handleAction('scout')}
      >
        {t('village.scout')}
      </Button>
    </div>
  );
};
