import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import { useTranslation } from '../../hooks/useTranslation';
import { emit, ConversionProgress } from '../../game/helpers/events';
import type { CreatureType } from '../../game/state/secondary/creatures';
import { CONVERSION_RECIPES } from '../../game/state/secondary/conversions';
import {
  getResources,
  type Resources,
} from '../../game/state/secondary/resources';
import type { IRefPhaserGame } from '../../PhaserGame';
import { CreatureDropdown } from './CreatureDropdown';
import { Button } from '../!shared/Button/Button';
import styles from './ConvertCorpseButton.module.css';

interface Props {
  /** Phaser game ref, used to read the current resources on mount. */
  phaserRef: RefObject<IRefPhaserGame | null>;
}

export function ConvertCorpseButton({ phaserRef }: Props) {
  const [activeCount, setActiveCount] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);
  const [maxConcurrent, setMaxConcurrent] = useState(1);
  const [maxQueue, setMaxQueue] = useState(1);
  const [tasks, setTasks] = useState<ConversionProgress[]>([]);
  const [creatureType, setCreatureType] = useState<CreatureType>('zombieRats');
  const [resources, setResources] = useState<Resources>(() => {
    const game = phaserRef.current?.game;
    return game
      ? getResources(game.registry)
      : { ratCorpses: 0, humanCorpses: 0 };
  });
  const { t } = useTranslation();

  // Initial registry read on mount (same pattern as ResourceBar), then live
  // updates, so the button re-enables as soon as enough corpses are available.
  useEffect(() => {
    const game = phaserRef.current?.game;
    if (game) setResources(getResources(game.registry));
  }, [phaserRef]);

  useEventBus('resources-updated', setResources);

  useEventBus(
    'corpse-conversion-started',
    ({ activeCount, queuedCount, maxConcurrent, maxQueue }) => {
      setActiveCount(activeCount);
      setQueuedCount(queuedCount);
      setMaxConcurrent(maxConcurrent);
      setMaxQueue(maxQueue);
    }
  );

  useEventBus('corpse-conversion-progress', setTasks);

  useEventBus(
    'corpse-conversion-complete',
    ({ activeCount, queuedCount, maxConcurrent, maxQueue, remainingTasks }) => {
      setActiveCount(activeCount);
      setQueuedCount(queuedCount);
      setMaxConcurrent(maxConcurrent);
      setMaxQueue(maxQueue);
      setTasks(remainingTasks); // ← explicitly sync the task list, removing finished ones
    }
  );

  // Keep the capacity display in sync when conversion upgrades are purchased
  // ('upgrades-updated' fires on purchase and on scene enter).
  useEventBus('upgrades-updated', (states) => {
    for (const s of states) {
      if (s.upgradeKey === 'maxConcurrentConversions')
        setMaxConcurrent(s.currentValue);
      if (s.upgradeKey === 'maxConversionQueue') setMaxQueue(s.currentValue);
    }
  });

  const atCapacity = activeCount + queuedCount >= maxConcurrent + maxQueue;

  // Affordability of the selected creature's recipe — the same
  // CONVERSION_RECIPES check the Workshop scene applies in handleConvertCorpse.
  const recipe = CONVERSION_RECIPES[creatureType];
  const notEnoughResources = resources[recipe.costResource] < recipe.costAmount;
  const disabled = atCapacity || notEnoughResources;

  const handleClick = () => {
    emit('convert-corpse', { creatureType });
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.controlsRow}>
        <Button disabled={disabled} onClick={handleClick}>
          {notEnoughResources
            ? t('workshop.notEnoughResources')
            : t('workshop.convert', {
                active: activeCount,
                max: maxConcurrent,
              })}
          {!notEnoughResources && queuedCount > 0
            ? ` +${queuedCount}/${maxQueue}`
            : ''}
        </Button>
        <CreatureDropdown value={creatureType} onChange={setCreatureType} />
      </div>
      {tasks.map((task) => (
        <div key={task.id} className={styles.taskRow}>
          <span className={styles.taskCreature}>
            {t(task.creatureType === 'zombieRats' ? 'stats.rats' : 'stats.ghouls')}
          </span>
          <div className={styles.taskBar}>
            <div
              className={`${styles.taskBarFill} ${
                task.creatureType === 'zombieRats'
                  ? styles.fillRats
                  : styles.fillGhouls
              }`}
              style={{ width: task.queued ? '0%' : `${task.progress * 100}%` }}
            />
          </div>
          <span className={styles.taskSeconds}>
            {task.queued ? t('workshop.queued') : `${task.secondsLeft}s`}
          </span>
        </div>
      ))}
    </div>
  );
}

