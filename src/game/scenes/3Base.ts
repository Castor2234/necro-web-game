import { EventBus } from '../EventBus';
import * as Phaser from 'phaser';
import { CameraController } from '../controllers/CameraController';

export class Base extends Phaser.Scene {
  // Scene setup
  background: Phaser.GameObjects.Image;
  gameText: Phaser.GameObjects.Text;
  camera: Phaser.Cameras.Scene2D.Camera;
  cameraController: CameraController;

  constructor() {
    super('Base');
  }

  init(_data: number): void {
    //this.registry.set('score', 0)
  }

  create(): void {
    // Bg
    this.background = this.add.image(320, 180, 'background').setDepth(-1);

    // Scene title
    this.gameText = this.add
      .text(220, 50, 'Сцена базы', {
        fontFamily: 'Arial Black',
        fontSize: 32,
        color: '#b98ba0',
        stroke: '#000000',
        strokeThickness: 2,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(100);

    // Zoom and drag
    this.cameraController = new CameraController(this);
    this.events.once('shutdown', () => this.cameraController.destroy());

    EventBus.emit('current-scene-ready', this);
  }
}

