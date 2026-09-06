// game/state/worldSim.ts
import * as Phaser from 'phaser';
import { Core } from 'phaser';
import { emit, on, off } from '../helpers/events';
import type { VillageAction, ConversionProgress } from '../helpers/events';
import { getStat, setStat } from './gameState';
import { addResources, getResources } from './secondary/resources';
import { CONVERSION_RECIPES } from './secondary/conversions';
import type { CreatureType } from './secondary/creatures';
import {
  WORKSHOP_UPGRADES,
  setUpgradeState,
  getUpgradeCost,
  type WorkshopUpgradeKey,
} from './secondary/upgrades';
import {
  getConversionSaveData,
  setConversionSaveData,
  getRatTaskSaveData,
  setRatTaskSaveData,
  getVillageGrowthSaveData,
  setVillageGrowthSaveData,
} from './save';
import {
  NECROMANCER_POSITION,
  VILLAGE_CONFIGS,
  VILLAGE_POPULATION_KEYS,
  getVillageConfig,
  isVillageId,
  type VillageId,
} from '../config/villages';

/**
 * World-level simulation that keeps the game running no matter which scene is
 * active (or even after a page refresh):
 *
 *  - Workshop corpse conversions advance while the player is anywhere.
 *  - Location_1 rat raids advance (travel, action, return) everywhere.
 *  - Village populations keep growing and decaying everywhere.
 *
 * Timing is wall-clock (`Date.now()` + start/end timestamps), not per-frame
 * deltas, so progress stays correct across scene switches, tab throttling and
 * page reloads. The sim is driven by the game-level STEP event, which fires
 * every frame regardless of the active scene.
 *
 * Scenes became renderers: Location_1 draws the horde / progress bar / travel
 * line from `getRatRaidRenderState`, Workshop is a hub for the conversion +
 * upgrade UI. The registry remains the source of truth for stats; this module
 * owns the in-flight queues/raids and mirrors them to the save layer.
 */

// --- Conversion tasks --------------------------------------------------------

/** One paid-for "Raise Dead" conversion, ticking down in wall-clock time. */
export interface ConversionTask {
  id: number;
  /** Which creature this conversion produces (per CONVERSION_RECIPES). */
  creatureType: CreatureType;
  /** Epoch ms when the conversion started. */
  startAt: number;
  /** Conversion duration in ms, captured when the task was started. */
  durationMs: number;
}

// --- Rat raids ---------------------------------------------------------------

export type RatRaidPhase = 'moving-to-target' | 'in-progress' | 'returning';

/** The single in-flight rat raid, described entirely by wall-clock timestamps. */
export interface RatRaid {
  action: VillageAction;
  villageId: VillageId;
  phase: RatRaidPhase;
  /** Movement segment start point (world coords). */
  startX: number;
  startY: number;
  /** Movement segment destination (world coords). */
  endX: number;
  endY: number;
  /** Epoch ms the current movement segment started. */
  moveStartAt: number;
  /** Duration of the current movement segment, in ms. */
  moveDurationMs: number;
  /** Epoch ms the action completes (only meaningful while 'in-progress'). */
  actionEndAt: number;
  /** Action duration, in ms (only meaningful while 'in-progress'). */
  actionDurationMs: number;
}

/** What the UI needs to render the raid on any given frame. */
export interface RatRaidRenderState {
  phase: RatRaidPhase;
  x: number;
  y: number;
  visible: boolean;
  /** 0..1 fill for the action progress bar (meaningful while 'in-progress'). */
  barProgress: number;
  /** Village world position where the progress bar should be drawn. */
  barX: number;
  barY: number;
  /** End of the current movement segment (draw the travel line to here). */
  toX: number;
  toY: number;
}

/** Snapshot pushed to the Workshop React UI. */
export interface ConversionUiState {
  activeCount: number;
  queuedCount: number;
  maxConcurrent: number;
  maxQueue: number;
  tasks: ConversionProgress[];
}

// --- Village growth tuning ---------------------------------------------------

