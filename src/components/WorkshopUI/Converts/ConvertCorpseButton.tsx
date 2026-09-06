import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { useEventBus } from '../../../hooks/useEventBus';
import { useTranslation } from '../../../hooks/useTranslation';
import { emit } from '../../../game/helpers/events';
import type { CreatureType } from '../../../game/state/secondary/creatures';
import { CONVERSION_RECIPES } from '../../../game/state/secondary/conversions';
import {
  getResources,
  type Resources,
} from '../../../game/state/secondary/resources';
import {
  getConversionUiState,
  type ConversionUiState,
} from '../../../game/state/worldSim';
import type { IRefPhaserGame } from '../../../PhaserGame';
import { CreatureDropdown } from '../CreatureDropdown';
import { Button } from '../../1shared/Button/Button';
import { formatTime } from '../../../game/helpers/format';
import styles from './ConvertCorpseButton.module.css';

interface Props {
  /** Phaser game ref, used to read the current resources on mount. */
  phaserRef: RefObject<IRefPhaserGame | null>;
}

export function ConvertCorpseButton({ phaserRef }: Props) {
  // The queue is pulled synchronously from WorldSim (not bootstrapped to
  // defaults), so a freshly mounted component always renders the real state —
  // even when conversions advanced/completed while the Workshop was hidden.
  const [queue, setQueue] = useState<ConversionUiState>(getConversionUiState);
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
    if (game) {
      setResources(getResources(game.registry));
      setQueue(getConversionUiState());
    }
  }, [phaserRef]);

  useEventBus('resources-updated', setResources);

  useEventBus(
    'corpse-conversion-started',
    ({ activeCount, queuedCount, maxConcurrent, maxQueue }) => {
      setQueue((q) => ({
        ...q,
        activeCount,
        queuedCount,
        maxConcurrent,
        maxQueue,
      }));
    }
  );

  useEventBus('corpse-conversion-progress', (tasks) => {
    setQueue((q) => ({ ...q, tasks }));
  });

  useEventBus(
    'corpse-conversion-complete',
    ({ activeCount, queuedCount, maxConcurrent, maxQueue, remainingTasks }) => {
      // Explicitly sync the task list, removing finished ones.
      setQueue((q) => ({
        ...q,
        activeCount,
        queuedCount,
        maxConcurrent,
        maxQueue,
        tasks: remainingTasks,
      }));
    }
  );

  // Keep the capacity display in sync when conversion upgrades are purchased
  // ('upgrades-updated' fires on purchase and on scene enter).
  useEventBus('upgrades-updated', (states) => {
    setQueue((q) => {
      const next = { ...q };
      for (const s of states) {
        if (s.upgradeKey === 'maxConcurrentConversions')
          next.maxConcurrent = s.currentValue;
        if (s.upgradeKey === 'maxConversionQueue')
          next.maxQueue = s.currentValue;
      }
      return next;
    });
  });

  const { activeCount, queuedCount, maxConcurrent, maxQueue, tasks } = queue;

  const atCapacity = activeCount + queuedCount >= maxConcurrent + maxQueue;

  // Affordability of the selected creature's recipe — the same
  // CONVERSION_RECIPES check WorldSim applies in handleConvertCorpse.
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
            {t(
              task.creatureType === 'zombieRats' ? 'stats.rats' : 'stats.ghouls'
            )}
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
            {task.queued ? t('workshop.queued') : formatTime(task.secondsLeft)}
          </span>
        </div>
      ))}
    </div>
  );
}
