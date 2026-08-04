import { EventBus } from '../EventBus';
import * as Phaser from 'phaser';
import { CameraController } from '../controllers/CameraController';

export class Location_1 extends Phaser.Scene {
  // Scene setup
  necromancer: Phaser.GameObjects.Image;
  house1: Phaser.GameObjects.Image;
  village1: Phaser.GameObjects.Image;
  village3: Phaser.GameObjects.Image;

  // Camera zoom and drag
  private cameraController: CameraController;

  // Values sourced from the global registry
  private ratSpeed = 0;
  private village1Power = 0;

  constructor() {
    super('Location_1');
  }

  init(): void {
    this.village1Power = this.registry.get('village1Power') ?? 0;
    this.ratSpeed = this.registry.get('ratSpeed') ?? 0;
  }

  create(): void {
    // Bg
    this.add.image(320, 180, 'location_1_bg').setDepth(-1);

    // Zoom and drag
    this.cameraController = new CameraController(this);
    this.events.once('shutdown', () => this.cameraController.destroy());

    // Necromancer
    this.necromancer = this.add.image(20, 50, 'necro_icon').setScale(0.5);

    // Houses
    this.house1 = this.add.image(60, 150, 'house_1_img');

    // Villages
    this.village1 = this.add.image(130, 70, 'village_img').setScale(2);
    this.village3 = this.add.image(185, 215, 'village_img').setScale(2);

    EventBus.emit('current-scene-ready', this);
  }
}

