import { BuildingActionMenu } from './BuildingActionMenu';
import { EventBus } from '../../game/EventBus';
import styles from './CaveUI.module.css';

interface Props {
  startScene: (sceneKey: string) => void;
}

export function CaveUI({ startScene }: Props) {
  const handleGoTo = (type: 'tent' | 'workshop') => {
    if (type === 'tent') startScene('Tent'); // whichever scene key represents entering the tent
    if (type === 'workshop') startScene('Workshop');
  };

  const handleUpgrade = (type: 'tent' | 'workshop') => {
    EventBus.emit('building-upgrade', { type });
  };

  return <BuildingActionMenu onGoTo={handleGoTo} onUpgrade={handleUpgrade} />;
}

