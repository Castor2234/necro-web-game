import { EventBus } from '../EventBus';
import * as Phaser from 'phaser';
import { CameraController } from '../controllers/CameraController';

const SCENE_VALUES = [
  'zombieRatsAmount',
  'ratSpeed',
  'ratCorpsesAmount',
  'lootDuration',
  'scoutDuration',
] as const;

type SceneValueKey = (typeof SCENE_VALUES)[number];

const DEFAULT_SCENE_VALUES: Record<SceneValueKey, number> = SCENE_VALUES.reduce(
  (acc, key) => {
    acc[key] = 0;
    return acc;
  },
  {} as Record<SceneValueKey, number>
);

interface VillageConfig {
  id: string;
  x: number;
  y: number;
  texture: string;
}

type Actions = 'attack' | 'loot' | 'scout';
type RatState = 'moving-to-target' | 'in-progress' | 'returning';

interface RatTask {
  action: Actions;
  villageId: string;
  targetX: number;
  targetY: number;
  state: RatState;
  timer?: number;
}

export class Location_1 extends Phaser.Scene {
  // ---Scene objects---
  necromancer: Phaser.Physics.Arcade.Sprite;
  house1: Phaser.Physics.Arcade.Sprite;
  zombieRats: Phaser.Physics.Arcade.Sprite;
  private villages: Phaser.Physics.Arcade.Sprite[] = [];
  private selectedAnchor: { x: number; y: number } | null = null;
  private ratTask: RatTask | null = null;
  private travelLine: Phaser.GameObjects.Graphics | null = null;

  private readonly villageConfigs: VillageConfig[] = [
    { id: 'village1', x: 130, y: 70, texture: 'village_img' },
    { id: 'village2', x: 40, y: 160, texture: 'village_img' },
    { id: 'village3', x: 185, y: 215, texture: 'village_img' },
  ];

  // progress bar
  private barBg: Phaser.GameObjects.Rectangle | null = null;
  private barFill: Phaser.GameObjects.Rectangle | null = null;
  private readonly BAR_WIDTH = 64;
  private readonly BAR_HEIGHT = 6;
  private readonly BAR_OFFSET_Y = 38;

  // Values sourced from the global registry
  private values: Record<SceneValueKey, number> = { ...DEFAULT_SCENE_VALUES };

  // Camera zoom and drag
  private cameraController: CameraController;

  constructor() {
    super('Location_1');
  }

  init(): void {
    this.values = SCENE_VALUES.reduce(
      (acc, key) => {
        acc[key] = this.registry.get(key) ?? 0;
        return acc;
      },
      {} as Record<SceneValueKey, number>
    );
  }

