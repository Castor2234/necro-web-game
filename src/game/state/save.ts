// game/state/save.ts
import * as Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { SCENE, isSceneKey, type SceneKey } from '../helpers/keys';
import { INITIAL_VALUES_CONFIG, type GameState } from './gameState';
import { isCreatureType } from './secondary/creatures';
import type { ConversionTask, RatRaid } from './worldSim';
import type { CreatureType } from './secondary/creatures';
import { isVillageId } from '../config/villages';

/**
 * localStorage-backed save system.
 *
 * The Phaser registry is the single source of truth during play; this module
 * mirrors it into localStorage so progress survives a page refresh:
 *  - `initGameStateFromSave` (called from the Preloader) applies
 *    INITIAL_VALUES_CONFIG defaults, then overlays the saved stats on top.
 *  - `installAutoSave` (also called from the Preloader) keeps the save file in
 *    sync — debounced writes on every registry change, plus a flush when the
 *    page is hidden or closed.
 */

/** localStorage key the save file is stored under. */
const SAVE_STORAGE_KEY = 'necro-web-game.save';

/** Bump when SavedGameData changes shape; older saves are discarded. */
const SAVE_VERSION = 5;

/** How long registry changes are debounced before writing to localStorage. */
const AUTO_SAVE_DEBOUNCE_MS = 500;

/**
 * In-flight corpse conversion task, persisted so paid corpses survive a
 * refresh. Wall-clock timestamps (`startAt`/`durationMs`) mean a conversion
 * also finishes correctly after being saved mid-way.
 */
export type SavedConversionTask = ConversionTask;

/**
 * In-flight Location_1 rat raid, persisted so the journey survives a scene
 * switch or a page refresh. Fully wall-clock described, so the horde resumes
 * exactly where it should be even after the page was closed.
 */
export type SavedRatTask = RatRaid;

export interface SavedGroup {
  id: number;
  creatures: Partial<Record<CreatureType, number>>;
}

export interface SavedGameData {
  version: number;
  /** Epoch ms of the last write. */
  savedAt: number;
  /** Scene the player was in when the save was written. */
  scene: SceneKey | null;
  /** Every GameState stat: resources, populations, creature stats, upgrades… */
  stats: Partial<Record<keyof GameState, number>>;
  conversionTasks: SavedConversionTask[];
  nextTaskId: number;
  /** In-flight rat raids (one per group). */
  raids: SavedRatTask[];
  /** Player-organized creature groups. */
  groups: SavedGroup[];
  /** villageId → epoch ms the village last grew, so offline growth can be
   *  replayed exactly when the game resumes. */
  villageGrowth: Record<string, number>;
}

// --- Shared extras that live outside the registry ----------------------------
// (module-level state, same pattern as `currentUpgradeState` in upgrades.ts)

/** Scene reported by the last 'current-scene-ready' EventBus event. */
let trackedSceneKey: SceneKey | null = null;

/** Workshop conversion queue snapshot, kept in sync by the Workshop scene. */
let conversionTasksSnapshot: SavedConversionTask[] = [];
let conversionNextTaskIdSnapshot = 0;

/** In-flight Location_1 rat raid snapshot, kept in sync by WorldSim. */
let ratTaskSnapshot: SavedRatTask[] = [];

let groupsSnapshot: SavedGroup[] = [];

/** villageId → last-growth-epoch snapshot, kept in sync by WorldSim. */
let villageGrowthSnapshot: Record<string, number> = {};

/** WorldSim reports the current conversion queue here after every change. */
export function setConversionSaveData(
  tasks: SavedConversionTask[],
  nextTaskId: number
): void {
  conversionTasksSnapshot = tasks.map((task) => ({ ...task }));
  conversionNextTaskIdSnapshot = nextTaskId;
}

export function getConversionSaveData(): {
  tasks: SavedConversionTask[];
  nextTaskId: number;
} {
  return {
    tasks: conversionTasksSnapshot.map((task) => ({ ...task })),
    nextTaskId: conversionNextTaskIdSnapshot,
  };
}

