import { useEffect, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import type { TranslationKey } from '../../game/i18n';
import { useEventBus } from '../../hooks/useEventBus';
import {
  getGroups,
  getMaxGroups,
  getMaxUnitsPerGroup,
  createGroup,
  deleteGroup,
  assignCreature,
  unassignCreature,
  isGroupRaiding,
  getCreatureStatsSnapshot,
} from '../../game/state/worldSim';
import { type AllCreatureStats, type CreatureType } from '../../game/state/secondary/creatures';
import { formatNumber } from '../../game/helpers/format';
import { Button } from '../1shared/Button/Button';
import styles from './GroupManagementWindow.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

const CREATURE_TYPES: CreatureType[] = ['zombieRats', 'ghouls'];

const CREATURE_LABEL_KEYS: Record<CreatureType, string> = {
  zombieRats: 'stats.rats',
  ghouls: 'stats.ghouls',
};

export const GroupManagementWindow = ({ open, onClose }: Props) => {
  const { t } = useTranslation();
  const [groups, setGroups] = useState(getGroups);
  const [maxGroups, setMaxGroups] = useState(getMaxGroups);
  const [maxUnits, setMaxUnits] = useState(getMaxUnitsPerGroup);
  const [creatureStats, setCreatureStats] = useState<AllCreatureStats | null>(() =>
    getCreatureStatsSnapshot()
  );

  useEventBus('groups-changed', () => {
    setGroups(getGroups());
    setMaxGroups(getMaxGroups());
    setMaxUnits(getMaxUnitsPerGroup());
  });
  useEventBus('creature-stats-changed', () => {
    setCreatureStats(getCreatureStatsSnapshot());
  });
  useEventBus('upgrades-updated', () => {
    setMaxGroups(getMaxGroups());
    setMaxUnits(getMaxUnitsPerGroup());
  });

  // Re-read all state whenever the window opens — the registry may have
  // changed (conversions, combat, raids) while the window was closed.
  useEffect(() => {
    if (!open) return;
    setGroups(getGroups());
    setMaxGroups(getMaxGroups());
    setMaxUnits(getMaxUnitsPerGroup());
    setCreatureStats(getCreatureStatsSnapshot());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleCreateGroup = () => {
    createGroup();
  };

  const handleDeleteGroup = (groupId: number) => {
    deleteGroup(groupId);
  };

  const handleAssign = (groupId: number, type: CreatureType) => {
    assignCreature(groupId, type, 1);
  };

  const handleUnassign = (groupId: number, type: CreatureType) => {
    unassignCreature(groupId, type, 1);
  };

  const getGroupTotal = (group: { creatures: Partial<Record<CreatureType, number>> }) => {
    return Object.values(group.creatures).reduce((sum, c) => sum + (c || 0), 0);
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.window}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.title}>{t('groupManagement.title')}</span>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t('settings.close')}
          >
            ✕
          </button>
        </div>
        <div className={styles.info}>
          {t('groupManagement.maxGroups')}: {maxGroups} |{' '}
          {t('groupManagement.maxUnitsPerGroup')}: {maxUnits}
        </div>
        <div className={styles.groupsContainer}>
          {groups.map((group) => (
            <div key={group.id} className={styles.groupCard}>
              <div className={styles.groupHeader}>
                <span className={styles.groupTitle}>
                  {t('groupManagement.group')} {group.id}
                  {isGroupRaiding(group.id) && (
                    <span className={styles.raidingBadge}> {t('groupManagement.raiding')}</span>
                  )}
                </span>
                <Button
                  variant="danger"
                  onClick={() => handleDeleteGroup(group.id)}
                >
                  {t('groupManagement.delete')}
                </Button>
              </div>
              <div className={styles.groupContent}>
                {CREATURE_TYPES.map((type) => {
                  const inGroup = group.creatures[type] || 0;
                  const available = creatureStats ? creatureStats[type].amount : 0;
                  return (
                    <div key={type} className={styles.creatureRow}>
                      <span className={styles.creatureLabel}>
                        {t(CREATURE_LABEL_KEYS[type] as TranslationKey)}:
                      </span>
                      <div className={styles.creatureControls}>
                        <Button
                          variant="ghost"
                          disabled={inGroup === 0}
                          onClick={() => handleUnassign(group.id, type)}
                        >
                          -
                        </Button>
                        <span className={styles.creatureCount}>
                          {inGroup}
                        </span>
                        <Button
                          variant="ghost"
                          disabled={available === 0 || getGroupTotal(group) >= maxUnits}
                          onClick={() => handleAssign(group.id, type)}
                        >
                          +
                        </Button>
                        <span className={styles.availableCount}>
                          (Available: {formatNumber(available)})
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div className={styles.groupTotal}>
                  {t('groupManagement.total')}: {getGroupTotal(group)} / {maxUnits}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.actions}>
          <Button
            onClick={handleCreateGroup}
            disabled={groups.length >= maxGroups}
          >
            {t('groupManagement.createGroup')}
          </Button>
        </div>
      </div>
    </div>
  );
};
