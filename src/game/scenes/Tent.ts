import * as Phaser from 'phaser';
import { SCENE } from './keys';
import { emit } from '../events';

export class Tent extends Phaser.Scene {
  background: Phaser.GameObjects.Image;

  constructor() {
    super(SCENE.Tent);
  }

  create() {
    // Делаем фон и затемняем
    this.background = this.add.image(320, 180, 'background');
    this.background.setAlpha(0.7);

    // Сцена готова к использованию
    emit('current-scene-ready', this);
  }
}

