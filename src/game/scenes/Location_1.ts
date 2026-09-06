import * as Phaser from 'phaser';
import { SCENE } from '../helpers/keys';
import { emit } from '../helpers/events';
import { formatNumber, formatTime } from '../helpers/format';
import { CameraController } from '../controllers/CameraController';
import {
  getRaidRenderStates,
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
 *  - draws the raid states (one horde sprite, progress bar and travel line
 *    per raid) from WorldSim every frame.
 */
export class Location_1 extends Phaser.Scene {
  // --- Scene objects ---
  necromancer: Phaser.GameObjects.Sprite;
  house1: Phaser.GameObjects.Image;

  private villages: Phaser.GameObjects.Sprite[] = [];
  private populationLabels: Map<VillageId, Phaser.GameObjects.BitmapText> =
    new Map();
  private villageAnchor: { x: number; y: number } | null = null;
  private necroAnchor: { x: number; y: number } | null = null;
  private travelLine: Phaser.GameObjects.Graphics | null = null;

  // Action progress bars (one per raiding group)
  private readonly BAR_WIDTH = 64;
  private readonly BAR_HEIGHT = 6;
  private readonly BAR_OFFSET_Y = 38;
  private readonly RAID_LABEL_OFFSET_Y = 24;
  /** One horde visual (sprite + count label) per in-flight raid, keyed by groupId. */
  private hordes: Map<
    number,
    {
      sprite: Phaser.GameObjects.Sprite;
      label: Phaser.GameObjects.BitmapText;
      hovered: boolean;
    }
  > = new Map();
  /** One action progress bar per raiding group, keyed by groupId. */
  private progressBars: Map<
    number,
    { bg: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle }
  > = new Map();

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
        .bitmapText(village.x, village.y - 30, 'font1', '???', 16)
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

    // Rat hordes — pure visuals, one per in-flight raid (keyed by groupId);
    // position/movement come from WorldSim. ensureHorde() lazily creates them.

    // Re-sync the raid-busy flag in case a raid is already in flight.
    emit('rats-busy', isRaidActive());

    this.events.once('shutdown', () => {
      this.cameraController.destroy();
      this.travelLine?.destroy();
      this.travelLine = null;
      this.hordes.forEach((horde) => {
        horde.sprite.destroy();
        horde.label.destroy();
      });
      this.hordes.clear();
      this.progressBars.forEach((bar) => {
        bar.bg.destroy();
        bar.fill.destroy();
      });
      this.progressBars.clear();
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
    const states = getRaidRenderStates(Date.now());

    // One shared Graphics for all travel lines; cleared and redrawn per frame.
    this.ensureTravelLine();
    this.travelLine?.clear();

    const activeGroups = new Set<number>();
    const barsInProgress = new Set<number>();

    for (const state of states) {
      activeGroups.add(state.groupId);

      const horde = this.ensureHorde(state.groupId);
      horde.sprite.setPosition(state.x, state.y);
      horde.sprite.setVisible(state.visible);

      horde.label.setPosition(state.x, state.y + this.RAID_LABEL_OFFSET_Y);
      horde.label.setVisible(state.visible && horde.hovered);
      const countText = String(state.creatureCount);
      // Only touch the Text object when the value actually changed.
      if (horde.label.text !== countText) {
        horde.label.setText(countText);
      }

      if (state.phase === 'in-progress') {
        // Horde is hidden inside the village; show the action progress bar.
        barsInProgress.add(state.groupId);
        this.ensureProgressBar(state.groupId, state.barX, state.barY);
        const bar = this.progressBars.get(state.groupId);
        if (bar) bar.fill.scaleX = state.barProgress;
      } else {
        this.drawTravelLineSegment(state.x, state.y, state.toX, state.toY);
      }
    }

    // Destroy visuals whose raid no longer exists.
    for (const [groupId, horde] of this.hordes) {
      if (!activeGroups.has(groupId)) {
        horde.sprite.destroy();
        horde.label.destroy();
        this.hordes.delete(groupId);
      }
    }
    for (const [groupId, bar] of this.progressBars) {
      if (!barsInProgress.has(groupId)) {
        bar.bg.destroy();
        bar.fill.destroy();
        this.progressBars.delete(groupId);
      }
    }
  }

  /** Lazily creates (and registers) the horde visual for a raiding group. */
  private ensureHorde(groupId: number): {
    sprite: Phaser.GameObjects.Sprite;
    label: Phaser.GameObjects.BitmapText;
    hovered: boolean;
  } {
    const existing = this.hordes.get(groupId);
    if (existing) return existing;

    const sprite = this.add
      .sprite(0, 0, 'zombie_horde_img')
      .setScale(0.5)
      .setDepth(2)
      .setVisible(false);

    // Creature count shown under the horde while it travels. Hovering reveals it.
    const label = this.add
      .bitmapText(0, 0, 'font1', '', 16)
      .setOrigin(0.5, 0)
      .setDepth(22)
      .setVisible(false);

    const horde = { sprite, label, hovered: false };
    sprite.setInteractive();
    sprite.on('pointerover', () => {
      horde.hovered = true;
    });
    sprite.on('pointerout', () => {
      horde.hovered = false;
    });

    this.hordes.set(groupId, horde);
    return horde;
  }

  private ensureProgressBar(groupId: number, x: number, y: number): void {
    if (this.progressBars.has(groupId)) return;
    const barY = y + this.BAR_OFFSET_Y;

    const bg = this.add
      .rectangle(x, barY, this.BAR_WIDTH, this.BAR_HEIGHT, 0x000000, 0.7)
      .setOrigin(0.5, 0.5)
      .setDepth(20);

    const fill = this.add
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

    this.progressBars.set(groupId, { bg, fill });
  }

  /** Reuses one Graphics object instead of allocating a fresh one per frame. */
  private ensureTravelLine(): void {
    if (!this.travelLine) {
      this.travelLine = this.add.graphics();
      this.travelLine.setDepth(0.5);
    }
  }

  /** Draws one travel line segment; the shared Graphics is cleared per frame. */
  private drawTravelLineSegment(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): void {
    this.ensureTravelLine();
    this.travelLine?.lineStyle(4, 0xaf0000, 0.7);
    this.travelLine?.beginPath();
    this.travelLine?.moveTo(fromX, fromY);
    this.travelLine?.lineTo(toX, toY);
    this.travelLine?.strokePath();
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
