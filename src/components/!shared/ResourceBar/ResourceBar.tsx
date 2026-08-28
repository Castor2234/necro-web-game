import { useEffect, useState, RefObject } from 'react';
import { useEventBus } from '../../../hooks/useEventBus';
import { useTranslation } from '../../../hooks/useTranslation';
import { IRefPhaserGame } from '../../../PhaserGame';
import {
  getResources,
  Resources,
} from '../../../game/state/secondary/resources';
import styles from './ResourceBar.module.css';

interface Props {
  phaserRef: RefObject<IRefPhaserGame | null>;
}

export const ResourceBar = ({ phaserRef }: Props) => {
  const [resources, setResources] = useState<Resources>({
    ratCorpses: 0,
    humanCorpses: 0,
  });
  const { t } = useTranslation();

  useEffect(() => {
    const game = phaserRef.current?.game;
    if (game) {
      setResources(getResources(game.registry));
    }
  }, [phaserRef]);

  useEventBus('resources-updated', setResources);

  return (
    <div className={styles.resourceBar}>
      <div className={styles.resourceLabel}>
        <span>{t('resources.humanCorpses')}</span>
        <span>{resources.humanCorpses}</span>
      </div>
      <div className={styles.resourceLabel}>
        <span>{t('resources.ratCorpses')}</span>
        <span>{resources.ratCorpses}</span>
      </div>
    </div>
  );
};

