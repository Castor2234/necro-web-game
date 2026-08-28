import { useState } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import { emit } from '../../game/helpers/events';
import {
  getUpgradeState,
  UpgradeState,
  type WorkshopUpgradeKey,
} from '../../game/state/secondary/upgrades';
import styles from './UpgradesColumn.module.css';

export function UpgradesColumn() {
  const [upgrades, setUpgrades] = useState<UpgradeState[]>(getUpgradeState);

  useEventBus('upgrades-updated', setUpgrades);

  const handleUpgrade = (upgradeKey: WorkshopUpgradeKey) => {
    emit('purchase-upgrade', { upgradeKey });
  };

  return (
    <div className={styles.column}>
      {upgrades.map((u) => (
        <div key={u.upgradeKey} className={styles.row}>
          <span className={styles.label}>
            {u.label}: {u.currentValue}
          </span>
          <button
            className={styles.UpgradeButton}
            onClick={() => handleUpgrade(u.upgradeKey)}
          >
            Upgrade ({u.cost}{' '}
            {u.costResource === 'humanCorpses'
              ? 'human corpses'
              : 'rat corpses'}
            )
          </button>
        </div>
      ))}
    </div>
  );
}