/** Location_1 reports the current raids here on every state change. */
export function setRatTaskSaveData(tasks: SavedRatTask[]): void {
  ratTaskSnapshot = tasks.map((task) => ({ ...task }));
}

export function getRatTaskSaveData(): SavedRatTask[] {
  return ratTaskSnapshot.map((task) => ({ ...task }));
}

/** Location_1 reports the current groups here on every state change. */
export function setGroupSaveData(groups: SavedGroup[]): void {
  groupsSnapshot = groups.map((g) => ({ ...g, creatures: { ...g.creatures } }));
}

export function getGroupSaveData(): SavedGroup[] {
  return groupsSnapshot.map((g) => ({ ...g, creatures: { ...g.creatures } }));
}

/** WorldSim reports the per-village growth timestamps here. */
export function setVillageGrowthSaveData(growth: Record<string, number>): void {
  villageGrowthSnapshot = { ...growth };
}

export function getVillageGrowthSaveData(): Record<string, number> {
  return { ...villageGrowthSnapshot };
}

// --- Serialization -----------------------------------------------------------

function collectStats(
  registry: Phaser.Data.DataManager
): Partial<Record<keyof GameState, number>> {
  const stats: Partial<Record<keyof GameState, number>> = {};
  (Object.keys(INITIAL_VALUES_CONFIG) as (keyof GameState)[]).forEach((key) => {
    const value = registry.get(key);
    if (typeof value === 'number' && Number.isFinite(value)) {
      stats[key] = value;
    }
  });
  return stats;
}

/** Writes the full game state to localStorage. Returns true on success. */
export function saveGame(registry: Phaser.Data.DataManager): boolean {
  const payload: SavedGameData = {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    scene: trackedSceneKey,
    stats: collectStats(registry),
    conversionTasks: conversionTasksSnapshot.map((task) => ({ ...task })),
    nextTaskId: conversionNextTaskIdSnapshot,
    raids: ratTaskSnapshot.map((task) => ({ ...task })),
    groups: groupsSnapshot.map((g) => ({ ...g, creatures: { ...g.creatures } })),
    villageGrowth: { ...villageGrowthSnapshot },
  };

  try {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    // Private browsing / quota exceeded — the game keeps running, just unsaved.
    console.warn('[save] Could not write save to localStorage:', error);
    return false;
  }
}

// --- Loading & validation ----------------------------------------------------
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function sanitizeStats(raw: unknown): Partial<Record<keyof GameState, number>> {
  const stats: Partial<Record<keyof GameState, number>> = {};
  if (typeof raw !== 'object' || raw === null) return stats;

  const record = raw as Record<string, unknown>;
  (Object.keys(INITIAL_VALUES_CONFIG) as (keyof GameState)[]).forEach((key) => {
    const value = record[key];
    if (isFiniteNumber(value)) stats[key] = Math.max(0, value);
  });
  return stats;
}

function sanitizeConversionTasks(raw: unknown): SavedConversionTask[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((task) => {
    if (typeof task !== 'object' || task === null) return [];
    const { id, creatureType, startAt, durationMs } = task as Record<
      string,
      unknown
    >;
    if (
      !isFiniteNumber(id) ||
      !isCreatureType(creatureType) ||
      !isFiniteNumber(startAt) ||
      !isFiniteNumber(durationMs)
    ) {
      return [];
    }
    return [
      {
        id,
        creatureType,
        startAt: Math.max(0, startAt),
        durationMs: Math.max(0, durationMs),
      },
    ];
  });
}

const RAT_TASK_PHASES = [
  'moving-to-target',
  'in-progress',
  'returning',
] as const;

