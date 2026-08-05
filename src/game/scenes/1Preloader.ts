import { Scene } from 'phaser';
import { INITIAL_VALUES_CONFIG } from '../VALUES_CONFIG';

export class Preloader extends Scene {
  agr: Phaser.GameObjects.Container;
  constructor() {
    super('Preloader');
  }

  init() {
    //  We loaded this image in our Boot Scene, so we can display it here
    this.add.image(320, 180, 'background');

    //  A simple progress bar. This is the outline of the bar.
    this.add.rectangle(320, 180, 240, 32).setStrokeStyle(1, 0xffffff);

    //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
    const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

    //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
    this.load.on('progress', (progress: number) => {
      //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
      bar.width = 4 + 236 * progress;
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

    // Юниты
    this.load.image('necro_icon', 'necromancer_icon.png');
    this.load.image('zombie_horde_img', 'zombie_horde.png');
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    // Setup initial values from imported config
    for (const [stat, value] of Object.entries(INITIAL_VALUES_CONFIG) as [
      string,
      number,
    ][]) {
      this.registry.set(stat, value);
    }

    //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
    this.scene.start('Location_1');
  }
}

