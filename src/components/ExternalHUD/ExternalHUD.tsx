import React from 'react';
import styles from './ExternalHUD.module.css';

export interface ExternalHUDProps {
  currentSceneKey: string;
  onNavigate: (sceneKey: string) => void;
}

const NAV_ITEMS = [
  { key: 'MainMenu', label: 'Главное меню' },
  { key: 'Base', label: 'База' },
  { key: 'Location_1', label: 'Первая локация' },
  { key: 'WorldMap', label: 'Карта мира' },
] as const;

export const ExternalHUD: React.FC<ExternalHUDProps> = ({
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

