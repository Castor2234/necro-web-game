import * as Phaser from 'phaser';
import { SCENE } from '../helpers/keys';
import { emit } from '../helpers/events';

export class Tent extends Phaser.Scene {
  background: Phaser.GameObjects.Image;

  constructor() {
    super(SCENE.Tent);
  }

  create() {
    // Делаем фон и затемняем
    this.background = this.add.image(320, 180, 'inside_tent');

    // Сцена готова к использованию
    emit('current-scene-ready', this);
  }
}

