import React from 'react';
import { WorkshopHUD } from './WorkshopHUD';
import { ConvertCorpseButton } from '../ConvertButtons/ConvertCorpseButton';
import styles from '../WorkshopUI.module.css';

export const WorkshopUI: React.FC = () => {
  return (
    <div>
      <WorkshopHUD />
      <ConvertCorpseButton />
    </div>
  );
};

