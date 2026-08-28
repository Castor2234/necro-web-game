import { BuildingActionMenu } from './BuildingActionMenu';
import { emit } from '../../game/events';
import type { BuildingType } from '../../game/events';
import { SCENE, type SceneKey } from '../../game/scenes/keys';

interface Props {
  startScene: (sceneKey: SceneKey) => void;
}

export function CaveUI({ startScene }: Props) {
  const handleGoTo = (type: BuildingType) => {
    if (type === 'tent') startScene(SCENE.Tent);
    if (type === 'workshop') startScene(SCENE.Workshop);
  };

  const handleUpgrade = (type: BuildingType) => {
    emit('building-upgrade', { type });
  };

  return <BuildingActionMenu onGoTo={handleGoTo} onUpgrade={handleUpgrade} />;
}

