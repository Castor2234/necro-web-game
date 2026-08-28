import { useState } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import { useTranslation } from '../../hooks/useTranslation';
import { emit } from '../../game/helpers/events';
import {
  getUpgradeState,
  UpgradeState,
  type WorkshopUpgradeKey,
} from '../../game/state/secondary/upgrades';
import styles from './UpgradesColumn.module.css';

export function UpgradesColumn() {
  const [upgrades, setUpgrades] = useState<UpgradeState[]>(getUpgradeState);
  const { t } = useTranslation();

  useEventBus('upgrades-updated', setUpgrades);

  const handleUpgrade = (upgradeKey: WorkshopUpgradeKey) => {
    emit('purchase-upgrade', { upgradeKey });
  };

  return (
    <div className={styles.column}>
      {upgrades.map((u) => (
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

