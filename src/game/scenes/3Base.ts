import { EventBus } from '../EventBus';
import * as Phaser from 'phaser'

export class Base extends Phaser.Scene
{
    // Scene setup
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;
    camera: Phaser.Cameras.Scene2D.Camera;
    
    // Starting values
    private ratSpeed = 400;
    private v1pw = 50;

    private ratAmount = 0;
    private corpseAmount = 2;
    private lootMulti = 1;


    constructor ()
    {
        super('Base');
    }

    public init (data: number): void {
        //this.registry.set('score', 0)
    }

    public create (): void {

        // Bg 
        this.background = this.add.image(320, 180, 'background').setDepth(-1);

        // Scene title
        this.gameText = this.add.text(220, 50, 'Сцена базы', {
            fontFamily: 'Arial Black', fontSize: 32, color: '#b98ba0',
            stroke: '#000000', strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);
        



        EventBus.emit('current-scene-ready', this);
    }

    changeScene ()
    {
        this.scene.start('WorldMap');
    }
}
