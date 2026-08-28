import { VillageActionMenu } from './VillageActionMenu';
import { emit } from '../../game/helpers/events';
import { NecromancerActionMenu } from './NecroActionMenu';
import { SCENE, type SceneKey } from '../../game/helpers/keys';

interface Props {
  startScene: (sceneKey: SceneKey) => void;
}

export const Location1UI = ({ startScene }: Props) => {
  const handleAttack = (villageId: string) => {
    emit('village-action', { action: 'attack', villageId });
  };
  const handleLoot = (villageId: string) => {
    emit('village-action', { action: 'loot', villageId });
  };
  const handleScout = (villageId: string) => {
    emit('village-action', { action: 'scout', villageId });
  };

  const handleSleep = () => emit('necromancer-sleep');

  return (
    <>
      <VillageActionMenu
        onAttack={handleAttack}
        onLoot={handleLoot}
        onScout={handleScout}
      />
      <NecromancerActionMenu
        onGoToCave={() => startScene(SCENE.Cave)}
        onSleep={handleSleep}
      />
    </>
  );
};