function sanitizeRatTask(raw: unknown): SavedRatTask | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const {
    action,
    villageId,
    phase,
    startX,
    startY,
    endX,
    endY,
    moveStartAt,
    moveDurationMs,
    actionEndAt,
    actionDurationMs,
    groupId,
    creatures,
  } = raw as Record<string, unknown>;

  if (
    (action !== 'attack' && action !== 'loot' && action !== 'scout') ||
    typeof villageId !== 'string' ||
    !isVillageId(villageId) ||
    typeof phase !== 'string' ||
    !(RAT_TASK_PHASES as readonly string[]).includes(phase)
  ) {
    return null;
  }

  return {
    action,
    villageId,
    phase: phase as SavedRatTask['phase'],
    startX: isFiniteNumber(startX) ? startX : 0,
    startY: isFiniteNumber(startY) ? startY : 0,
    endX: isFiniteNumber(endX) ? endX : 0,
    endY: isFiniteNumber(endY) ? endY : 0,
    moveStartAt: isFiniteNumber(moveStartAt) ? Math.max(0, moveStartAt) : 0,
    moveDurationMs: isFiniteNumber(moveDurationMs)
      ? Math.max(0, moveDurationMs)
      : 0,
    actionEndAt: isFiniteNumber(actionEndAt) ? Math.max(0, actionEndAt) : 0,
    actionDurationMs: isFiniteNumber(actionDurationMs)
      ? Math.max(0, actionDurationMs)
      : 0,
    groupId: typeof groupId === 'number' ? groupId : 0,
    creatures: typeof creatures === 'object' && creatures ? { ...creatures } : {},
  };
}

function sanitizeVillageGrowth(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (typeof raw !== 'object' || raw === null) return out;

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isVillageId(key) && isFiniteNumber(value) && value >= 0) {
      out[key] = value;
    }
  }
  return out;
}

/** Reads and validates the save file. Returns null when absent or invalid
 *  (corrupted JSON, wrong version, …) so the game falls back to defaults. */
export function loadSavedGame(): SavedGameData | null {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SavedGameData> | null;
    if (typeof parsed !== 'object' || parsed === null) return null;
    // Future format migrations would branch on the version here.
    if (parsed.version !== SAVE_VERSION) return null;

    const scene =
      typeof parsed.scene === 'string' && isSceneKey(parsed.scene)
        ? parsed.scene
        : null;

    return {
      version: SAVE_VERSION,
      savedAt: isFiniteNumber(parsed.savedAt) ? parsed.savedAt : 0,
      scene,
      stats: sanitizeStats(parsed.stats),
      conversionTasks: sanitizeConversionTasks(parsed.conversionTasks),
      nextTaskId: isFiniteNumber(parsed.nextTaskId)
        ? Math.max(0, Math.trunc(parsed.nextTaskId))
        : 0,
      raids: Array.isArray(parsed.raids)
        ? parsed.raids.map(sanitizeRatTask).filter((t): t is SavedRatTask => t !== null)
        : [],
      groups: Array.isArray(parsed.groups)
        ? parsed.groups.filter((g) => typeof g?.id === 'number')
        : [],
      villageGrowth: sanitizeVillageGrowth(parsed.villageGrowth),
    };
  } catch (error) {
    console.warn('[save] Could not read save from localStorage:', error);
    return null;
  }
}

