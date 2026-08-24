import { useState } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import { EventBus } from '../../game/EventBus';
import { Button } from '../Button/Button';
import styles from './ConvertCorpseButton.module.css';

interface TaskProgress {
  id: number;
  progress: number;
  secondsLeft: number;
}

export function ConvertCorpseButton() {
  const [activeCount, setActiveCount] = useState(0);
  const [maxConcurrent, setMaxConcurrent] = useState(1);
  const [tasks, setTasks] = useState<TaskProgress[]>([]);

  useEventBus<{ activeCount: number; maxConcurrent: number }>(
    'corpse-conversion-started',
    ({ activeCount, maxConcurrent }) => {
      setActiveCount(activeCount);
      setMaxConcurrent(maxConcurrent);
    }
  );

  useEventBus<TaskProgress[]>('corpse-conversion-progress', setTasks);

  useEventBus<{
    activeCount: number;
    remainingTasks: TaskProgress[];
  }>('corpse-conversion-complete', ({ activeCount, remainingTasks }) => {
    setActiveCount(activeCount);
    setTasks(remainingTasks); // ← explicitly sync the task list, removing finished ones
  });

  const atCapacity = activeCount >= maxConcurrent;

  const handleClick = () => {
    EventBus.emit('convert-corpse');
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

