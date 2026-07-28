import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { CustomContainer } from './0Boot'

/*
interface EntityContainer {
    image: Phaser.GameObjects.Image, 
    text: Phaser.GameObjects.Text,
    x: number,
    y: number,
    name: string
}
*/

export class FullMap extends Scene
{
    // Scene setup
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;
    camera: Phaser.Cameras.Scene2D.Camera;
    
    // Images
    forest: Phaser.GameObjects.Container;
    village: Phaser.GameObjects.Image;

    // Starting values
    private ratSpeed = 400;
    private v1pw = 50;

    private ratAmount = 0;
    private corpseAmount = 2;
    private lootMulti = 1;



    constructor ()
    {
        super('FullMap');
    }

    public init (data: number): void {
        // this.score = data.score || 0;
    }

    public create (): void {
        // Bg 
        this.background = this.add.image(320, 180, 'background').setDepth(-1);

        // Scene title
        this.gameText = this.add.text(220, 50, 'Игра', {
            fontFamily: 'Arial Black', fontSize: 32, color: '#b98ba0',
            stroke: '#000000', strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // Camera
        this.camera = this.cameras.main;
        this.camera.setZoom(1.3)
        this.camera.setScroll(-70,-10)

        // Forest
        this.forest = new CustomContainer(this,'forest','Лес', 250, 160)


        // Village
        this.village = this.add.image(350, 160, 'village').setScale(2);

        




        EventBus.emit('current-scene-ready', this);
    }

    changeScene ()
    {
        this.scene.start('MainMenu');
    }
}
