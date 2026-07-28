import { Boot } from './scenes/0Boot';
import { GameOver } from './scenes/4GameOver';
import { Game as MainGame } from './scenes/3Game';
import { MainMenu } from './scenes/2MainMenu';
import { AUTO, Game, Scale } from 'phaser';
import { Preloader } from './scenes/1Preloader';

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
        antialias: false,
        roundPixels: true 
    },

    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    
    scene: [
        Boot,
        Preloader,
        MainMenu,
        MainGame,
        GameOver
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
