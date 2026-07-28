import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { CustomContainer } from './1Preloader'


export class WorldMap extends Scene
{
    // Scene setup
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;
    camera: Phaser.Cameras.Scene2D.Camera;
    
    // Images
    forest: Phaser.GameObjects.Container;
    village: Phaser.GameObjects.Image;


    constructor ()
    {
        super('WorldMap');
    }

    public init (data: number): void {
        // this.score = data.score || 0;
    }

    public create (): void {
        // Bg 
        this.background = this.add.image(320, 180, 'background').setDepth(-1);

        // Scene title (Карта пока что показывается в зуме 2)
        this.gameText = this.add.text(220, 50, 'Карта мира', {
            fontFamily: 'Arial Black', fontSize: 32, color: '#b98ba0',
            stroke: '#000000', strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // Camera
        this.camera = this.cameras.main;
        this.camera.setZoom(2)
        this.camera.setScroll(-90,-70)

        // Forest
        this.forest = new CustomContainer(this,'forest','База', 180, 160)


        // Village
        this.village = this.add.image(280, 160, 'village');

        




        EventBus.emit('current-scene-ready', this);
    }

    changeScene ()
    {
        this.scene.start('MainMenu');
    }
}