const GROWTH_INTERVAL_MS = 5000;
const DECAY_BASE_CHANCE = 0.2;
const DECAY_PERCENT_MIN = 0.01;
const DECAY_PERCENT_MAX = 0.06;
/** Safety cap: never replay more growth ticks per frame than ~14 hours. */
const MAX_GROWTH_TICKS = 10_000;

/** How often the conversion progress list is pushed to the UI. */
const PROGRESS_EMIT_INTERVAL_MS = 500;

// --- Module state ------------------------------------------------------------

let registry: Phaser.Data.DataManager | null = null;

let conversionTasks: ConversionTask[] = [];
let nextTaskId = 0;

let ratRaid: RatRaid | null = null;

/** villageId → epoch ms the village last grew. */
let lastGrowthAt: Record<VillageId, number> = {} as Record<VillageId, number>;

/** Village ids whose population the player has revealed this session. */
const scoutedVillageIds = new Set<VillageId>();

let lastProgressEmitAt = 0;

let teardownWorldSim: (() => void) | null = null;

// --- Install / teardown -------------------------------------------------------

/** Starts the world simulation. Safe to call repeatedly (React StrictMode
 *  remounts the game) — the previous installation is torn down first. */
export function installWorldSim(game: Phaser.Game): void {
  teardownWorldSim?.();
  teardownWorldSim = null;

  registry = game.registry;

  // Restore in-flight work from the save layer. The Preloader has already
  // loaded the save into these snapshots via initGameStateFromSave.
  const { tasks, nextTaskId: savedNextTaskId } = getConversionSaveData();
  conversionTasks = tasks.map((task) => ({ ...task }));
  const maxSavedId = conversionTasks.reduce(
    (max, task) => Math.max(max, task.id),
    -1
  );
  nextTaskId = Math.max(savedNextTaskId, maxSavedId + 1);

  ratRaid = getRatTaskSaveData();

  const savedGrowth = getVillageGrowthSaveData();
  const now = Date.now();
  lastGrowthAt = {} as Record<VillageId, number>;
  for (const cfg of VILLAGE_CONFIGS) {
    const saved = savedGrowth[cfg.id];
    lastGrowthAt[cfg.id] =
      typeof saved === 'number' && Number.isFinite(saved)
        ? Math.min(saved, now)
        : now;
  }

  lastProgressEmitAt = now;

  const onStep = (): void => tick(Date.now());
  game.events.on(Core.Events.STEP, onStep);

  on('convert-corpse', handleConvertCorpse);
  on('purchase-upgrade', handlePurchaseUpgrade);
  on('village-action', handleVillageAction);

  refreshUpgradeState();

  // Safety net: sweep any transitions that fell due while the page was closed.
  tick(Date.now());

  teardownWorldSim = () => {
    game.events.off(Core.Events.STEP, onStep);
    off('convert-corpse', handleConvertCorpse);
    off('purchase-upgrade', handlePurchaseUpgrade);
    off('village-action', handleVillageAction);
    teardownWorldSim = null;
    registry = null;
  };
}

/** Resets every piece of simulation state ("new game"). */
export function resetWorldSim(target: Phaser.Data.DataManager): void {
  registry = target;
  conversionTasks = [];
  nextTaskId = 0;
  ratRaid = null;
  scoutedVillageIds.clear();
  lastProgressEmitAt = Date.now();

  const now = Date.now();
  lastGrowthAt = {} as Record<VillageId, number>;
  for (const cfg of VILLAGE_CONFIGS) lastGrowthAt[cfg.id] = now;

  setConversionSaveData([], 0);
  setRatTaskSaveData(null);
  setVillageGrowthSaveData(lastGrowthAt);

  emit('rats-busy', false);
  emitConversionUiState();
  refreshUpgradeState();
}

// --- Conversions ------------------------------------------------------------

function getMaxConcurrent(): number {
  return getStat(
    registry as Phaser.Data.DataManager,
    'maxConcurrentConversions'
  );
}

function getMaxConversionQueue(): number {
  return getStat(registry as Phaser.Data.DataManager, 'maxConversionQueue');
}

