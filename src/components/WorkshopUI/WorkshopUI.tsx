import React from 'react';
import { WorkshopHUD } from './WorkshopHUD';
import { ConvertRatesColumn } from './ConvertRatesColumn';
import { ConvertCorpseButton } from './ConvertCorpseButton';
import { UpgradesColumn } from './UpgradesColumn';

export const WorkshopUI: React.FC = () => {
  return (
    <>
      <WorkshopHUD />
      <ConvertRatesColumn />
      <ConvertCorpseButton />
      <UpgradesColumn />
    </>
  );
};

