import { useState } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import styles from './ResourceBar.module.css';

interface Resources {
  ratCorpses: number;
  humanCorpses: number;
}

export const ResourceBar = () => {
  const [resources, setResources] = useState<Resources>({
    ratCorpses: 0,
    humanCorpses: 0,
  });

  useEventBus<Resources>('resources-updated', setResources);

  return (
    <div className={styles.resourceBar}>
      <div className={styles.resourceLabel}>
        Тела крыс:<span>{resources.ratCorpses}</span>
      </div>
      <div className={styles.resourceLabel}>
        Тела людей:<span>{resources.humanCorpses}</span>
      </div>
    </div>
  );
};

