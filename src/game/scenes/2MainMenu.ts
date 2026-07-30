import * as Phaser from 'phaser'

import { EventBus } from '../EventBus';

export class MainMenu extends Phaser.Scene
{
    background: Phaser.GameObjects.Image;
    title: Phaser.GameObjects.Text;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        // Делаем фон и затемняем
        this.background = this.add.image(320, 180, 'background');
        this.background.setAlpha(0.5);


        // Сцена готова к использованию
        EventBus.emit('current-scene-ready', this);
    }
    
    changeScene ()
    {
        this.scene.start('Base');
    }

}
