import { Scene } from 'phaser';
import { SCENE } from './keys';
import { emit } from '../events';
import { INITIAL_VALUES_CONFIG } from '../state/gameState';
import { getResources } from '../state/helpers/resources';

export class Preloader extends Scene {
  agr: Phaser.GameObjects.Container;
  constructor() {
    super(SCENE.Preloader);
  }

  init() {
    //  We loaded this image in our Boot Scene, so we can display it here
    this.add.image(320, 180, 'background');

    //  A simple progress bar. This is the outline of the bar.
    this.add.rectangle(320, 180, 240, 32).setStrokeStyle(1, 0xffffff);

    //  This is the progress bar itself. Left-anchored (origin 0, 0.5) so it
    //  grows from the outline's left edge inward instead of spilling out.
    const bar = this.add
      .rectangle(200, 180, 240, 28, 0xffffff)
      .setOrigin(0, 0.5);

    //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
    this.load.on('progress', (p: number) => {
      bar.width = 240 * p;
    });
  }

  preload() {
    //  Load the assets for the game - Replace with your own assets
    this.load.setPath('assets');

    // Фоны
    this.load.image('location_1_bg', 'location_1.png');

    // Спрайты
    this.load.image('forest_img', 'forest_tile.png');
    this.load.image('village_img', 'village_tile.png');
    this.load.image('house_1_img', 'house1.png');
    this.load.image('dark_tree_img', 'dark_tree.png');
    this.load.image('cave_lake', 'cave_lake.png');
    this.load.image('workshop', 'workshop.png');
    this.load.image('tent', 'tent.png');

    // Юниты
    this.load.image('necro_icon', 'necromancer_icon.png');
    this.load.image('zombie_horde_img', 'zombie_horde.png');
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    // Setup all initial values from imported config
    Object.entries(INITIAL_VALUES_CONFIG).forEach(([key, value]) => {
      this.registry.set(key, value);
    });

    // Notify the React UI (ResourceBar, etc.) about the starting resource values
    emit('resources-updated', getResources(this.registry));

    //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
    this.scene.start(SCENE.Workshop);
  }
}

