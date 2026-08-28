import React from 'react';
import styles from './MainMenuUI.module.css';
import { SCENE, type SceneKey } from '../../game/scenes/keys';

export const MainMenuUI: React.FC<{
  startScene: (sceneKey: SceneKey) => void;
}> = ({ startScene }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.title}>Главное меню</div>
      <div className={styles.buttons}>
        <button
          className={styles.button}
          onClick={() => startScene(SCENE.Cave)}
        >
          Начать игру
        </button>
      </div>
    </div>
  );
};

