import React, { useState } from 'react';
import styles from './MainMenuUI.module.css';
import { SCENE, type SceneKey } from '../../game/helpers/keys';
import { emit } from '../../game/helpers/events';
import { ConfirmDialog } from '../!shared/ConfirmDialog/ConfirmDialog';
import { Button } from '../!shared/Button/Button';

export const MainMenuUI: React.FC<{
  startScene: (sceneKey: SceneKey) => void;
}> = ({ startScene }) => {
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <div className={styles.overlay}>
      <div className={styles.title}>Главное меню</div>
      <div className={styles.buttons}>
        <Button onClick={() => startScene(SCENE.Cave)}>Начать игру</Button>
        <Button variant="danger" onClick={() => setConfirmingReset(true)}>
          Сбросить прогресс
        </Button>
      </div>

      <ConfirmDialog
        open={confirmingReset}
        title="Сбросить прогресс?"
        message="Весь прогресс будет потерян безвозвратно."
        confirmLabel="Сбросить"
        cancelLabel="Отмена"
        danger
        onConfirm={() => {
          setConfirmingReset(false);
          emit('reset-game');
        }}
        onCancel={() => setConfirmingReset(false)}
      />
    </div>
  );
};

