import { useState } from 'react';
import { useEventBus } from '@/hooks/useEventBus';
import { useTranslation } from '@/hooks/useTranslation';
import { emit } from '@/game/helpers/events';
import {
  getUpgradeState,
  UpgradeState,
  type UpgradeTree,
  type WorkshopUpgradeKey,
} from '@/game/state/secondary/upgrades';
import styles from './UpgradesColumn.module.css';

interface UpgradesColumnProps {
  /** When set, only upgrades belonging to this tree are listed. */
  tree?: UpgradeTree;
}

export function UpgradesColumn({ tree }: UpgradesColumnProps) {
  const [upgrades, setUpgrades] = useState<UpgradeState[]>(getUpgradeState);
  const { t } = useTranslation();

  useEventBus('upgrades-updated', setUpgrades);

  const handleUpgrade = (upgradeKey: WorkshopUpgradeKey) => {
    emit('purchase-upgrade', { upgradeKey });
  };

  const visibleUpgrades = tree
    ? upgrades.filter((u) => u.tree === tree)
    : upgrades;

  if (visibleUpgrades.length === 0) {
    return <div className={styles.empty}>{t('upgrades.empty')}</div>;
  }

  return (
    <div className={styles.column}>
      {visibleUpgrades.map((u) => (
        <div key={u.upgradeKey} className={styles.row}>
          <span className={styles.label}>
            {t(`upgrades.${u.upgradeKey}`)}: {u.currentValue}
          </span>
          <button
            className={styles.UpgradeButton}
            onClick={() => handleUpgrade(u.upgradeKey)}
          >
            {t('workshop.upgradeCost', {
              cost: u.cost,
              resource: t(
                u.costResource === 'humanCorpses'
                  ? 'cost.humanCorpses'
                  : 'cost.ratCorpses'
              ),
            })}
          </button>
        </div>
      ))}
    </div>
  );
}
