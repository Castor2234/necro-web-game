import { VillageActionMenu } from './VillageActionMenu';
//import { Location1HUD } from './Location1HUD';
import { EventBus } from '../../game/EventBus';
import { NecromancerActionMenu } from './NecroActionMenu';

interface Props {
  startScene: (sceneKey: string) => void;
}

export const Location1UI = ({ startScene }: Props) => {
  const handleAttack = (villageId: string) => {
    EventBus.emit('village-action', { action: 'attack', villageId });
  };
  const handleLoot = (villageId: string) => {
    EventBus.emit('village-action', { action: 'loot', villageId });
  };
  const handleScout = (villageId: string) => {
    EventBus.emit('village-action', { action: 'scout', villageId });
  };

  const handleSleep = () => EventBus.emit('necromancer-sleep');

  return (
    <>
      <VillageActionMenu
        onAttack={handleAttack}
        onLoot={handleLoot}
        onScout={handleScout}
      />
      <NecromancerActionMenu
        onGoToBase={() => startScene('Base')}
        onSleep={handleSleep}
      />
    </>
  );
};