export function hasSavedGame(): boolean {
  try {
    return localStorage.getItem(SAVE_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch (error) {
    console.warn('[save] Could not remove save from localStorage:', error);
  }
}

// --- Applying state ----------------------------------------------------------

/** Applies INITIAL_VALUES_CONFIG defaults first, then overlays the saved stats
 *  on top — so stats added after the save was written still get a value.
 *  Also repopulates the in-memory conversion/rat-task snapshots from the save,
 *  so in-flight conversions and raids survive a full page refresh.
 *  Returns the loaded save (or null for a fresh game). */
export function initGameStateFromSave(
  registry: Phaser.Data.DataManager
): SavedGameData | null {
  (
    Object.entries(INITIAL_VALUES_CONFIG) as [keyof GameState, number][]
  ).forEach(([key, value]) => {
    registry.set(key, value);
  });

  const save = loadSavedGame();
  if (!save) return null;

  (Object.entries(save.stats) as [keyof GameState, number][]).forEach(
    ([key, value]) => {
      registry.set(key, value);
    }
  );

  // The registry is the source of truth for stats; the module-level
  // snapshots are the source of truth for the in-flight task queues.
  setConversionSaveData(save.conversionTasks, save.nextTaskId);
  setRatTaskSaveData(save.raids ?? []);
  setGroupSaveData(save.groups ?? []);
  setVillageGrowthSaveData(save.villageGrowth);

  return save;
}

/** Resets every stat back to INITIAL_VALUES_CONFIG ("new game"). Scenes
 *  re-read the registry when they start, so this takes effect immediately. */
export function resetGameState(registry: Phaser.Data.DataManager): void {
  (
    Object.entries(INITIAL_VALUES_CONFIG) as [keyof GameState, number][]
  ).forEach(([key, value]) => {
    registry.set(key, value);
  });
  // A reset game must not resurrect the old conversion queue, rat raids or
  // village growth timestamps.
  setConversionSaveData([], 0);
  setRatTaskSaveData([]);
  setGroupSaveData([]);
  setVillageGrowthSaveData({});
}

/** The scene to continue from: the saved scene, unless it's missing or a
 *  boot-only scene (Boot/Preloader must never be resumed directly). */
export function getResumeScene(save: SavedGameData | null): SceneKey {
  const scene = save?.scene;
  if (
    scene &&
    isSceneKey(scene) &&
    scene !== SCENE.Boot &&
    scene !== SCENE.Preloader
  ) {
    return scene;
  }
  return SCENE.MainMenu;
}

// --- Auto-save ---------------------------------------------------------------

let autoSaveTeardown: (() => void) | null = null;

/** Keeps the save file in sync while the game runs:
 *  - debounced write on every registry change,
 *  - immediate write when the page is hidden or closed,
 *  - tracks the active scene via the 'current-scene-ready' EventBus event.
 *  Safe to call multiple times (React StrictMode remounts the game) — the
 *  previous installation is torn down first. */
export function installAutoSave(
  game: Phaser.Game,
  initialScene: SceneKey | null = null
): void {
  autoSaveTeardown?.();
  autoSaveTeardown = null;

  trackedSceneKey = initialScene;
  const registry = game.registry;

  const onSceneReady = (scene: Phaser.Scene) => {
    const key = scene.scene.key;
    if (isSceneKey(key)) trackedSceneKey = key;
  };
  EventBus.on('current-scene-ready', onSceneReady);

  let debounceHandle: ReturnType<typeof setTimeout> | undefined;
  const scheduleSave = (): void => {
    clearTimeout(debounceHandle);
    debounceHandle = setTimeout(
      () => saveGame(registry),
      AUTO_SAVE_DEBOUNCE_MS
    );
  };
  const onRegistryChange = (): void => scheduleSave();
  registry.events.on(Phaser.Data.Events.CHANGE_DATA, onRegistryChange);
  registry.events.on(Phaser.Data.Events.SET_DATA, onRegistryChange);

  const flushSave = (): void => {
    clearTimeout(debounceHandle);
    saveGame(registry);
  };
  window.addEventListener('pagehide', flushSave);
  window.addEventListener('beforeunload', flushSave);

  autoSaveTeardown = () => {
    clearTimeout(debounceHandle);
    registry.events.off(Phaser.Data.Events.CHANGE_DATA, onRegistryChange);
    registry.events.off(Phaser.Data.Events.SET_DATA, onRegistryChange);
    EventBus.off('current-scene-ready', onSceneReady);
    window.removeEventListener('pagehide', flushSave);
    window.removeEventListener('beforeunload', flushSave);
  };

  // Write once right away so a fresh game creates its save file immediately.
  flushSave();
}