function getConversionDuration(): number {
  return getStat(
    registry as Phaser.Data.DataManager,
    'corpseConversionDuration'
  );
}

/** Active vs queued split: only the first `maxConcurrent` tasks run. */
function getQueueCounts(maxConcurrent: number): {
  activeCount: number;
  queuedCount: number;
} {
  const activeCount = Math.min(conversionTasks.length, maxConcurrent);
  return {
    activeCount,
    queuedCount: conversionTasks.length - activeCount,
  };
}

function buildProgressList(
  now: number,
  maxConcurrent: number
): ConversionProgress[] {
  const activeCount = Math.min(conversionTasks.length, maxConcurrent);
  return conversionTasks.map((task, index) => {
    const active = index < activeCount;
    const remainingMs = task.startAt + task.durationMs - now;
    return {
      id: task.id,
      progress: active
        ? Math.min(1, Math.max(0, 1 - remainingMs / task.durationMs))
        : 0,
      secondsLeft: active ? Math.max(0, Math.ceil(remainingMs / 1000)) : 0,
      queued: !active,
      creatureType: task.creatureType,
    };
  });
}

/** Synchronous pull for the Workshop UI (e.g. a useState initializer), so a
 *  freshly mounted component can render the real queue without waiting for an
 *  event. */
export function getConversionUiState(): ConversionUiState {
  if (!registry) {
    return {
      activeCount: 0,
      queuedCount: 0,
      maxConcurrent: 1,
      maxQueue: 1,
      tasks: [],
    };
  }
  const maxConcurrent = getMaxConcurrent();
  const maxQueue = getMaxConversionQueue();
  const { activeCount, queuedCount } = getQueueCounts(maxConcurrent);
  return {
    activeCount,
    queuedCount,
    maxConcurrent,
    maxQueue,
    tasks: buildProgressList(Date.now(), maxConcurrent),
  };
}

/** Re-broadcasts the current conversion state (used when entering the Workshop
 *  or after a reset, so any mounted UI resyncs). */
export function emitConversionUiState(): void {
  if (!registry) return;
  const { activeCount, queuedCount, maxConcurrent, maxQueue, tasks } =
    getConversionUiState();
  emit('corpse-conversion-started', {
    activeCount,
    queuedCount,
    maxConcurrent,
    maxQueue,
  });
  emit('corpse-conversion-progress', tasks);
}

function emitConversionProgress(now: number): void {
  lastProgressEmitAt = now;
  emit(
    'corpse-conversion-progress',
    buildProgressList(now, getMaxConcurrent())
  );
}

function maybeEmitConversionProgress(now: number): void {
  if (conversionTasks.length === 0) {
    lastProgressEmitAt = now;
    return;
  }
  if (now - lastProgressEmitAt >= PROGRESS_EMIT_INTERVAL_MS) {
    emitConversionProgress(now);
  }
}

function syncConversionSaveData(): void {
  setConversionSaveData(conversionTasks, nextTaskId);
}

// --- The tick ----------------------------------------------------------------

/** Advances conversions, raids and village growth to `now`. Idempotent and
 *  cheap, so it is safe to call from the game STEP handler every frame (and
 *  once from `installWorldSim` on boot). */
function tick(now: number): void {
  if (!registry) return;
  tickConversions(now);
  tickRaid(now);
  tickVillageGrowth(now);
}

// --- Conversions: task handling ----------------------------------------------

const handleConvertCorpse = (payload: { creatureType: CreatureType }): void => {
  const recipe = CONVERSION_RECIPES[payload.creatureType];
  if (!recipe || !registry) return;

  const maxConcurrent = getMaxConcurrent();
  const maxQueue = getMaxConversionQueue();

  // Tasks beyond maxConcurrent go into the queue, up to maxQueue slots.
  if (conversionTasks.length >= maxConcurrent + maxQueue) return;

  const resources = getResources(registry);
  if (resources[recipe.costResource] < recipe.costAmount) return;

  addResources(registry, { [recipe.costResource]: -recipe.costAmount });

  conversionTasks.push({
    id: nextTaskId++,
    creatureType: payload.creatureType,
    startAt: Date.now(),
    durationMs: getConversionDuration(),
  });
  syncConversionSaveData();

  const { activeCount, queuedCount } = getQueueCounts(maxConcurrent);
  emit('corpse-conversion-started', {
    activeCount,
    queuedCount,
    maxConcurrent,
    maxQueue,
  });
  emitConversionProgress(Date.now());
};

