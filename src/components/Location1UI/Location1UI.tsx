import { VillageActionMenu } from './ActionMenuOnClick';
import { EventBus } from '../../game/EventBus';

interface Props {
  startScene: (sceneKey: string) => void;
}

export function Location1UI({ startScene }: Props) {
  const handleAttack = (villageId: string) => {
    EventBus.emit('village-action', { type: 'attack', villageId });
  };
  const handleLoot = (villageId: string) => {
    EventBus.emit('village-action', { type: 'loot', villageId });
  };
  const handleScout = (villageId: string) => {
    EventBus.emit('village-action', { type: 'scout', villageId });
  };

  return (
    <>
      <VillageActionMenu
        onAttack={handleAttack}
        onLoot={handleLoot}
        onScout={handleScout}
      />
      {/* startScene is available here too, e.g. for a "back to world map" button */}
    </>
  );
}

