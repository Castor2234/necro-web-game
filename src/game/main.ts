import { AUTO, Game, Scale } from 'phaser';
import { Boot } from './scenes/0Boot';
import { Preloader } from './scenes/1Preloader';
import { MainMenu } from './scenes/2MainMenu';
import { Workshop } from './scenes/Workshop';
import { Location_1 } from './scenes/Location_1';
import { WorldMap } from './scenes/WorldMap';
import { Cave } from './scenes/3Cave';
import { Tent } from './scenes/Tent';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  width: 640,
  height: 360,
  parent: 'game-container',
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: true },
  },

  render: {
    pixelArt: true,
  },

  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },

  scene: [
    Boot,
    Preloader,
    MainMenu,
    Cave,
    Workshop,
    Tent,
    Location_1,
    WorldMap,
  ],
};

const StartGame = (parent: string) => {
  return new Game({ ...config, parent });
};

export default StartGame;
