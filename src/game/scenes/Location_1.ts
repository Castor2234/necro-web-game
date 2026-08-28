import * as Phaser from 'phaser';
import { SCENE } from './keys';
import { emit, on, off } from '../events';
import type { VillageAction } from '../events';
import { CameraController } from '../controllers/CameraController';
import { getStat, setStat } from '../state/gameState';
import { addResources } from '../state/helpers/resources';

const SCENE_VALUES = [
  'zombieRatsAmount',
  'ratSpeed',
  'ratPower',
  'lootDuration',
  'scoutDuration',
  'village1Population',
  'village2Population',
  'village3Population',
  'ratCorpses',
  'humanCorpses',
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
  maxPopulation: number;
  growthRate: number;
}

type Actions = VillageAction;
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
  private populationLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private villageAnchor: { x: number; y: number } | null = null;
  private necroAnchor: { x: number; y: number } | null = null;
  private ratTask: RatTask | null = null;
  private travelLine: Phaser.GameObjects.Graphics | null = null;

  private readonly villageConfigs: VillageConfig[] = [
    {
      id: 'village1',
      x: 130,
      y: 70,
      texture: 'village_img',
      maxPopulation: 300,
      growthRate: 0.02,
    },
    {
      id: 'village2',
      x: 40,
      y: 160,
      texture: 'village_img',
      maxPopulation: 700,
      growthRate: 0.04,
    },
    {
      id: 'village3',
      x: 185,
      y: 215,
      texture: 'village_img',
      maxPopulation: 2000,
      growthRate: 0.05,
    },
  ];

  private readonly DECAY_BASE_CHANCE = 0.2;
  private readonly DECAY_OVERFLOW_MULTIPLIER = 3; // how much decay chance spikes when over max
  private readonly DECAY_PERCENT_MIN = 0.01;
  private readonly DECAY_PERCENT_MAX = 0.06;

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
    super(SCENE.Location_1);
  }

  init(): void {
    this.values = SCENE_VALUES.reduce(
      (acc, key) => {
        acc[key] = getStat(this.registry, key);
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
      .setDepth(1);
    this.necromancer.setInteractive({ useHandCursor: true });
    this.necromancer
      .on('pointerover', () => {
        this.necromancer.setScale(1.1);
      })
      .on('pointerout', () => {
        this.necromancer.setScale(1.0);
      })
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!this.isCanvasClick(pointer)) return;
        this.selectNecromancer(pointer);
      });

    // Villages
    this.villages = this.villageConfigs.map((cfg) => {
      const sprite = this.physics.add
        .staticSprite(cfg.x, cfg.y, cfg.texture)
        .setData('villageId', cfg.id)
        .setData('maxPopulation', cfg.maxPopulation)
        .setData('growthRate', cfg.growthRate)
        .setInteractive({ useHandCursor: true })
        .setDepth(1);

      // --- Hover Enlarge Logic ---
      sprite.on('pointerover', () => {
        sprite.setScale(1.1);
      });

      sprite.on('pointerout', () => {
        sprite.setScale(1.0);
      });
      // ---------------------------

      sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!this.isCanvasClick(pointer)) return;
        this.selectVillage(sprite, pointer);
      });
      return sprite;
    });

    // Population labels — one per village, positioned just above each sprite
    this.villages.forEach((village) => {
      const villageId = village.getData('villageId') as string;

      const label = this.add
        .text(village.x, village.y - 28, `???`, {
          fontFamily: 'Alagard',
          fontSize: '20px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
        })
        .setOrigin(0.5, 1)
        .setDepth(22);

      this.populationLabels.set(villageId, label);
    });

    // Clicking empty space deselects
    this.input.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        currentlyOver: Phaser.GameObjects.GameObject[]
      ) => {
        if (!this.isCanvasClick(pointer)) return;
        if (currentlyOver.length === 0) {
          this.deselectVillage();
          this.deselectNecromancer();
        }
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

    on('village-action', this.handleVillageAction, this);

    this.events.once('shutdown', () => {
      off('village-action', this.handleVillageAction, this);
      this.cameraController.destroy();
      this.travelLine?.destroy();
      this.populationLabels.forEach((label) => label.destroy());
      this.populationLabels.clear();
    });
    emit('current-scene-ready', this);
  }

  // Functions

  // Necro functions
  private selectNecromancer(pointer: Phaser.Input.Pointer): void {
    this.deselectVillage();
    this.necroAnchor = { x: pointer.worldX, y: pointer.worldY };
    emit('necromancer-selected', true);
    // Push the initial menu position right away; update() re-syncs on camera movement.
    this.emitAnchorPosition('necromancer-ui-position', this.necroAnchor);
  }

  private deselectNecromancer(): void {
    if (!this.necroAnchor) return;
    this.necroAnchor = null;
    emit('necromancer-selected', false);
  }

  // Village functons
  private selectVillage(
    sprite: Phaser.Physics.Arcade.Sprite,
    pointer: Phaser.Input.Pointer
  ): void {
    this.deselectNecromancer();
    // pointer.worldX/worldY = click position already converted to world space
    // (accounts for current scroll/zoom at click time)
    this.villageAnchor = { x: pointer.worldX, y: pointer.worldY };
    emit('village-selected', {
      id: sprite.getData('villageId') as string,
    });
    this.emitAnchorPosition('village-ui-position', this.villageAnchor);
  }

  private isCanvasClick(pointer: Phaser.Input.Pointer): boolean {
    return pointer.event?.target === this.game.canvas;
  }

  private emitAnchorPosition(
    event: 'village-ui-position' | 'necromancer-ui-position',
    anchor: { x: number; y: number }
  ): void {
    const { x, y } = this.cameraController.worldToScreen(anchor.x, anchor.y);
    emit(event, { x, y });
  }

  private deselectVillage(): void {
    if (!this.villageAnchor) return;
    this.villageAnchor = null;
    emit('village-selected', null);
  }

  private getVillagePopulation(villageId: string): number {
    const key = `${villageId}Population` as SceneValueKey;
    return this.values[key] ?? 0;
  }

  private setVillagePopulation(villageId: string, value: number): void {
    const key = `${villageId}Population` as SceneValueKey;
    const population = Math.max(0, value);
    this.values[key] = population;
    // Keep the registry in sync so population persists across scene switches
    setStat(this.registry, key, population);
  }

  private handleVillageAction = (payload: {
    action: VillageAction;
    villageId: string;
  }): void => {
    const target = this.villages.find(
      (v) => v.getData('villageId') === payload.villageId
    );
    if (!target) return;

    this.sendRats(payload.action, target);
  };

  // Rats functions
  private sendRats(
    action: Actions,
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

    emit('rats-busy', true);

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
          emit('rats-busy', false);
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

      emit('rats-returned', { villageId: this.ratTask.villageId });
      this.ratTask = null;
      emit('rats-busy', false);
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
    // Attack strength = deployed zombie rats × their power.
    // Each villager killed yields a human corpse and lowers the village population.
    // TODO: balance pass — currently rats take no losses.
    const strength = this.values.zombieRatsAmount * this.values.ratPower;
    const population = this.getVillagePopulation(villageId);
    const kills = Math.min(Math.trunc(population), Math.max(0, strength));

    if (kills > 0) {
      this.setVillagePopulation(villageId, population - kills);
      addResources(this.registry, { humanCorpses: kills });
    }

    emit('village-attacked', { villageId, kills });
  }

  private resolveLoot(villageId: string): void {
    const looted = Phaser.Math.Between(0, 2);
    addResources(this.registry, { ratCorpses: looted });
    emit('village-looted', {
      villageId,
      lootedCorpses: looted,
    });
  }

  private resolveScout(villageId: string): void {
    emit('village-scouted', { villageId });

    const population = this.getVillagePopulation(villageId);

    const label = this.populationLabels.get(villageId);
    label?.setText(`${Math.trunc(population)}`);
  }

  // Grow functions and update
  private populationGrowthAccumulator = 0;

  update(_time: number, delta: number): void {
    // Menu anchors only need re-syncing while the camera is actually moving
    if (this.cameraController.hasCameraChanged()) {
      if (this.villageAnchor) {
        this.emitAnchorPosition('village-ui-position', this.villageAnchor);
      }
      if (this.necroAnchor) {
        this.emitAnchorPosition('necromancer-ui-position', this.necroAnchor);
      }
    }

    // Rat tasks
    if (this.ratTask) {
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
    this.populationGrowthAccumulator += delta;
    if (this.populationGrowthAccumulator >= 5000) {
      this.populationGrowthAccumulator -= 5000; // keep remainder, avoids drift over time
      this.growVillagePopulation();
    }
  }

  private growVillagePopulation(): void {
    //console.log('--------------');
    this.villages.forEach((village) => {
      const villageId = village.getData('villageId') as string;
      const maxPopulation = village.getData('maxPopulation') as number;
      const rate = village.getData('growthRate') as number;
      if (maxPopulation <= 0 || rate <= 0) return;

      const key = `${villageId}Population` as SceneValueKey;
      let current = this.values[key] ?? 0;
      //console.log(this.values[key]);

      // Logistic growth — naturally slows near maxPopulation, reverses (shrinks) above it
      const growth = rate * current * (1 - current / maxPopulation);
      current = Math.max(current + growth, 0); // only floor at 0, no ceiling

      // Decay — occasional extra dip, chance scales with how far above target
      const decayChance = this.getDecayChance(current, maxPopulation);
      if (Math.random() < decayChance) {
        const decayPercent = Phaser.Math.FloatBetween(
          this.DECAY_PERCENT_MIN,
          this.DECAY_PERCENT_MAX
        );
        const loss = current * decayPercent;
        current = Math.max(current - loss, 0);
      }

      this.setVillagePopulation(villageId, current);
    });
  }

  private getDecayChance(current: number, maxPopulation: number): number {
    if (maxPopulation <= 0) return this.DECAY_BASE_CHANCE;

    const overflowRatio = Math.max(0, current - maxPopulation) / maxPopulation;
    return (
      this.DECAY_BASE_CHANCE *
      (1 + overflowRatio * this.DECAY_OVERFLOW_MULTIPLIER)
    );
  }
}

