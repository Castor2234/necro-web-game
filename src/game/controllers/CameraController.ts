// game/controllers/CameraController.ts
import * as Phaser from 'phaser';

export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

export interface CameraControllerOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomSpeed?: number;
  zoomSmoothing?: number;
  bounds?: { x: number; y: number; width: number; height: number };
  dragButton?: number; // 0=left, 1=middle, 2=right
}

const MIDDLE_BUTTON_MASK = 4;

export class CameraController {
  private scene: Phaser.Scene;
  private cam: Phaser.Cameras.Scene2D.Camera;

  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private cameraStartX = 0;
  private cameraStartY = 0;

  private targetZoom: number;

  /** Screen position (game canvas space) to zoom toward; updated on each wheel tick. */
  private zoomAnchorX = GAME_WIDTH / 2;
  private zoomAnchorY = GAME_HEIGHT / 2;

  private readonly minZoom: number;
  private readonly maxZoom: number;
  private readonly zoomSpeed: number;
  private readonly zoomSmoothing: number;
  private readonly dragButton: number;

  // Store bound handler references so we can remove them in destroy()
  private handleWheel = (
    pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number
  ) => {
    this.zoomAnchorX = pointer.x;
    this.zoomAnchorY = pointer.y;

    this.targetZoom = Phaser.Math.Clamp(
      this.targetZoom - deltaY * this.zoomSpeed,
      this.minZoom,
      this.maxZoom
    );
  };

  private handlePointerDown = (pointer: Phaser.Input.Pointer) => {
    if (pointer.button !== this.dragButton) return;

    this.isDragging = true;
    this.dragStartX = pointer.x;
    this.dragStartY = pointer.y;
    this.cameraStartX = this.cam.scrollX;
    this.cameraStartY = this.cam.scrollY;
  };

  private handlePointerMove = (pointer: Phaser.Input.Pointer) => {
    if (!this.isDragging) return;

    if ((pointer.buttons & MIDDLE_BUTTON_MASK) === 0) {
      this.isDragging = false;
      return;
    }

    const dx = (pointer.x - this.dragStartX) / this.cam.zoom;
    const dy = (pointer.y - this.dragStartY) / this.cam.zoom;

    this.cam.scrollX = this.cameraStartX - dx;
    this.cam.scrollY = this.cameraStartY - dy;
  };

  private handlePointerUp = () => {
    this.isDragging = false;
  };

  constructor(scene: Phaser.Scene, options: CameraControllerOptions = {}) {
    this.scene = scene;
    this.cam = scene.cameras.main;

    this.minZoom = options.minZoom ?? 1;
    this.maxZoom = options.maxZoom ?? 5;
    this.zoomSpeed = options.zoomSpeed ?? 0.001;
    this.zoomSmoothing = options.zoomSmoothing ?? 0.5;
    this.dragButton = options.dragButton ?? 1; // middle by default

    this.targetZoom = this.cam.zoom;

    const bounds = options.bounds ?? {
      x: 0,
      y: 0,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    };
    this.cam.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);

    this.attachListeners();

    this.scene.events.on('update', this.update, this);
  }

  private update = (): void => {
    if (Math.abs(this.cam.zoom - this.targetZoom) < 0.001) return;

    const oldZoom = this.cam.zoom;
    const newZoom = Phaser.Math.Linear(
      oldZoom,
      this.targetZoom,
      this.zoomSmoothing
    );

    // Phaser 4: world under a viewport pixel is
    // scroll + halfSize + (local - halfSize) / zoom — adjust scroll when zoom changes.
    const halfW = this.cam.width * 0.5;
    const halfH = this.cam.height * 0.5;
    const localX = this.zoomAnchorX - this.cam.x;
    const localY = this.zoomAnchorY - this.cam.y;
    const zoomFactor = 1 / oldZoom - 1 / newZoom;

    this.cam.scrollX += (localX - halfW) * zoomFactor;
    this.cam.scrollY += (localY - halfH) * zoomFactor;
    this.cam.setZoom(newZoom);
  };

  private attachListeners(): void {
    this.scene.input.on('wheel', this.handleWheel);
    this.scene.input.on('pointerdown', this.handlePointerDown);
    this.scene.input.on('pointermove', this.handlePointerMove);
    this.scene.input.on('pointerup', this.handlePointerUp);
    this.scene.input.on('pointerout', this.handlePointerUp);
  }

  /** Call this from the scene's shutdown to avoid leaking listeners across restarts. */
  destroy(): void {
    this.scene.input.off('wheel', this.handleWheel);
    this.scene.input.off('pointerdown', this.handlePointerDown);
    this.scene.input.off('pointermove', this.handlePointerMove);
    this.scene.input.off('pointerup', this.handlePointerUp);
    this.scene.input.off('pointerout', this.handlePointerUp);
    this.scene.events.off('update', this.update, this);
  }

  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    const halfW = this.cam.width * 0.5;
    const halfH = this.cam.height * 0.5;

    return {
      x: halfW + (worldX - this.cam.scrollX - halfW) * this.cam.zoom,
      y: halfH + (worldY - this.cam.scrollY - halfH) * this.cam.zoom,
    };
  }
}

