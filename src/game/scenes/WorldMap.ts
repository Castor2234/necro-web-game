import { EventBus } from '../EventBus';
import * as Phaser from 'phaser'
import { CustomContainer } from './1Preloader'


export class WorldMap extends Phaser.Scene
{
    // Scene setup
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;
    camera: Phaser.Cameras.Scene2D.Camera;
    
    // Images
    forestBase: CustomContainer
    village1: CustomContainer


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

        // Scene title (Карта пока что показывается в зуме x2)
        this.gameText = this.add.text(220, 50, 'Карта мира', {
            fontFamily: 'Pixelify Sans', fontSize: 32, color: '#b98ba0',
            stroke: '#000000', strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // Camera
        this.camera = this.cameras.main;
        this.camera.setZoom(2);
        this.camera.setScroll(-90,-70);

        // Forest Base
        this.forestBase = new CustomContainer(this,'forest','База', 160, 140);
        this.forestBase.setInteractive(
            new Phaser.Geom.Circle(this.forestBase.width/2,this.forestBase.width/2,this.forestBase.width/2),
            Phaser.Geom.Circle.Contains,
        );
        this.add.circle(160, 140, this.forestBase.height, 0xff0012).setDepth(200);
        
        

        // Village 1
        this.village1 = new CustomContainer(this, 'village', 'Деревня', 280, 140)
        

        




        EventBus.emit('current-scene-ready', this);
    }

    changeScene ()
    {
        this.scene.start('MainMenu');
    }
}
