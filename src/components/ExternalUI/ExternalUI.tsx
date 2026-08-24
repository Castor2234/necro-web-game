import React from 'react';
import styles from './ExternalUI.module.css';

export interface ExternalUIProps {
  currentSceneKey: string;
  onNavigate: (sceneKey: string) => void;
}

const NAV_ITEMS = [
  { key: 'MainMenu', label: 'Главное меню' },
  { key: 'Cave', label: 'Пещера' },
  { key: 'Workshop', label: 'Мастерская' },
  { key: 'Tent', label: 'Жилище' },
  { key: 'Location_1', label: 'Первая локация' },
  { key: 'WorldMap', label: 'Карта мира' },
] as const;

export const ExternalUI: React.FC<ExternalUIProps> = ({
  currentSceneKey,
  onNavigate,
}) => {
  return (
    <div className={styles.navPanel}>
      {NAV_ITEMS.map(({ key, label }) => (
        <button
          key={key}
          className={styles.button}
          onClick={() => onNavigate(key)}
          disabled={currentSceneKey === key}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

