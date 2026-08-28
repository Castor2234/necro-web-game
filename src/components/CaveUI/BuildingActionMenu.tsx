import { useState } from 'react';
import { useEventBus } from '../../hooks/useEventBus';
import { useTranslation } from '../../hooks/useTranslation';
import { useAnchoredMenu } from '../../hooks/useAnchoredMenu';
import type { BuildingType } from '../../game/helpers/events';
import type { TranslationKey } from '../../game/i18n';
import styles from '../Location1UI/ActionMenu.module.css'; // reuse existing menu styles
import { Button } from '../!shared/Button/Button';

interface Props {
  onGoTo: (type: BuildingType) => void;
  onUpgrade: (type: BuildingType) => void;
}

const ENTER_KEYS: Record<BuildingType, TranslationKey> = {
  tent: 'cave.enterTent',
  workshop: 'cave.enterWorkshop',
};

const UPGRADE_KEYS: Record<BuildingType, TranslationKey> = {
  tent: 'cave.upgradeTent',
  workshop: 'cave.upgradeWorkshop',
};

export const BuildingActionMenu = ({ onGoTo, onUpgrade }: Props) => {
  const [selected, setSelected] = useState<{ type: BuildingType } | null>(null);
  const { t } = useTranslation();
  const containerRef = useAnchoredMenu('building-ui-position');

  useEventBus('building-selected', setSelected);

  if (!selected) return null;

  return (
    <div ref={containerRef} className={styles.actionMenu}>
      <Button onClick={() => onGoTo(selected.type)}>
        {t(ENTER_KEYS[selected.type])}
      </Button>
      <Button onClick={() => onUpgrade(selected.type)}>
        {t(UPGRADE_KEYS[selected.type])}
      </Button>
    </div>
  );
};