  create(): void {
    // Bg
    this.add.image(320, 180, 'location_1_bg').setDepth(-1);

    // Zoom and drag
    this.cameraController = new CameraController(this);

    // Necromancer
    this.necromancer = this.physics.add
      .staticSprite(20, 50, 'necro_icon')
      .setScale(0.5)
      .setDepth(1);
    this.necromancer.body?.setSize(0.5, 0.5);
    this.necromancer.refreshBody();

    // Villages
    this.villages = this.villageConfigs.map((cfg) => {
      const sprite = this.physics.add
        .staticSprite(cfg.x, cfg.y, cfg.texture)
        .setData('villageId', cfg.id)
        .setInteractive({ useHandCursor: true })
        .setDepth(1);

      sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!this.isCanvasClick(pointer)) return;
        this.selectVillage(sprite, pointer);
      });
      return sprite;
    });

    // Clicking empty space deselects village
    this.input.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        currentlyOver: Phaser.GameObjects.GameObject[]
      ) => {
        if (!this.isCanvasClick(pointer)) return;
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

    // Do something when rats enter any village
    this.physics.add.overlap(
      this.zombieRats,
      this.villages,
      this.handleRatVillageOverlap,
      undefined,
      this
    );

    // Do something when rats return to base
    this.physics.add.overlap(
      this.zombieRats,
      this.necromancer,
      this.handleRatNecromancerOverlap,
      undefined,
      this
    );

    EventBus.on('village-action', this.handleVillageAction, this);

    this.events.once('shutdown', () => {
      EventBus.off('village-action', this.handleVillageAction, this);
      this.cameraController.destroy();
    });
    EventBus.emit('current-scene-ready', this);
  }

  // Functions

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

  private isCanvasClick(pointer: Phaser.Input.Pointer): boolean {
    return pointer.event?.target === this.game.canvas;
  }

  private deselectVillage(): void {
    if (!this.selectedAnchor) return;
    this.selectedAnchor = null;
    EventBus.emit('village-selected', null);
  }

  private handleVillageAction = (payload: {
    action: string;
    villageId: string;
  }): void => {
    const target = this.villages.find(
      (v) => v.getData('villageId') === payload.villageId
    );
    if (!target) return;

    if (payload.action) {
      this.sendRats(payload.action as Actions, target);
    }
  };

  private sendRats(
    action: 'attack' | 'loot' | 'scout',
    target: Phaser.Physics.Arcade.Sprite
  ): void {
    this.zombieRats.setPosition(this.necromancer.x, this.necromancer.y);
    this.zombieRats.setVisible(true);

    this.ratTask = {
      action,
      villageId: target.getData('villageId') as string,
      targetX: target.x,
      targetY: target.y,
      state: 'moving-to-target',
    };

    EventBus.emit('rats-busy', true);

    this.drawTravelLine(
      this.necromancer.x,
      this.necromancer.y,
      target.x,
      target.y
    );

    this.physics.moveTo(
      this.zombieRats,
      target.x,
      target.y,
      this.values.ratSpeed
    );
  }

  private drawTravelLine(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): void {
    this.travelLine?.destroy();

    this.travelLine = this.add.graphics();
    this.travelLine.setDepth(0.5);
    this.travelLine.lineStyle(4, 0xaf0000, 0.7);
    this.travelLine.beginPath();
    this.travelLine.moveTo(fromX, fromY);
    this.travelLine.lineTo(toX, toY);
    this.travelLine.strokePath();
  }

  private handleRatVillageOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback =
    (rats, villageObj): void => {
      if (!this.ratTask || this.ratTask.state !== 'moving-to-target') return;

      const village = villageObj as Phaser.Physics.Arcade.Sprite;
      const villageId = village.getData('villageId') as string;

      // Make sure this is the village the rats were actually sent to
      // (avoids stopping early if they clip past a different village en route)
      if (villageId !== this.ratTask.villageId) return;

      const ratsSprite = rats as Phaser.Physics.Arcade.Sprite;
      const body = ratsSprite.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      ratsSprite.setVisible(false);
      this.travelLine?.destroy();
      this.travelLine = null;

      switch (this.ratTask.action) {
        case 'attack':
          this.resolveAttack(this.ratTask.villageId);
          this.ratTask = null;
          EventBus.emit('rats-busy', false);
          break;

        case 'loot':
          this.ratTask.state = 'in-progress';
          this.ratTask.timer = this.values.lootDuration;
          this.createProgressBar(village.x, village.y);
          break;

        case 'scout':
          this.ratTask.state = 'in-progress';
          this.ratTask.timer = this.values.scoutDuration;
          this.createProgressBar(village.x, village.y);
          break;
      }
    };

  private handleRatNecromancerOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback =
    (): void => {
      if (!this.ratTask || this.ratTask.state !== 'returning') return;

      const body = this.zombieRats.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      this.zombieRats.setVisible(false);
      this.travelLine?.destroy();
      this.travelLine = null;

      EventBus.emit('rats-returned', { villageId: this.ratTask.villageId });
      this.ratTask = null;
      EventBus.emit('rats-busy', false);
    };

  private createProgressBar(x: number, y: number): void {
    const barY = y + this.BAR_OFFSET_Y;

    this.barBg = this.add
      .rectangle(x, barY, this.BAR_WIDTH, this.BAR_HEIGHT, 0x000000, 0.7)
      .setOrigin(0.5, 0.5)
      .setDepth(20);

    this.barFill = this.add
      .rectangle(
        x - this.BAR_WIDTH / 2,
        barY,
        this.BAR_WIDTH,
        this.BAR_HEIGHT,
        0xb48e11,
        1
      )
      .setOrigin(0, 0.5)
      .setDepth(21)
      .setScale(0, 1);
  }

  private getActionDuration(action: Actions): number {
    switch (action) {
      case 'loot':
        return this.values.lootDuration;
      case 'scout':
        return this.values.scoutDuration;
      default:
        return 0; // 'attack' resolves instantly, no timer needed
    }
  }

  private resolveAttack(villageId: string): void {
    EventBus.emit('village-attacked', { villageId });
  }

  private resolveLoot(villageId: string): void {
    EventBus.emit('village-looted', {
      villageId,
      corpses: this.values.ratCorpsesAmount,
    });
  }

  private resolveScout(villageId: string): void {
    EventBus.emit('village-scouted', { villageId });
  }

  update(_time: number, delta: number): void {
    // Village ui position
    if (this.selectedAnchor) {
      const { x, y } = this.cameraController.worldToScreen(
        this.selectedAnchor.x,
        this.selectedAnchor.y
      );
      EventBus.emit('village-ui-position', { x, y });
    }

    if (!this.ratTask) return;

    if (
      this.ratTask.state === 'moving-to-target' ||
      this.ratTask.state === 'returning'
    ) {
      const otherSprite =
        this.ratTask.state === 'moving-to-target'
          ? this.villages.find(
              (v) => v.getData('villageId') === this.ratTask!.villageId
            )
          : this.necromancer;

      if (otherSprite) {
        this.drawTravelLine(
          this.zombieRats.x,
          this.zombieRats.y,
          otherSprite.x,
          otherSprite.y
        );
      }
    }

    if (this.ratTask.state === 'in-progress') {
      this.ratTask.timer! -= delta;
      const duration = this.getActionDuration(this.ratTask.action);

      if (this.barFill && duration > 0) {
        const progress = 1 - Math.max(this.ratTask.timer!, 0) / duration;
        this.barFill.scaleX = progress;
      }

      if (this.ratTask.timer! <= 0) {
        switch (this.ratTask.action) {
          case 'loot':
            this.resolveLoot(this.ratTask.villageId);
            break;
          case 'scout':
            this.resolveScout(this.ratTask.villageId);
            break;
        }

        this.barBg?.destroy();
        this.barFill?.destroy();
        this.barBg = null;
        this.barFill = null;

        this.ratTask.state = 'returning';
        this.zombieRats.setVisible(true);

        this.drawTravelLine(
          this.ratTask.targetX,
          this.ratTask.targetY,
          this.necromancer.x,
          this.necromancer.y
        );

        this.physics.moveTo(
          this.zombieRats,
          this.necromancer.x,
          this.necromancer.y,
          this.values.ratSpeed
        );
      }
    }
  }
}

