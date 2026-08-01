import { Scene } from 'phaser';

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

    // Initial values
    this.registry.set('score', 0);
  }

  preload() {
    //  Load the assets for the game - Replace with your own assets
    this.load.setPath('assets');

    // Фоны
    this.load.image('location_1', 'location_1.png');

    // Спрайты
    this.load.image('forest', 'forest_tile.png');
    this.load.image('village', 'village_tile.png');
    this.load.image('dark_tree', 'dark_tree.png');

    // Юниты
    this.load.image('necro_icon', 'necromancer_icon.png');
    this.load.image('zombie_horde', 'zombie_horde.png');
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
    this.scene.start('MainMenu');
  }
}

