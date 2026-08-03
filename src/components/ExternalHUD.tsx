import React from 'react';
import styles from '../styles/ExternalHUD.module.css';

interface ExternalHUDProps {
  currentSceneKey: string;
  onNavigate: (sceneKey: string) => void;
}

const NAV_ITEMS = [
  { key: 'MainMenu', label: 'Главное меню' },
  { key: 'Base', label: 'База' },
  { key: 'Location_1', label: 'Первая локация' },
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

