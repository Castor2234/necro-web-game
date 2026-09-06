import * as Phaser from 'phaser';
import { SCENE } from '../helpers/keys';
import { emit } from '../helpers/events';
import { emitConversionUiState, refreshUpgradeState } from '../state/worldSim';

/**
 * The Workshop now only hosts the conversion + upgrade UI. The actual
 * simulation (queue advancement, completions, purchases) lives in WorldSim and
 * keeps running while the player is in any other scene. On entering, this
 * scene re-broadcasts the current sim state so the React overlay renders the
 * real queue/upgrade list immediately.
 */
export class Workshop extends Phaser.Scene {
  background: Phaser.GameObjects.Image;
  treeImg: Phaser.GameObjects.Image;

  constructor() {
    super(SCENE.Workshop);
  }

  create(): void {
    this.background = this.add.image(320, 180, 'inside_workshop').setDepth(-1);

    this.treeImg = this.add.image(550, 150, 'dark_tree');

    // Publish the live conversion queue + upgrade state to the React overlay
    // (the sim may have advanced while we were away).
    emitConversionUiState();
    refreshUpgradeState();

    emit('current-scene-ready', this);
  }
}
