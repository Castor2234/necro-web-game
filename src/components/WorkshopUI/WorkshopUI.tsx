import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { WorkshopHUD } from './WorkshopHUD';
import { ConvertRatesColumn } from './ConvertRatesColumn';
import { ConvertCorpseButton } from './ConvertCorpseButton';
import { UpgradesWindow } from './UpgradesWindow';
import { Button } from '../!shared/Button/Button';
import styles from './WorkshopUI.module.css';
import type { SceneUIProps } from '../../sceneUI';

export const WorkshopUI: React.FC<SceneUIProps> = ({ phaserRef }) => {
  const [upgradesOpen, setUpgradesOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <WorkshopHUD />
      <ConvertRatesColumn />
      <ConvertCorpseButton phaserRef={phaserRef} />
      <div className={styles.upgradesButton}>
        <Button onClick={() => setUpgradesOpen(true)}>
          {t('workshop.upgrades')}
        </Button>
      </div>
      <UpgradesWindow
        open={upgradesOpen}
        onClose={() => setUpgradesOpen(false)}
      />
    </>
  );
};

