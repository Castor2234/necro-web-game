import React from 'react';
import styles from '../styles/MainMenuHUD.module.css';

export const MainMenuHUD: React.FC<{
  startScene: (sceneKey: string) => void;
}> = ({ startScene }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.title}>Главное меню</div>
      <div className={styles.buttons}>
        <button className={styles.button} onClick={() => startScene('Base')}>
          Начать игру
        </button>
      </div>
    </div>
  );
};

