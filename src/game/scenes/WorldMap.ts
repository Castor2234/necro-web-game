import { EventBus } from '../EventBus';
import * as Phaser from 'phaser';
import { EntityContainer } from '../objects/EntityContainer';

export class WorldMap extends Phaser.Scene {
  // Scene setup
  background: Phaser.GameObjects.Image;
  gameText: Phaser.GameObjects.Text;
  camera: Phaser.Cameras.Scene2D.Camera;

  // Containers
  forestBase: EntityContainer;
  village1: EntityContainer;

  // Starting values
  private ratSpeed = 400;
  private v1pw = 50;

  constructor() {
    super('WorldMap');
  }

  public init(data: number): void {
    // this.score = data.score || 0;
  }

  public create(): void {
    // Bg
    this.background = this.add.image(320, 180, 'background').setDepth(-1);

    // Scene title (Карта пока что показывается в зуме x2)
    this.gameText = this.add
      .text(220, 50, 'Карта мира', {
        fontFamily: 'Pixelify Sans',
        fontSize: 32,
        color: '#b98ba0',
        stroke: '#000000',
        strokeThickness: 2,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(100);

    // Camera
    this.camera = this.cameras.main;
    this.camera.setZoom(1);

    // Forest Base
    this.forestBase = new EntityContainer(
      this,
      'forest',
      'Вернуться на базу',
      160,
      140
    );
    this.forestBase
      .setInteractive(
        new Phaser.Geom.Circle(0, 0, this.forestBase.getRadius()),
        Phaser.Geom.Circle.Contains
      )
      .on('pointerover', () => {
        this.forestBase.setScale(1.1);
        this.forestBase.setAlpha(0.95);
        this.forestBase.updateLabelColor('rgb(23, 252, 72)');
      })
      .on('pointerout', () => {
        this.forestBase.setScale(1);
        this.forestBase.setAlpha(1);
        this.forestBase.updateLabelColor('rgb(255,255,255)');
      })
      .on('pointerdown', () => {
        this.scene.start('Base');
      });

    // Village 1
    this.village1 = new EntityContainer(
      this,
      'village',
      'Атаковать деревню',
      280,
      140
    );
    this.village1
      .setInteractive(
        new Phaser.Geom.Circle(0, 0, this.forestBase.getRadius()),
        Phaser.Geom.Circle.Contains
      )
      .on('pointerover', () => {
        this.village1.setScale(1.1);
        this.village1.setAlpha(0.95);
        this.village1.updateLabelColor('rgb(161, 19, 19)');
      })
      .on('pointerout', () => {
        this.village1.setScale(1);
        this.village1.setAlpha(1);
        this.village1.updateLabelColor('rgb(255,255,255)');
      })
      .on('pointerdown', () => {
        this.scene.start('Base');
      });

    EventBus.emit('current-scene-ready', this);
  }

  changeScene() {
    this.scene.start('MainMenu');
  }
}

