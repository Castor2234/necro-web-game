import { useState } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import { emit, ConversionProgress } from '../../game/events';
import { Button } from '../!shared/Button/Button';
import styles from './ConvertCorpseButton.module.css';

export function ConvertCorpseButton() {
  const [activeCount, setActiveCount] = useState(0);
  const [maxConcurrent, setMaxConcurrent] = useState(1);
  const [tasks, setTasks] = useState<ConversionProgress[]>([]);

  useEventBus('corpse-conversion-started', ({ activeCount, maxConcurrent }) => {
    setActiveCount(activeCount);
    setMaxConcurrent(maxConcurrent);
  });

  useEventBus('corpse-conversion-progress', setTasks);

  useEventBus(
    'corpse-conversion-complete',
    ({ activeCount, remainingTasks }) => {
      setActiveCount(activeCount);
      setTasks(remainingTasks); // ← explicitly sync the task list, removing finished ones
    }
  );

  const atCapacity = activeCount >= maxConcurrent;

  const handleClick = () => {
    emit('convert-corpse');
  };

  return (
    <div className={styles.wrapper}>
      <Button disabled={atCapacity} onClick={handleClick}>
        Convert Corpse ({activeCount}/{maxConcurrent})
      </Button>
      {tasks.map((t) => (
        <div key={t.id} className={styles.taskRow}>
          <div className={styles.taskBar}>
            <div
              className={styles.taskBarFill}
              style={{ width: `${t.progress * 100}%` }}
            />
          </div>
          <span className={styles.taskSeconds}>{t.secondsLeft}s</span>
        </div>
      ))}
    </div>
  );
}

