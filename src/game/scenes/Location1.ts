import { EventBus } from '../EventBus';
import * as Phaser from 'phaser';
import { EntityContainer } from '../objects/EntityContainer';

const LOCATION_1_CONFIG = {
  ratSpeed: 400,
  village1Power: 50,
} as const;

export class Location_1 extends Phaser.Scene {
  // Scene setup
  background: Phaser.GameObjects.Image;
  gameText: Phaser.GameObjects.Text;
  camera: Phaser.Cameras.Scene2D.Camera;

  // Containers
  village1: EntityContainer;

  // Starting values
  private ratSpeed = LOCATION_1_CONFIG.ratSpeed;
  private village1power = LOCATION_1_CONFIG.village1Power;

  constructor() {
    super('Location_1');
  }

  init(): void {}

  create(): void {
    // Bg
    this.background = this.add.image(320, 180, 'location_1_bg').setDepth(-1);

    // Scene title (Карта пока что показывается в зуме x2)
    this.gameText = this.add
      .text(220, 50, 'Первая локация', {
        fontFamily: 'Pixelify Sans',
        fontSize: 32,
        color: '#b98ba0',
        stroke: '#000000',
        strokeThickness: 2,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(100);

    EventBus.emit('current-scene-ready', this);
  }
}

