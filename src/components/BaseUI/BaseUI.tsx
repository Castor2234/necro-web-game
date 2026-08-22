import React from 'react';
//import styles from './BaseUI.module.css';
import { BaseHUD } from './BaseHUD';
import { ConvertCorpseButton } from '../ConvertButtons/ConvertCorpseButton';

export const BaseUI: React.FC = () => {
  return (
    <div>
      <BaseHUD />
      <ConvertCorpseButton />
    </div>
  );
};

