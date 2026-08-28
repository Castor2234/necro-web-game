import React from 'react';
import styles from './ExternalUI.module.css';
import { SCENE, type SceneKey } from '../../game/scenes/keys';

export interface ExternalUIProps {
  /** Currently active scene, or null before the first scene reports ready. */
  currentSceneKey: SceneKey | null;
  onNavigate: (sceneKey: SceneKey) => void;
}

const NAV_ITEMS = [
  { key: SCENE.MainMenu, label: 'Главное меню' },
  { key: SCENE.Cave, label: 'Пещера' },
  { key: SCENE.Workshop, label: 'Мастерская' },
  { key: SCENE.Tent, label: 'Жилище' },
  { key: SCENE.Location_1, label: 'Первая локация' },
  { key: SCENE.WorldMap, label: 'Карта мира' },
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

