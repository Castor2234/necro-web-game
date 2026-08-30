import * as Phaser from 'phaser';
import { SCENE } from '../helpers/keys';
import { emit, on, off } from '../helpers/events';
import type { VillageAction } from '../helpers/events';
import { CameraController } from '../controllers/CameraController';
import { getStat, setStat } from '../state/gameState';
import type { GameState } from '../state/gameState';
import { addResources } from '../state/secondary/resources';
import {
  getRatTaskSaveData,
  setRatTaskSaveData,
} from '../state/save';

/** Village ids, matching the `village{N}Population` registry keys. */
type VillageId = 'village1' | 'village2' | 'village3';

/** Maps a village id to its persisted population stat key. */
const VILLAGE_POPULATION_KEYS: Record<VillageId, keyof GameState> = {
  village1: 'village1Population',
  village2: 'village2Population',
  village3: 'village3Population',
};

const isVillageId = (value: string): value is VillageId =>
  value in VILLAGE_POPULATION_KEYS;

interface VillageConfig {
  id: VillageId;
  x: number;
  y: number;
  texture: string;
  maxPopulation: number;
  growthRate: number;
}

/** The single in-flight rat raid. The timer exists only while 'in-progress',
 *  which makes the old `timer!` assertions unnecessary. */
type RatTask =
  | {
      action: VillageAction;
      villageId: VillageId;
      targetX: number;
      targetY: number;
      state: 'moving-to-target' | 'returning';
    }
  | {
      action: VillageAction;
      villageId: VillageId;
      targetX: number;
      targetY: number;
      state: 'in-progress';
      timer: number;
    };

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
  private readonly DECAY_PERCENT_MIN = 0.01;
  private readonly DECAY_PERCENT_MAX = 0.06;

  /** How often each village's population ticks while this scene is active. */
  private readonly POPULATION_GROWTH_INTERVAL_MS = 5000;

  // progress bar
  private barBg: Phaser.GameObjects.Rectangle | null = null;
  private barFill: Phaser.GameObjects.Rectangle | null = null;
  private readonly BAR_WIDTH = 64;
  private readonly BAR_HEIGHT = 6;
  private readonly BAR_OFFSET_Y = 38;

  // Camera zoom and drag
  private cameraController: CameraController;

  constructor() {
    super(SCENE.Location_1);
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
        this.selectNecromancer();
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
        this.selectVillage(sprite);
      });
      return sprite;
    });

    // Population labels one per village, positioned just above each sprite
    this.villages.forEach((village) => {
      const villageId = village.getData('villageId') as VillageId;

      const label = this.add
        .text(village.x, village.y - 28, '???', {
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

    // The overlaps are owned by this scene's Arcade World, which tears its
    // colliders down on shutdown (ArcadePhysics.shutdown -> World.shutdown ->
    // colliders.destroy()), so no manual cleanup is needed here.
    this.physics.add.overlap(
      this.zombieRats,
      this.villages,
      this.handleRatVillageOverlap,
      undefined,
      this
    );

    this.physics.add.overlap(
      this.zombieRats,
      this.necromancer,
      this.handleRatNecromancerOverlap,
      undefined,
      this
    );

    on('village-action', this.handleVillageAction, this);

    // Resume a raid that was in flight when the player left the scene. Keeps
    // the same horde position, timer and destination so it is not lost.
    this.restoreRatTask();

    this.events.once('shutdown', () => {
      off('village-action', this.handleVillageAction, this);
      // Persist the current raid so it survives switching to another scene.
      this.syncRatTaskSaveData();
      this.cameraController.destroy();
      this.travelLine?.destroy();
      this.travelLine = null;
      this.populationLabels.forEach((label) => label.destroy());
      this.populationLabels.clear();
    });
    emit('current-scene-ready', this);
  }
  // Functions

  // Necro functions
  private selectNecromancer(): void {
    this.deselectVillage();
    // Anchor the menu to the necromancer sprite itself (not the click point),
    // so it always appears in the same spot relative to the necromancer.
    this.necroAnchor = { x: this.necromancer.x, y: this.necromancer.y };
    emit('necromancer-selected', true);
    // Push the initial menu position right away; update() re-syncs on camera movement.
    this.emitAnchorPosition('necromancer-ui-position', this.necroAnchor);
  }

  private deselectNecromancer(): void {
    if (!this.necroAnchor) return;
    this.necroAnchor = null;
    emit('necromancer-selected', false);
  }

  // Village functions
  private selectVillage(sprite: Phaser.Physics.Arcade.Sprite): void {
    this.deselectNecromancer();
    // Anchor the menu to the village sprite itself (not the click point),
    // so it always appears in the same spot relative to the village.
    this.villageAnchor = { x: sprite.x, y: sprite.y };
    emit('village-selected', {
      id: sprite.getData('villageId') as VillageId,
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

  private getVillagePopulation(villageId: VillageId): number {
    return getStat(this.registry, VILLAGE_POPULATION_KEYS[villageId]);
  }

  private setVillagePopulation(villageId: VillageId, value: number): void {
    setStat(
      this.registry,
      VILLAGE_POPULATION_KEYS[villageId],
      Math.max(0, value)
    );
  }

  private getRatCount(): number {
    return getStat(this.registry, 'zombieRatsAmount');
  }

  private getRatSpeed(): number {
    return getStat(this.registry, 'ratSpeed');
  }

  private handleVillageAction = (payload: {
    action: VillageAction;
    villageId: string;
  }): void => {
    if (!isVillageId(payload.villageId)) return;
    const target = this.villages.find(
      (v) => v.getData('villageId') === payload.villageId
    );
    if (!target) return;

    this.sendRats(payload.action, target);
  };

  // Rats functions
  private sendRats(
    action: VillageAction,
    target: Phaser.Physics.Arcade.Sprite
  ): void {
    // One raid at a time — the React UI also blocks via 'rats-busy', but this
    // guards against a stale UI state, so a second send can't corrupt the task.
    if (this.ratTask) return;
    if (this.getRatCount() < 1) return;

    const villageId = target.getData('villageId') as VillageId;
    this.zombieRats.setPosition(this.necromancer.x, this.necromancer.y);
    this.zombieRats.setVisible(true);

    this.ratTask = {
      action,
      villageId,
      targetX: target.x,
      targetY: target.y,
      state: 'moving-to-target',
    };
    this.syncRatTaskSaveData();

    emit('rats-busy', true);

    this.drawTravelLine(
      this.necromancer.x,
      this.necromancer.y,
      target.x,
      target.y
    );

    this.physics.moveTo(this.zombieRats, target.x, target.y, this.getRatSpeed());
  }

  /** Reuses one Graphics object instead of allocating a fresh one per frame. */
  private drawTravelLine(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): void {
    if (!this.travelLine) {
      this.travelLine = this.add.graphics();
      this.travelLine.setDepth(0.5);
    }
    this.travelLine.clear();
    this.travelLine.lineStyle(4, 0xaf0000, 0.7);
    this.travelLine.beginPath();
    this.travelLine.moveTo(fromX, fromY);
    this.travelLine.lineTo(toX, toY);
    this.travelLine.strokePath();
  }

  private handleRatVillageOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback =
    (rats, villageObj): void => {
      const task = this.ratTask;
      if (!task || task.state !== 'moving-to-target') return;

      const village = villageObj as Phaser.Physics.Arcade.Sprite;
      const villageId = village.getData('villageId') as VillageId;

      // Make sure this is the village the rats were actually sent to
      // (avoids stopping early if they clip past a different village en route)
      if (villageId !== task.villageId) return;

      const ratsSprite = rats as Phaser.Physics.Arcade.Sprite;
      const body = ratsSprite.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      ratsSprite.setVisible(false);
      this.travelLine?.clear();

      this.ratTask = {
        action: task.action,
        villageId: task.villageId,
        targetX: task.targetX,
        targetY: task.targetY,
        state: 'in-progress',
        timer: this.getActionDuration(task.action),
      };
      this.createProgressBar(village.x, village.y);
      this.syncRatTaskSaveData();
    };

  private handleRatNecromancerOverlap: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback =
    (): void => {
      const task = this.ratTask;
      if (!task || task.state !== 'returning') return;

      const body = this.zombieRats.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      this.zombieRats.setVisible(false);
      this.travelLine?.clear();

      emit('rats-returned', { villageId: task.villageId });
      this.ratTask = null;
      this.syncRatTaskSaveData();
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

  private destroyProgressBar(): void {
    this.barBg?.destroy();
    this.barFill?.destroy();
    this.barBg = null;
    this.barFill = null;
  }

  private getActionDuration(action: VillageAction): number {
    switch (action) {
      case 'loot':
        return getStat(this.registry, 'lootDuration');
      case 'scout':
        return getStat(this.registry, 'scoutDuration');
      case 'attack':
        return getStat(this.registry, 'attackDuration');
    }
  }

  private resolveAttack(villageId: VillageId): void {
    const strength = Math.max(
      0,
      this.getRatCount() * getStat(this.registry, 'ratPower')
    );
    const possibleKills = Math.trunc(strength / 10);

    if (possibleKills < 1) {
      setStat(this.registry, 'zombieRatsAmount', 0);
      emit('creature-stats-changed');
      return;
    }

    const population = Math.trunc(this.getVillagePopulation(villageId));
    const kills = Math.min(population, Phaser.Math.Between(1, possibleKills));
    const unitDeaths = Phaser.Math.Between(1, this.getRatCount());

    this.setVillagePopulation(villageId, population - kills);
    addResources(this.registry, { humanCorpses: kills });

    setStat(this.registry, 'zombieRatsAmount', this.getRatCount() - unitDeaths);
    emit('creature-stats-changed');
    emit('village-attacked', { villageId, kills });
  }

  private resolveLoot(villageId: VillageId): void {
    const looted = Phaser.Math.Between(1, this.getRatCount());
    addResources(this.registry, { ratCorpses: looted });
    emit('village-looted', {
      villageId,
      lootedCorpses: looted,
    });
  }

  private resolveScout(villageId: VillageId): void {
    emit('village-scouted', { villageId });

    const population = this.getVillagePopulation(villageId);

    const label = this.populationLabels.get(villageId);
    label?.setText(`${Math.trunc(population)}`);
  }
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
    const task = this.ratTask;
    if (task) {
      if (task.state === 'in-progress') {
        // Only the in-progress union member has a timer, so this is type-safe
        // without any `timer!` assertions.
        task.timer -= delta;
        const duration = this.getActionDuration(task.action);

        if (this.barFill && duration > 0) {
          const progress = 1 - Math.max(task.timer, 0) / duration;
          this.barFill.scaleX = progress;
        }

        if (task.timer <= 0) {
          switch (task.action) {
            case 'loot':
              this.resolveLoot(task.villageId);
              break;
            case 'scout':
              this.resolveScout(task.villageId);
              break;
            case 'attack':
              this.resolveAttack(task.villageId);
              break;
          }

          this.destroyProgressBar();

          if (this.getRatCount() < 1) {
            // Horde wiped out mid-raid (attack) — no return trip
            this.ratTask = null;
            this.syncRatTaskSaveData();
            emit('rats-busy', false);
            return;
          }

          this.beginReturnTrip();
        }
      } else {
        const otherSprite =
          task.state === 'moving-to-target'
            ? this.villages.find((v) => v.getData('villageId') === task.villageId)
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
    }

    this.populationGrowthAccumulator += delta;
    if (this.populationGrowthAccumulator >= this.POPULATION_GROWTH_INTERVAL_MS) {
      // keep remainder, avoids drift over time
      this.populationGrowthAccumulator -= this.POPULATION_GROWTH_INTERVAL_MS;
      this.growVillagePopulation();
    }
  }

  /** After a raid resolves and at least one rat survived, send the horde home
   *  along the same hand-off path shared by loot/scout (and the wipe-out case). */
  private beginReturnTrip(): void {
    const task = this.ratTask;
    if (!task) return;

    // Hand the task back to the save layer before the state switch so the
    // transition is never observed as a partial (in-progress, zombies gone).
    this.ratTask = {
      action: task.action,
      villageId: task.villageId,
      targetX: task.targetX,
      targetY: task.targetY,
      state: 'returning',
    };
    this.zombieRats.setVisible(true);

    this.drawTravelLine(
      this.zombieRats.x,
      this.zombieRats.y,
      this.necromancer.x,
      this.necromancer.y
    );
    this.physics.moveTo(
      this.zombieRats,
      this.necromancer.x,
      this.necromancer.y,
      this.getRatSpeed()
    );
    this.syncRatTaskSaveData();
  }

  private growVillagePopulation(): void {
    this.villages.forEach((village) => {
      const villageId = village.getData('villageId') as VillageId;
      if (!isVillageId(villageId)) return;
      const maxPopulation = village.getData('maxPopulation') as number;
      const rate = village.getData('growthRate') as number;
      if (maxPopulation <= 0 || rate <= 0) return;

      let current = this.getVillagePopulation(villageId);

      // Logistic growth — naturally slows near maxPopulation
      const growth = rate * current * (1 - current / maxPopulation);
      current = Math.max(current + growth, 0);

      // Decay — occasional extra dip
      if (Math.random() < this.DECAY_BASE_CHANCE) {
        const decayPercent = Phaser.Math.FloatBetween(
          this.DECAY_PERCENT_MIN,
          this.DECAY_PERCENT_MAX
        );
        current = Math.max(current - current * decayPercent, 0);
      }

      this.setVillagePopulation(villageId, current);
    });
  }

  // --- Save/restore of the in-flight raid -------------------------------

  /** Snapshots the current raid (or null) into the save module. The snapshot is
   *  what `saveGame` serializes and `initGameStateFromSave` restores, so both a
   *  scene switch and a full page refresh keep the horde exactly where it was. */
  private syncRatTaskSaveData(): void {
    const task = this.ratTask;
    if (!task) {
      setRatTaskSaveData(null);
      return;
    }
    setRatTaskSaveData({
      action: task.action,
      villageId: task.villageId,
      targetX: task.targetX,
      targetY: task.targetY,
      state: task.state,
      timer: task.state === 'in-progress' ? task.timer : 0,
      barFillScale: this.barFill?.scaleX ?? 0,
      ratsX: this.zombieRats.x,
      ratsY: this.zombieRats.y,
      ratsVisible: this.zombieRats.visible,
    });
  }

  /** Rebuilds a raid saved before a scene switch or page refresh. */
  private restoreRatTask(): void {
    const saved = getRatTaskSaveData();
    if (!saved) return;

    // Stale/corrupt saves: refuse to resurrect a raid aimed at an unknown village.
    if (!isVillageId(saved.villageId)) return;

    this.zombieRats.setPosition(saved.ratsX, saved.ratsY);
    this.zombieRats.setVisible(saved.ratsVisible);

    const base = {
      action: saved.action,
      villageId: saved.villageId,
      targetX: saved.targetX,
      targetY: saved.targetY,
    };

    if (saved.state === 'in-progress') {
      this.ratTask = { ...base, state: 'in-progress', timer: saved.timer };
      this.createProgressBar(saved.targetX, saved.targetY);
      if (this.barFill) this.barFill.scaleX = saved.barFillScale;
      emit('rats-busy', true);
      return;
    }

    this.ratTask = { ...base, state: saved.state };
    emit('rats-busy', true);

    if (saved.state === 'moving-to-target') {
      this.drawTravelLine(
        saved.ratsX,
        saved.ratsY,
        saved.targetX,
        saved.targetY
      );
      this.physics.moveTo(
        this.zombieRats,
        saved.targetX,
        saved.targetY,
        this.getRatSpeed()
      );
    } else {
      this.drawTravelLine(
        saved.ratsX,
        saved.ratsY,
        this.necromancer.x,
        this.necromancer.y
      );
      this.physics.moveTo(
        this.zombieRats,
        this.necromancer.x,
        this.necromancer.y,
        this.getRatSpeed()
      );
    }
  }
}