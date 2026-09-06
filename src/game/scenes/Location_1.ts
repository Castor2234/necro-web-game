import * as Phaser from 'phaser';
import { SCENE } from '../helpers/keys';
import { emit } from '../helpers/events';
import { formatNumber, formatTime } from '../helpers/format';
import { CameraController } from '../controllers/CameraController';
import {
  getRatRaidRenderState,
  isRaidActive,
  isVillageScouted,
  getScoutedPopulation,
  getScoutedAt,
} from '../state/worldSim';
import {
  NECROMANCER_POSITION,
  VILLAGE_CONFIGS,
  type VillageId,
} from '../config/villages';

/**
 * Renders Location_1. All game-state simulation for this location (rat raids,
 * village growth) now lives in WorldSim and runs while the player is in any
 * other scene. This scene only:
 *  - renders the map, villages and the necromancer,
 *  - handles selection / hover / navigation input,
 *  - draws the current raid state (horde position, progress bar, travel line)
 *    from WorldSim every frame.
 */
export class Location_1 extends Phaser.Scene {
  // --- Scene objects ---
  necromancer: Phaser.GameObjects.Sprite;
  house1: Phaser.GameObjects.Image;
  zombieRats: Phaser.GameObjects.Sprite;

  private villages: Phaser.GameObjects.Sprite[] = [];
  private populationLabels: Map<VillageId, Phaser.GameObjects.BitmapText> = new Map();
  private villageAnchor: { x: number; y: number } | null = null;
  private necroAnchor: { x: number; y: number } | null = null;
  private travelLine: Phaser.GameObjects.Graphics | null = null;

  // Action progress bar
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

    // Necromancer (position shared with the raid sim)
    this.necromancer = this.add
      .sprite(NECROMANCER_POSITION.x, NECROMANCER_POSITION.y, 'necro_icon')
      .setDepth(1)
      .setInteractive({ useHandCursor: true });
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

    // Villages (positions come from the shared config the sim uses)
    this.villages = VILLAGE_CONFIGS.map((cfg) => {
      const sprite = this.add
        .sprite(cfg.x, cfg.y, cfg.texture)
        .setData('villageId', cfg.id)
        .setInteractive({ useHandCursor: true })
        .setDepth(1);

      sprite.on('pointerover', () => {
        sprite.setScale(1.1);
      });
      sprite.on('pointerout', () => {
        sprite.setScale(1.0);
      });
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
        .bitmapText(village.x, village.y - 28, 'font1', '???', 16)
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

    // Decorative house
    this.house1 = this.add.image(600, 40, 'house_1_img');

    // Rat horde — a pure visual now; position/movement come from WorldSim.
    this.zombieRats = this.add
      .sprite(0, 0, 'zombie_horde_img')
      .setScale(0.5)
      .setDepth(2)
      .setVisible(false);

    // Re-sync the raid-busy flag in case a raid is already in flight.
    emit('rats-busy', isRaidActive());

    this.events.once('shutdown', () => {
      this.cameraController.destroy();
      this.travelLine?.destroy();
      this.travelLine = null;
      this.populationLabels.forEach((label) => label.destroy());
      this.populationLabels.clear();
    });

    emit('current-scene-ready', this);
  }

  // --- Selection -------------------------------------------------------------

  private selectNecromancer(): void {
    this.deselectVillage();
    // Anchor the menu to the necromancer sprite itself (not the click point).
    this.necroAnchor = { x: this.necromancer.x, y: this.necromancer.y };
    emit('necromancer-selected', true);
    this.emitAnchorPosition('necromancer-ui-position', this.necroAnchor);
  }

  private deselectNecromancer(): void {
    if (!this.necroAnchor) return;
    this.necroAnchor = null;
    emit('necromancer-selected', false);
  }

  private selectVillage(sprite: Phaser.GameObjects.Sprite): void {
    this.deselectNecromancer();
    // Anchor the menu to the village sprite itself (not the click point).
    this.villageAnchor = { x: sprite.x, y: sprite.y };
    emit('village-selected', {
      id: sprite.getData('villageId') as VillageId,
    });
    this.emitAnchorPosition('village-ui-position', this.villageAnchor);
  }

  private deselectVillage(): void {
    if (!this.villageAnchor) return;
    this.villageAnchor = null;
    emit('village-selected', null);
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

  // --- Raid rendering (state is owned by WorldSim) --------------------------

  private renderRaid(): void {
    const state = getRatRaidRenderState(Date.now());

    if (!state) {
      this.zombieRats.setVisible(false);
      this.destroyProgressBar();
      this.travelLine?.clear();
      return;
    }

    this.zombieRats.setPosition(state.x, state.y);
    this.zombieRats.setVisible(state.visible);

    if (state.phase === 'in-progress') {
      // Horde is hidden inside the village; show the action progress bar.
      this.ensureProgressBar(state.barX, state.barY);
      if (this.barFill) this.barFill.scaleX = state.barProgress;
      this.travelLine?.clear();
    } else {
      this.destroyProgressBar();
      this.drawTravelLine(
        this.zombieRats.x,
        this.zombieRats.y,
        state.toX,
        state.toY
      );
    }
  }

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

  private ensureProgressBar(x: number, y: number): void {
    if (!this.barBg || !this.barFill) this.createProgressBar(x, y);
  }

  private destroyProgressBar(): void {
    this.barBg?.destroy();
    this.barFill?.destroy();
    this.barBg = null;
    this.barFill = null;
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

  // --- Population labels ------------------------------------------------------

  private renderPopulationLabels(): void {
    const now = Date.now();
    this.villages.forEach((village) => {
      const id = village.getData('villageId') as VillageId;
      const label = this.populationLabels.get(id);
      if (!label) return;

      // A scouted village shows the population captured at scout time
      // (frozen snapshot) plus how long ago the scout happened.
      const scoutedAt = getScoutedAt(id);
      const text =
        isVillageScouted(id) && scoutedAt !== undefined
          ? `${formatNumber(getScoutedPopulation(id))} (${formatTime(
              Math.floor((now - scoutedAt) / 1000)
            )})`
              : '???';
      // Only touch the Text object when the value actually changed.
      if (label.text !== text) label.setText(text);
    });
  }

  // --- Main loop ---------------------------------------------------------------

  update(): void {
    // Menu anchors only need re-syncing while the camera is actually moving.
    if (this.cameraController.hasCameraChanged()) {
      if (this.villageAnchor) {
        this.emitAnchorPosition('village-ui-position', this.villageAnchor);
      }
      if (this.necroAnchor) {
        this.emitAnchorPosition('necromancer-ui-position', this.necroAnchor);
      }
    }

    this.renderRaid();
    this.renderPopulationLabels();
  }
}
