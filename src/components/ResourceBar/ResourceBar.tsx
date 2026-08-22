import { useEffect, useState, RefObject } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import { IRefPhaserGame } from '../../PhaserGame';
import { getResources, Resources } from '../../game/states/resources';
import styles from './ResourceBar.module.css';

interface Props {
  phaserRef: RefObject<IRefPhaserGame | null>;
}

export const ResourceBar = ({ phaserRef }: Props) => {
  const [resources, setResources] = useState<Resources>({
    ratCorpses: 0,
    humanCorpses: 0,
  });

  useEffect(() => {
    const game = phaserRef.current?.game;
    if (game) {
      setResources(getResources(game.registry));
    }
  }, [phaserRef]);

  useEventBus<Resources>('resources-updated', setResources);

  return (
    <div className={styles.resourceBar}>
      <div className={styles.resourceLabel}>
        <span>Тела людей:</span>
        <span>{resources.humanCorpses}</span>
      </div>
      <div className={styles.resourceLabel}>
        <span>Тела крыс:</span>
        <span>{resources.ratCorpses}</span>
      </div>
    </div>
  );
};

