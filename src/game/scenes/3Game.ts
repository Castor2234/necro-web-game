import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class Game extends Scene
{
    // Scene setup
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;
    camera: Phaser.Cameras.Scene2D.Camera;
    
    // Images
    forest: Phaser.GameObjects.Image;
    village: Phaser.GameObjects.Image;

    // Starting values
    private ratSpeed = 400;
    private v1pw = 50;

    private ratAmount = 0;
    private corpseAmount = 2;
    private lootMulti = 1;


    constructor ()
    {
        super('Game');
    }

    public init (data: number): void {
        // this.score = data.score || 0;
    }

    public create (): void {
        



        EventBus.emit('current-scene-ready', this);
    }

    changeScene ()
    {
        this.scene.start('Map');
    }
}
