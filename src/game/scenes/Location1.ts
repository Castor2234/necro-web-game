import { EventBus } from '../EventBus';
import * as Phaser from 'phaser';
import { CameraController } from '../controllers/CameraController';

interface VillageConfig {
  id: string;
  x: number;
  y: number;
  texture: string;
}

interface RatTask {
  type: 'attack' | 'loot' | 'scout';
  x: number;
  y: number;
  villageId: string;
}

export class Location_1 extends Phaser.Scene {
  // ---Scene objects---
  necromancer: Phaser.Physics.Arcade.Sprite;
  house1: Phaser.Physics.Arcade.Sprite;
  zombieRats: Phaser.Physics.Arcade.Sprite;
  private villages: Phaser.Physics.Arcade.Sprite[] = [];
  private selectedAnchor: { x: number; y: number } | null = null;
  private ratTask: RatTask | null = null;

  private readonly villageConfigs: VillageConfig[] = [
    { id: 'village1', x: 130, y: 70, texture: 'village_img' },
    { id: 'village2', x: 40, y: 160, texture: 'village_img' },
  ];

  // Values sourced from the global registry
  private zombieRatsAmount = 0;
  private ratSpeed = 0;
  private ratCorpsesAmount = 0;
  private lootDuration = 0;

  // Camera zoom and drag
  private cameraController: CameraController;

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

    // Necromancer
    this.necromancer = this.physics.add
      .staticSprite(20, 50, 'necro_icon')
      .setScale(0.5);
    this.necromancer.body?.setSize(0.5, 0.5);
    this.necromancer.refreshBody();

    // Villages
    this.villages = this.villageConfigs.map((cfg) => {
      const sprite = this.physics.add
        .staticSprite(cfg.x, cfg.y, cfg.texture)
        .setData('villageId', cfg.id)
        .setInteractive({ useHandCursor: true });

      sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) =>
        this.selectVillage(sprite, pointer)
      );
      return sprite;
    });

    // Clicking empty space deselects
    this.input.on(
      'pointerdown',
      (
        _p: Phaser.Input.Pointer,
        currentlyOver: Phaser.GameObjects.GameObject[]
      ) => {
        if (currentlyOver.length === 0) this.deselectVillage();
      }
    );

    // Houses
    this.house1 = this.physics.add.sprite(350, 160, 'house_1_img');

    // Rats
    this.zombieRats = this.physics.add
      .sprite(this.necromancer.x, this.necromancer.y, 'zombie_horde_img')
      .setScale(0.5);
    this.zombieRats.setVisible(false);

    EventBus.on('village-action', this.handleVillageAction, this);

    this.events.once('shutdown', () => {
      EventBus.off('village-action', this.handleVillageAction, this);
      this.events.once('shutdown', () => this.cameraController.destroy());
    });
    EventBus.emit('current-scene-ready', this);
  }

  private selectVillage(
    sprite: Phaser.Physics.Arcade.Sprite,
    pointer: Phaser.Input.Pointer
  ): void {
    // pointer.worldX/worldY = click position already converted to world space
    // (accounts for current scroll/zoom at click time)
    this.selectedAnchor = { x: pointer.worldX, y: pointer.worldY };
    EventBus.emit('village-selected', {
      id: sprite.getData('villageId') as string,
    });
  }

  private deselectVillage(): void {
    if (!this.selectedAnchor) return;
    this.selectedAnchor = null;
    EventBus.emit('village-selected', null);
  }

  private handleVillageAction = (payload: {
    type: string;
    villageId: string;
  }): void => {
    const target = this.villages.find(
      (v) => v.getData('villageId') === payload.villageId
    );
    if (!target) return;

    if (payload.type === 'attack') {
      this.sendRats('attack', target);
    } else if (payload.type === 'loot') {
      this.sendRats('loot', target);
    } else if (payload.type === 'scout') {
      this.sendRats('scout', target);
    }
  };

  private sendRats(
    type: 'attack' | 'loot' | 'scout',
    target: Phaser.Physics.Arcade.Sprite
  ): void {
    this.zombieRats.setVisible(true);
    this.zombieRats.setPosition(this.necromancer.x, this.necromancer.y);

    this.ratTask = {
      type,
      x: target.x,
      y: target.y,
      villageId: target.getData('villageId') as string,
    };

    const speed = this.ratSpeed || 60;
    this.physics.moveTo(this.zombieRats, target.x, target.y, speed);
  }

  update(): void {
    if (!this.selectedAnchor) return;
    const { x, y } = this.cameraController.worldToScreen(
      this.selectedAnchor.x,
      this.selectedAnchor.y
    );

    EventBus.emit('village-ui-position', { x, y });
  }
}

