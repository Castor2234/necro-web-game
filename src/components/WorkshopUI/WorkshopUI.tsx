import React from 'react';
import { WorkshopHUD } from './WorkshopHUD';
import { ConvertRatesColumn } from './ConvertRatesColumn';
import { ConvertCorpseButton } from './ConvertCorpseButton';
import { UpgradesColumn } from './UpgradesColumn';
import type { SceneUIProps } from '../../sceneUI';

export const WorkshopUI: React.FC<SceneUIProps> = ({ phaserRef }) => {
  return (
    <>
      <WorkshopHUD />
      <ConvertRatesColumn />
      <ConvertCorpseButton phaserRef={phaserRef} />
      <UpgradesColumn />
    </>
  );
};

