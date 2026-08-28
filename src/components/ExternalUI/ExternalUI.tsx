import React from 'react';
import styles from './ExternalUI.module.css';
import { SCENE, type SceneKey } from '../../game/helpers/keys';
import { useTranslation } from '../../hooks/useTranslation';

export interface ExternalUIProps {
  /** Currently active scene, or null before the first scene reports ready. */
  currentSceneKey: SceneKey | null;
  onNavigate: (sceneKey: SceneKey) => void;
}

const NAV_ITEMS = [
  { key: SCENE.MainMenu, labelKey: 'nav.mainMenu' },
  { key: SCENE.Cave, labelKey: 'nav.cave' },
  { key: SCENE.Workshop, labelKey: 'nav.workshop' },
  { key: SCENE.Tent, labelKey: 'nav.tent' },
  { key: SCENE.Location_1, labelKey: 'nav.location1' },
  { key: SCENE.WorldMap, labelKey: 'nav.worldMap' },
] as const;

export const ExternalUI: React.FC<ExternalUIProps> = ({
  currentSceneKey,
  onNavigate,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.navPanel}>
      {NAV_ITEMS.map(({ key, labelKey }) => (
        <button
          key={key}
          className={styles.button}
          onClick={() => onNavigate(key)}
          disabled={currentSceneKey === key}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
};

