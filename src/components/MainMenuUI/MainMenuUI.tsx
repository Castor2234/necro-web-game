import React from 'react';
import styles from './MainMenuUI.module.css';

export const MainMenuUI: React.FC<{
  startScene: (sceneKey: string) => void;
}> = ({ startScene }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.title}>Главное меню</div>
      <div className={styles.buttons}>
        <button className={styles.button} onClick={() => startScene('Cave')}>
          Начать игру
        </button>
      </div>
    </div>
  );
};

