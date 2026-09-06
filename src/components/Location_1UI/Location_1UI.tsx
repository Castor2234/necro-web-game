import { VillageActionMenu } from './VillageActionMenu';
import { emit } from '../../game/helpers/events';
import { NecromancerActionMenu } from './NecroActionMenu';
import { GroupManagementWindow } from './GroupManagementWindow';
import { SCENE, type SceneKey } from '../../game/helpers/keys';
import { useState } from 'react';

interface Props {
  startScene: (sceneKey: SceneKey) => void;
}

export const Location1UI = ({ startScene }: Props) => {
  const [groupManagementOpen, setGroupManagementOpen] = useState(false);

  const handleAttack = (villageId: string, groupId: number) => {
    emit('village-action', { action: 'attack', villageId, groupId });
  };
  const handleLoot = (villageId: string, groupId: number) => {
    emit('village-action', { action: 'loot', villageId, groupId });
  };
  const handleScout = (villageId: string, groupId: number) => {
    emit('village-action', { action: 'scout', villageId, groupId });
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
        onGroupManagement={() => setGroupManagementOpen(true)}
      />
      <GroupManagementWindow
        open={groupManagementOpen}
        onClose={() => setGroupManagementOpen(false)}
      />
    </>
  );
};