function tickConversions(now: number): void {
  if (conversionTasks.length === 0 || !registry) return;
  const started = registry;

  const maxConcurrent = getMaxConcurrent();
  const completed = conversionTasks
    .slice(0, maxConcurrent)
    .filter((task) => now >= task.startAt + task.durationMs);

  if (completed.length > 0) {
    // A mixed queue can complete several creature types at once — group them
    // and apply each recipe to its own stat.
    const completedByType = new Map<CreatureType, number>();
    for (const task of completed) {
      completedByType.set(
        task.creatureType,
        (completedByType.get(task.creatureType) ?? 0) + 1
      );
    }
    completedByType.forEach((count, creatureType) => {
      const recipe = CONVERSION_RECIPES[creatureType];
      const currentAmount = getStat(started, recipe.amountStat);
      setStat(
        started,
        recipe.amountStat,
        currentAmount + count * recipe.yieldAmount
      );
    });

    conversionTasks = conversionTasks.filter(
      (task) => !completed.includes(task)
    );
    syncConversionSaveData();

    const { activeCount, queuedCount } = getQueueCounts(maxConcurrent);
    emit('corpse-conversion-complete', {
      completedCount: completed.length,
      activeCount,
      queuedCount,
      maxConcurrent,
      maxQueue: getMaxConversionQueue(),
      remainingTasks: buildProgressList(now, maxConcurrent),
    });
    emit('creature-stats-changed');
    emitConversionProgress(now);
  }

  maybeEmitConversionProgress(now);
}

// --- Rat raids ---------------------------------------------------------------

function getRatCount(): number {
  return getStat(registry as Phaser.Data.DataManager, 'zombieRatsAmount');
}

function getRatSpeed(): number {
  return getStat(registry as Phaser.Data.DataManager, 'ratSpeed');
}

function getActionDuration(action: VillageAction): number {
  switch (action) {
    case 'attack':
      return getStat(registry as Phaser.Data.DataManager, 'attackDuration');
    case 'loot':
      return getStat(registry as Phaser.Data.DataManager, 'lootDuration');
    case 'scout':
      return getStat(registry as Phaser.Data.DataManager, 'scoutDuration');
  }
}

function travelDuration(distance: number, speed: number): number {
  if (speed <= 0) return 1;
  return (distance / speed) * 1000;
}

const handleVillageAction = (payload: {
  action: VillageAction;
  villageId: string;
}): void => {
  if (!isVillageId(payload.villageId)) return;
  sendRats(payload.action, payload.villageId);
};

/** Starts a raid if possible (idle horde with at least one rat). */
export function sendRats(action: VillageAction, villageId: VillageId): void {
  if (!registry) return;
  // One raid at a time — the React UI also blocks via 'rats-busy', but this
  // guards against a stale UI state, so a second send can't corrupt the task.
  if (ratRaid) return;
  if (getRatCount() < 1) return;

  const village = getVillageConfig(villageId);
  const start = NECROMANCER_POSITION;
  const now = Date.now();

  ratRaid = {
    action,
    villageId,
    phase: 'moving-to-target',
    startX: start.x,
    startY: start.y,
    endX: village.x,
    endY: village.y,
    moveStartAt: now,
    moveDurationMs: travelDuration(
      Phaser.Math.Distance.Between(start.x, start.y, village.x, village.y),
      getRatSpeed()
    ),
    actionEndAt: 0,
    actionDurationMs: 0,
  };
  emit('rats-busy', true);
  persistRaid();
}

function persistRaid(): void {
  setRatTaskSaveData(ratRaid ? { ...ratRaid } : null);
}

