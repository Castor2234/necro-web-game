import { Scene } from 'phaser';

import { EventBus } from '../EventBus';

export class MainMenu extends Scene
{
    background: Phaser.GameObjects.Image;
    title: Phaser.GameObjects.Text;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.background = this.add.image(320, 180, 'background');
        this.background.setAlpha(0.5);

        this.title = this.add.text(320, 100, 'Главное меню', {
            fontFamily: 'sans-serif', fontSize: 40, color: '#faf8f8',
            stroke: '#000000', strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);


        EventBus.emit('current-scene-ready', this);
    }
    
    changeScene ()
    {
        this.scene.start('Game');
    }

}
