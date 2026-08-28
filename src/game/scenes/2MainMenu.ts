import * as Phaser from 'phaser';
import { SCENE } from './keys';
import { emit } from '../events';

export class MainMenu extends Phaser.Scene {
  background: Phaser.GameObjects.Image;

  constructor() {
    super(SCENE.MainMenu);
  }

  create() {
    // Делаем фон и затемняем
    this.background = this.add.image(320, 180, 'background');
    this.background.setAlpha(0.5);

    // Сцена готова к использованию
    emit('current-scene-ready', this);
  }
}

