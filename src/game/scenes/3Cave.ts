import * as Phaser from 'phaser';
import { SCENE } from '../helpers/keys';
import { emit } from '../helpers/events';
import type { BuildingType } from '../helpers/events';
import { CameraController } from '../controllers/CameraController';

export class Cave extends Phaser.Scene {
  background: Phaser.GameObjects.Image;
  tent: Phaser.GameObjects.Image;
  workshop: Phaser.GameObjects.Image;

  private selectedBuilding: {
    type: BuildingType;
    x: number;
    y: number;
  } | null = null;

  // Camera zoom and drag
  private cameraController: CameraController;

  constructor() {
    super(SCENE.Cave);
  }

  create() {
    // Фон
    this.background = this.add.image(320, 180, 'cave_lake');

    // Zoom and drag
    this.cameraController = new CameraController(this);

    // Жилище
    this.tent = this.add.image(300, 200, 'tent').setInteractive();
    this.tent.setTint(0xdddddd);
    this.tent
      .on('pointerover', () => {
        this.tent.setScale(1.1);
        this.tent.clearTint();
      })
      .on('pointerout', () => {
        this.tent.setScale(1.0);
        this.tent.setTint(0xdddddd);
      })
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!this.isCanvasClick(pointer)) return;
        this.selectBuilding('tent');
      });

    // Мастерская
    this.workshop = this.add.image(170, 200, 'workshop').setInteractive();
    this.workshop.setTint(0xdddddd);
    this.workshop
      .on('pointerover', () => {
        this.workshop.setScale(1.1);
        this.workshop.clearTint();
      })
      .on('pointerout', () => {
        this.workshop.setScale(1.0);
        this.workshop.setTint(0xdddddd);
      })
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!this.isCanvasClick(pointer)) return;
        this.selectBuilding('workshop');
      });

    // Deselect on empty space click
    this.input.on(
      'pointerdown',
      (
        pointer: Phaser.Input.Pointer,
        currentlyOver: Phaser.GameObjects.GameObject[]
      ) => {
        if (!this.isCanvasClick(pointer)) return;
        if (currentlyOver.length === 0) this.deselectBuilding();
      }
    );

    // Действия при смене сцены
    this.events.once('shutdown', () => {
      this.cameraController.destroy();
    });

    emit('current-scene-ready', this);
  }

  // Functions
  private isCanvasClick(pointer: Phaser.Input.Pointer): boolean {
    return pointer.event?.target === this.game.canvas;
  }

  private selectBuilding(type: BuildingType): void {
    const sprite = type === 'tent' ? this.tent : this.workshop;
    // Anchor the menu to the building sprite itself (not the click point),
    // so it always appears in the same spot relative to the building.
    this.selectedBuilding = { type, x: sprite.x, y: sprite.y };
    emit('building-selected', { type });
    // Push the initial menu position right away; update() re-syncs on camera movement.
    this.emitSelectedBuildingPosition();
  }

  private deselectBuilding(): void {
    if (!this.selectedBuilding) return;
    this.selectedBuilding = null;
    emit('building-selected', null);
  }

  private emitSelectedBuildingPosition(): void {
    if (!this.selectedBuilding) return;
    const { x, y } = this.cameraController.worldToScreen(
      this.selectedBuilding.x,
      this.selectedBuilding.y
    );
    emit('building-ui-position', { x, y });
  }

  update(): void {
    if (!this.selectedBuilding) return;
    // The menu tracks the camera, so only re-sync when the camera actually moved
    if (this.cameraController.hasCameraChanged()) {
      this.emitSelectedBuildingPosition();
    }
  }
}

