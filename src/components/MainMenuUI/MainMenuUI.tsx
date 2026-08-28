import React, { useState } from 'react';
import styles from './MainMenuUI.module.css';
import { SCENE, type SceneKey } from '../../game/helpers/keys';
import { emit } from '../../game/helpers/events';
import { ConfirmDialog } from '../!shared/ConfirmDialog/ConfirmDialog';
import { SettingsWindow } from '../!shared/SettingsWindow/SettingsWindow';
import { Button } from '../!shared/Button/Button';
import { useTranslation } from '../../hooks/useTranslation';

export const MainMenuUI: React.FC<{
  startScene: (sceneKey: SceneKey) => void;
}> = ({ startScene }) => {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className={styles.overlay}>
      <div className={styles.title}>{t('menu.title')}</div>
      <div className={styles.buttons}>
        <Button onClick={() => startScene(SCENE.Cave)}>{t('menu.start')}</Button>
        <Button onClick={() => setSettingsOpen(true)}>
          {t('menu.settings')}
        </Button>
        <Button variant="danger" onClick={() => setConfirmingReset(true)}>
          {t('menu.reset')}
        </Button>
      </div>

      <SettingsWindow
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <ConfirmDialog
        open={confirmingReset}
        title={t('menu.resetTitle')}
        message={t('menu.resetMessage')}
        confirmLabel={t('menu.resetConfirm')}
        cancelLabel={t('dialog.cancel')}
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

