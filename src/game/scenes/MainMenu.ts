import { GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';

export class MainMenu extends Scene
{
    background: GameObjects.Image;
    forest: GameObjects.Image;
    title: GameObjects.Text;
    forestTween: Phaser.Tweens.Tween | null;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.background = this.add.image(320, 180, 'background');

        this.forest = this.add.image(512, 300, 'forest').setDepth(100);

        this.title = this.add.text(320, 100, 'Main Menu', {
            fontFamily: 'sans-serif', fontSize: 40, color: '#6d2121',
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
