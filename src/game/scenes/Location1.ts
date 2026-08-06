import { EventBus } from '../EventBus';
import * as Phaser from 'phaser';
import { CameraController } from '../controllers/CameraController';

export class Location_1 extends Phaser.Scene {
  // ---Scene objects---
  necromancer: Phaser.Physics.Arcade.Sprite;
  house1: Phaser.Physics.Arcade.Sprite;
  village1: Phaser.Physics.Arcade.Sprite;
  village2: Phaser.Physics.Arcade.Sprite;
  zombieRats: Phaser.Physics.Arcade.Sprite;

  // Camera zoom and drag
  private cameraController: CameraController;

  // Values sourced from the global registry
  private zombieRatsAmount = 0;
  private ratSpeed = 0;
  private ratCorpsesAmount = 0;
  private lootDuration = 0;

  // Prevent multiple loot triggers
  private isLooting = false;
  private lootCollider?: Phaser.Physics.Arcade.Collider;

  constructor() {
    super('Location_1');
  }

  init(): void {
    this.zombieRatsAmount = this.registry.get('zombieRatsAmount') ?? 0;
    this.ratSpeed = this.registry.get('ratSpeed') ?? 0;
    this.ratCorpsesAmount = this.registry.get('ratCorpsesAmount') ?? 0;
    this.lootDuration = this.registry.get('lootDuration') ?? 0;
  }

  create(): void {
    // Bg
    this.add.image(320, 180, 'location_1_bg').setDepth(-1);

    // Zoom and drag
    this.cameraController = new CameraController(this);
    this.events.once('shutdown', () => this.cameraController.destroy());

    // Necromancer
    this.necromancer = this.physics.add
      .staticSprite(20, 50, 'necro_icon')
      .setScale(0.5);
    this.necromancer.body?.setSize(0.5, 0.5);
    this.necromancer.refreshBody();

    // Villages
    this.village1 = this.physics.add
      .staticSprite(130, 70, 'village_img')
      .setInteractive()
      .on('pointerdown', () => this.lootVillage(this.village1));

    this.village2 = this.physics.add.sprite(40, 160, 'village_img');

    // Houses
    this.house1 = this.physics.add.sprite(350, 160, 'house_1_img');

    // Rats
    this.zombieRats = this.physics.add
      .sprite(this.necromancer.x, this.necromancer.y, 'zombie_horde_img')
      .setScale(0.5);
    this.zombieRats.setVisible(false);

    EventBus.emit('current-scene-ready', this);
  }

  lootVillage(target: Phaser.Physics.Arcade.Sprite) {
    if (this.isLooting) return;
    this.isLooting = true;

    this.zombieRats.setVisible(true);

    // Visual line
    const graphics = this.add.graphics();
    graphics.lineStyle(4, 0xff0000, 0.5);
    graphics.lineBetween(
      this.zombieRats.x,
      this.zombieRats.y,
      target.x,
      target.y
    );
    graphics.setDepth(-0.5); // за крысами, но перед фоном

    // Move zombieRats to village
    this.physics.moveToObject(this.zombieRats, target, this.ratSpeed);

    // One-time collider
    this.lootCollider = this.physics.add.collider(
      this.zombieRats,
      target,
      () => {
        const ratsBody = this.zombieRats.body as Phaser.Physics.Arcade.Body;
        ratsBody.stop();

        // Hide rats, destroy line
        this.zombieRats.setVisible(false);
        graphics.destroy();

        // Tell React to show the progress bar
        EventBus.emit('village-loot-started', {
          duration: this.lootDuration,
          x: target.x,
          y: target.y,
        });

        // Phaser handles the actual game timer
        this.time.delayedCall(this.lootDuration, () => {
          this.isLooting = false;

          // Actual loot logic here
          this.handleLootComplete(target);

          // Tell React to hide the progress bar
          EventBus.emit('village-loot-finished');
        });
      }
    );
  }

  private handleLootComplete(target: Phaser.Physics.Arcade.Sprite) {
    console.log('Loot complete!');
    // e.g. add resources, play sound, destroy village, etc.
    this.zombieRats.setVisible(true);
    // Move zombieRats to necro
    this.physics.moveToObject(this.zombieRats, this.necromancer, this.ratSpeed);
    this.physics.add.collider(this.zombieRats, this.necromancer, () => {
      this.zombieRats.body?.stop();
      this.zombieRats.setVisible(false);
    });
  }
}

