import { useState } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import { useTranslation } from '../../hooks/useTranslation';
import { emit, ConversionProgress } from '../../game/helpers/events';
import { Button } from '../!shared/Button/Button';
import styles from './ConvertCorpseButton.module.css';

export function ConvertCorpseButton() {
  const [activeCount, setActiveCount] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);
  const [maxConcurrent, setMaxConcurrent] = useState(1);
  const [maxQueue, setMaxQueue] = useState(1);
  const [tasks, setTasks] = useState<ConversionProgress[]>([]);
  const { t } = useTranslation();

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

  const handleClick = () => {
    emit('convert-corpse');
  };

  return (
    <div className={styles.wrapper}>
      <Button disabled={atCapacity} onClick={handleClick}>
        {t('workshop.convert', { active: activeCount, max: maxConcurrent })}
        {queuedCount > 0 ? ` +${queuedCount}/${maxQueue}` : ''}
      </Button>
      {tasks.map((task) => (
        <div key={task.id} className={styles.taskRow}>
          <div className={styles.taskBar}>
            <div
              className={styles.taskBarFill}
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

