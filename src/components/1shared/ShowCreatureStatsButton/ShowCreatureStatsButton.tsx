// components/ShowCreatureStatsButton/ShowCreatureStatsButton.tsx
import { useEffect, useState, RefObject } from 'react';
import { useEventBus } from '../../../hooks/useEventBus';
import { useTranslation } from '../../../hooks/useTranslation';
import { IRefPhaserGame } from '../../../PhaserGame';
import {
  getCreatureStats,
  AllCreatureStats,
} from '../../../game/state/secondary/creatures';
import { Button } from '../Button/Button';
import styles from './CreatureStatsButton.module.css';

interface Props {
  phaserRef: RefObject<IRefPhaserGame | null>;
}

const EMPTY_STATS: AllCreatureStats = {
  zombieRats: { amount: 0, speed: 0, power: 0 },
  ghouls: { amount: 0, speed: 0, power: 0 },
};

export const ShowCreatureStatsButton = ({ phaserRef }: Props) => {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<AllCreatureStats>(EMPTY_STATS);
  const { t } = useTranslation();

  const refreshStats = () => {
    const game = phaserRef.current?.game;
    if (game) {
      setStats(getCreatureStats(game.registry));
    }
  };

  useEffect(() => {
    if (open) refreshStats();
  }, [open]);

  // Keep stats live if amounts change while panel is open (conversion, combat, etc.)
  useEventBus('creature-stats-changed', () => {
    if (open) refreshStats();
  });

  return (
    <div className={styles.wrapper}>
      {open && (
        <div className={styles.panel}>
          <div className={styles.grid}>
            <div className={styles.corner} />
            <div className={styles.header}>
              {t('stats.rats')}: {stats.zombieRats.amount}
            </div>
            <div className={styles.header}>
              {t('stats.ghouls')}: {stats.ghouls.amount}
            </div>

            <div className={styles.rowLabel}>{t('stats.power')}:</div>
            <div className={styles.cell}>{stats.zombieRats.power}</div>
            <div className={styles.cell}>{stats.ghouls.power}</div>

            <div className={styles.rowLabel}>{t('stats.speed')}:</div>
            <div className={styles.cell}>{stats.zombieRats.speed}</div>
            <div className={styles.cell}>{stats.ghouls.speed}</div>
          </div>
        </div>
      )}
      <Button onClick={() => setOpen((o) => !o)}>{t('stats.title')}</Button>
    </div>
  );
};

