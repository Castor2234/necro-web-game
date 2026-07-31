import { Boot } from './scenes/0Boot';
import { Preloader } from './scenes/1Preloader';
import { MainMenu } from './scenes/2MainMenu';
import { Base } from './scenes/3Base';
import { WorldMap } from './scenes/WorldMap';

import { AUTO, Game, Scale } from 'phaser';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: 640,
  height: 360,
  parent: 'game-container',
  backgroundColor: '#000000',

  render: {
    pixelArt: true,
  },

  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },

  scene: [Boot, Preloader, MainMenu, Base, WorldMap],
};

const StartGame = (parent: string) => {
  return new Game({ ...config, parent });
};

export default StartGame;