function tickRaid(now: number): void {
  const raid = ratRaid;
  if (!raid) return;

  switch (raid.phase) {
    case 'moving-to-target':
      if (now >= raid.moveStartAt + raid.moveDurationMs) {
        // Arrived: start the action.
        raid.phase = 'in-progress';
        raid.actionDurationMs = getActionDuration(raid.action);
        raid.actionEndAt = now + raid.actionDurationMs;
        persistRaid();
      }
      break;

    case 'in-progress':
      if (now >= raid.actionEndAt) {
        const wiped = resolveRaidAction(raid.action, raid.villageId);
        if (wiped) {
          // Horde wiped out mid-raid (attack) — no return trip.
          ratRaid = null;
          emit('rats-busy', false);
          persistRaid();
        } else {
          beginReturnTrip(raid, now);
        }
      }
      break;

    case 'returning':
      if (now >= raid.moveStartAt + raid.moveDurationMs) {
        const villageId = raid.villageId;
        ratRaid = null;
        emit('rats-returned', { villageId });
        emit('rats-busy', false);
        persistRaid();
      }
      break;
  }
}

function beginReturnTrip(raid: RatRaid, now: number): void {
  const village = getVillageConfig(raid.villageId);
  const home = NECROMANCER_POSITION;
  raid.phase = 'returning';
  raid.startX = village.x;
  raid.startY = village.y;
  raid.endX = home.x;
  raid.endY = home.y;
  raid.moveStartAt = now;
  raid.moveDurationMs = travelDuration(
    Phaser.Math.Distance.Between(village.x, village.y, home.x, home.y),
    getRatSpeed()
  );
  persistRaid();
}

/** Runs the raid's action when the in-progress timer elapses. Returns true
 *  when the horde was wiped out and must not return home. */
function resolveRaidAction(
  action: VillageAction,
  villageId: VillageId
): boolean {
  if (!registry) return false;

  if (action === 'scout') {
    scoutedVillageIds.add(villageId);
    emit('village-scouted', { villageId });
    return false;
  }

  if (action === 'loot') {
    const looted = Phaser.Math.Between(1, getRatCount());
    addResources(registry, { ratCorpses: looted });
    emit('village-looted', { villageId, lootedCorpses: looted });
    return false;
  }

  // attack
  const strength = Math.max(0, getRatCount() * getStat(registry, 'ratPower'));
  const possibleKills = Math.trunc(strength / 10);

  if (possibleKills < 1) {
    setStat(registry, 'zombieRatsAmount', 0);
    emit('creature-stats-changed');
    return true;
  }

  const population = Math.trunc(
    getStat(registry, VILLAGE_POPULATION_KEYS[villageId])
  );
  const kills = Math.min(population, Phaser.Math.Between(1, possibleKills));
  const unitDeaths = Phaser.Math.Between(1, getRatCount());

  setStat(
    registry,
    VILLAGE_POPULATION_KEYS[villageId],
    Math.max(0, population - kills)
  );
  addResources(registry, { humanCorpses: kills });
  setStat(registry, 'zombieRatsAmount', getRatCount() - unitDeaths);
  emit('creature-stats-changed');
  emit('village-attacked', { villageId, kills });

  return getRatCount() < 1;
}

/** Whether a raid is currently in flight (used to re-sync 'rats-busy' when
 *  the Location_1 UI mounts). */
export function isRaidActive(): boolean {
  return ratRaid !== null;
}

/** Was this village scouted this session? (Shows its population on the map.) */
export function isVillageScouted(id: VillageId): boolean {
  return scoutedVillageIds.has(id);
}

