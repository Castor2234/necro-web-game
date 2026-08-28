import { EventBus } from './EventBus';
import type { CanvasScale } from './state/helpers/canvasScale';
import type { Resources } from './state/helpers/resources';
import type {
  UpgradeState,
  WorkshopUpgradeKey,
} from './state/helpers/upgrades';

export type BuildingType = 'tent' | 'workshop';
export type VillageAction = 'attack' | 'loot' | 'scout';

export interface ConversionProgress {
  id: number;
  progress: number;
  secondsLeft: number;
  /** true while the task waits for a free conversion slot */
  queued: boolean;
}

/**
 * Typed map of every event exchanged between Phaser scenes and the React UI.
 * Prefer the `emit` / `on` / `off` helpers below over the raw EventBus, so
 * event names and payloads stay type-checked (a typo becomes a compile error).
 */
export interface GameEvents {
  // --- Scene lifecycle ---
  'current-scene-ready': Phaser.Scene;

  // --- Resources & creature stats ---
  'resources-updated': Resources;
  'zombie-rats-updated': number;
  'creature-stats-changed': void;

  // --- Canvas scale sync (React overlay <-> Phaser scale manager) ---
  'canvas-scale': CanvasScale;

  // --- Cave ---
  'building-selected': { type: BuildingType } | null;
  'building-ui-position': { x: number; y: number };
  'building-upgrade': { type: BuildingType };

  // --- Location_1 ---
  'village-selected': { id: string } | null;
  'village-ui-position': { x: number; y: number };
  'necromancer-selected': boolean;
  'necromancer-ui-position': { x: number; y: number };
  'necromancer-sleep': void;
  'village-action': { action: VillageAction; villageId: string };
  'rats-busy': boolean;
  'rats-returned': { villageId: string };
  'village-attacked': { villageId: string; kills: number };
  'village-looted': { villageId: string; lootedCorpses: number };
  'village-scouted': { villageId: string };

  // --- Workshop ---
  'convert-corpse': void;
  'corpse-conversion-started': {
    activeCount: number;
    queuedCount: number;
    maxConcurrent: number;
    maxQueue: number;
  };
  'corpse-conversion-progress': ConversionProgress[];
  'corpse-conversion-complete': {
    completedCount: number;
    activeCount: number;
    queuedCount: number;
    maxConcurrent: number;
    maxQueue: number;
    remainingTasks: ConversionProgress[];
  };
  'purchase-upgrade': { upgradeKey: WorkshopUpgradeKey };
  'upgrades-updated': UpgradeState[];

  // --- Save system ---
  /** Wipes the save file and resets every stat to its initial value. */
  'reset-game': void;
}

type EmitArgs<E extends keyof GameEvents> = GameEvents[E] extends void
  ? [payload?: undefined]
  : [payload: GameEvents[E]];

/** Type-safe emit: the payload shape is checked against GameEvents, and
 *  events declared as `void` need no payload argument at all. */
export const emit = <E extends keyof GameEvents>(e: E, ...args: EmitArgs<E>) =>
  EventBus.emit(e, args[0]);

/** Subscribe to a typed event. When a listener needs `this` binding (e.g.
 *  scene class methods), pass the same `context` to on() and off(). */
export const on = <E extends keyof GameEvents>(
  e: E,
  cb: (p: GameEvents[E]) => void,
  context?: object
) => EventBus.on(e, cb, context);

export const off = <E extends keyof GameEvents>(
  e: E,
  cb: (p: GameEvents[E]) => void,
  context?: object
) => EventBus.off(e, cb, context);

