import * as Phaser from 'phaser';
import { SCENE } from './keys';
import { emit, on, off } from '../events';
import { clearSavedGame, resetGameState } from '../state/save';
import { getResources } from '../state/helpers/resources';

export class MainMenu extends Phaser.Scene {
  background: Phaser.GameObjects.Image;

  constructor() {
    super(SCENE.MainMenu);
  }

  create() {
    // Делаем фон и затемняем
    this.background = this.add.image(320, 180, 'background');
    this.background.setAlpha(0.5);

    on('reset-game', this.handleResetGame, this);
    this.events.once('shutdown', () => {
      off('reset-game', this.handleResetGame, this);
    });

    // Сцена готова к использованию
    emit('current-scene-ready', this);
  }

  /** Wipes the save file and resets every stat back to its initial value. */
  private handleResetGame(): void {
    clearSavedGame();
    resetGameState(this.registry);

    // Re-sync any live UI with the reset values.
    emit('resources-updated', getResources(this.registry));
    emit('creature-stats-changed');
  }
}