/** Read-only render snapshot for the Location_1 scene. */
export function getRatRaidRenderState(now: number): RatRaidRenderState | null {
  const raid = ratRaid;
  if (!raid) return null;

  const village = getVillageConfig(raid.villageId);

  if (raid.phase === 'in-progress') {
    const actionStart = raid.actionEndAt - raid.actionDurationMs;
    const progress =
      raid.actionDurationMs > 0
        ? Phaser.Math.Clamp((now - actionStart) / raid.actionDurationMs, 0, 1)
        : 1;
    return {
      phase: 'in-progress',
      x: village.x,
      y: village.y,
      visible: false,
      barProgress: progress,
      barX: village.x,
      barY: village.y,
      toX: village.x,
      toY: village.y,
    };
  }

  const t =
    raid.moveDurationMs > 0
      ? Phaser.Math.Clamp((now - raid.moveStartAt) / raid.moveDurationMs, 0, 1)
      : 1;

  return {
    phase: raid.phase,
    x: Phaser.Math.Linear(raid.startX, raid.endX, t),
    y: Phaser.Math.Linear(raid.startY, raid.endY, t),
    visible: true,
    barProgress: 0,
    barX: village.x,
    barY: village.y,
    toX: raid.endX,
    toY: raid.endY,
  };
}

// --- Village population growth ------------------------------------------------

function tickVillageGrowth(now: number): void {
  if (!registry) return;
  let changed = false;

  for (const cfg of VILLAGE_CONFIGS) {
    const last = lastGrowthAt[cfg.id] ?? now;
    if (last > now) {
      // Clock-skew guard: never jump forward from a future timestamp.
      lastGrowthAt[cfg.id] = now;
      continue;
    }

    const elapsed = now - last;
    if (elapsed < GROWTH_INTERVAL_MS) continue;

    const dueTicks = Math.floor(elapsed / GROWTH_INTERVAL_MS);
    const tickCount = Math.min(dueTicks, MAX_GROWTH_TICKS);
    if (tickCount < 1) continue;

    let current = getStat(registry, VILLAGE_POPULATION_KEYS[cfg.id]);
    for (let i = 0; i < tickCount; i++) {
      if (cfg.maxPopulation <= 0 || cfg.growthRate <= 0) break;
      // Logistic growth — naturally slows near maxPopulation.
      const growth =
        cfg.growthRate * current * (1 - current / cfg.maxPopulation);
      current = Math.max(current + growth, 0);
      // Occasional decay dip.
      if (Math.random() < DECAY_BASE_CHANCE) {
        const decayPercent = Phaser.Math.FloatBetween(
          DECAY_PERCENT_MIN,
          DECAY_PERCENT_MAX
        );
        current = Math.max(current - current * decayPercent, 0);
      }
    }

    setStat(registry, VILLAGE_POPULATION_KEYS[cfg.id], current);
    // Carry the fractional remainder, and drop any backlog past the cap.
    lastGrowthAt[cfg.id] = now - (elapsed % GROWTH_INTERVAL_MS);
    changed = true;
  }

  if (changed) setVillageGrowthSaveData(lastGrowthAt);
}

// --- Upgrades ----------------------------------------------------------------

/** Recomputes the upgrade list from the registry and pushes it to the UI. */
export function refreshUpgradeState(): void {
  if (!registry) return;
  const started = registry;
  const upgradeKeys = Object.keys(WORKSHOP_UPGRADES) as WorkshopUpgradeKey[];
  const state = upgradeKeys.map((upgradeKey) => {
    const config = WORKSHOP_UPGRADES[upgradeKey];
    return {
      upgradeKey,
      label: config.label,
      currentValue: getStat(started, config.key),
      cost: getUpgradeCost(started, upgradeKey),
      costResource: config.costResource,
      tree: config.tree,
    };
  });
  setUpgradeState(state);
}

const handlePurchaseUpgrade = (payload: {
  upgradeKey: WorkshopUpgradeKey;
}): void => {
  if (!registry) return;
  const config = WORKSHOP_UPGRADES[payload.upgradeKey];
  if (!config) return;

  const cost = getUpgradeCost(registry, payload.upgradeKey);
  const resources = getResources(registry);
  if (resources[config.costResource] < cost) return;

  addResources(registry, { [config.costResource]: -cost });
  setStat(
    registry,
    config.key,
    getStat(registry, config.key) + config.increment
  );

  refreshUpgradeState();
  emit('creature-stats-changed');
};
