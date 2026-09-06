// game/state/worldSim.ts
import * as Phaser from 'phaser';
import { Core } from 'phaser';
import { emit, on, off } from '../helpers/events';
import type { VillageAction, ConversionProgress } from '../helpers/events';
import { getStat, setStat, type GameState } from './gameState';
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
  setGroupSaveData,
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

// --- Creature stat mapping ---------------------------------------------------

/** Maps each creature type to its registry stat keys. Add new creature types here. */
const CREATURE_STAT_MAP: Record<CreatureType, { amount: string; speed: string; power: string }> = {
  zombieRats: { amount: 'zombieRatsAmount', speed: 'ratSpeed', power: 'ratPower' },
  ghouls: { amount: 'ghoulsAmount', speed: 'ghoulSpeed', power: 'ghoulPower' },
};

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
  /** For attack: villagers killed at the village, subtracted from population when rats return. */
  pendingKills?: number;
  /** Group this raid belongs to. */
  groupId: number;
  /** Snapshot of creatures on this raid (by type). */
  creatures: Partial<Record<CreatureType, number>>;
}

/** What the UI needs to render the raid on any given frame. */
export interface RatRaidRenderState {
  phase: RatRaidPhase;
  x: number;
  y: number;
  visible: boolean;
  /** Total creatures in the raiding group (rendered under the horde sprite). */
  creatureCount: number;
  /** 0..1 fill for the action progress bar (meaningful while 'in-progress'). */
  barProgress: number;
  /** Village world position where the progress bar should be drawn. */
  barX: number;
  barY: number;
  /** End of the current movement segment (draw the travel line to here). */
  toX: number;
  toY: number;
}

/** A player-organized group of creatures that can be sent on raids. */
export interface CreatureGroup {
  id: number;
  creatures: Partial<Record<CreatureType, number>>;
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

let raids: RatRaid[] = [];

// --- Groups ------------------------------------------------------------------

let groups: CreatureGroup[] = [];
let nextGroupId = 0;

/** villageId → epoch ms the village last grew. */
let lastGrowthAt: Record<VillageId, number> = {} as Record<VillageId, number>;

/** Village ids whose population the player has revealed this session. */
const scoutedVillageIds = new Set<VillageId>();

/**
 * Population captured at the moment each village was scouted. The display
 * uses this frozen snapshot instead of the live registry value, so the
 * number only changes when the player scouts again.
 */
const scoutedPopulation: Map<VillageId, number> = new Map();

/** Epoch ms of each village's most recent scout. */
const scoutedAt: Map<VillageId, number> = new Map();

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

  raids = getRatTaskSaveData();

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
  raids = [];
  groups = [];
  nextGroupId = 0;
  scoutedVillageIds.clear();
  scoutedPopulation.clear();
  scoutedAt.clear();
  lastProgressEmitAt = Date.now();

  const now = Date.now();
  lastGrowthAt = {} as Record<VillageId, number>;
  for (const cfg of VILLAGE_CONFIGS) lastGrowthAt[cfg.id] = now;

  setConversionSaveData([], 0);
  setRatTaskSaveData([]);
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
  tickRaids(now);
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

/** Total creatures in a group (sum across types). */
function getGroupSize(group: Partial<Record<CreatureType, number>>): number {
  return Object.values(group).reduce((sum, count) => sum + (count || 0), 0);
}

/** Combined combat strength of a group = sum of (count * power) for each type. */
function getGroupStrength(group: Partial<Record<CreatureType, number>>): number {
  if (!registry) return 0;
  let strength = 0;
  for (const [type, count] of Object.entries(group)) {
    if (count && count > 0) {
      strength += count * getStat(registry, CREATURE_STAT_MAP[type as CreatureType].power as keyof GameState);
    }
  }
  return strength;
}

/** Movement speed of a group = slowest creature type present. */
function getGroupSpeed(group: Partial<Record<CreatureType, number>>): number {
  if (!registry) return 0;
  let minSpeed = Infinity;
  for (const [type, count] of Object.entries(group)) {
    if (count && count > 0) {
      minSpeed = Math.min(minSpeed, getStat(registry, CREATURE_STAT_MAP[type as CreatureType].speed as keyof GameState));
    }
  }
  return minSpeed === Infinity ? 0 : minSpeed;
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
  groupId: number;
}): void => {
  if (!isVillageId(payload.villageId)) return;
  sendGroup(payload.action, payload.villageId, payload.groupId);
};

/** Starts a raid for a group if the group exists, has creatures, and isn't already raiding. */
export function sendGroup(action: VillageAction, villageId: VillageId, groupId: number): void {
  if (!registry) return;
  const group = groups.find((g) => g.id === groupId);
  if (!group) return;
  if (getGroupSize(group.creatures) < 1) return;
  // Prevent sending the same group twice.
  if (raids.some((r) => r.groupId === groupId)) return;

  const village = getVillageConfig(villageId);
  const start = NECROMANCER_POSITION;
  const now = Date.now();
  const creatures = { ...group.creatures };
  const speed = getGroupSpeed(creatures);

  // Subtract creatures from registry (they're now in-flight).
  for (const [type, count] of Object.entries(creatures) as [CreatureType, number][]) {
    if (count) {
      const statKey = CREATURE_STAT_MAP[type as CreatureType].amount as keyof GameState;
      const current = getStat(registry, statKey);
      setStat(registry, statKey, Math.max(0, current - count));
    }
  }
  emit('creature-stats-changed');

  // Clear the group's creatures (they're now on the raid).
  group.creatures = {};

  raids.push({
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
      speed
    ),
    actionEndAt: 0,
    actionDurationMs: 0,
    groupId,
    creatures,
  });
  persistRaid();
}

function persistRaid(): void {
  setRatTaskSaveData(raids.map((r) => ({ ...r })));
}

function persistGroups(): void {
  setGroupSaveData(groups);
}

function tickRaids(now: number): void {
  for (let i = raids.length - 1; i >= 0; i--) {
    const raid = raids[i];

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
        const wiped = checkWipe(raid);
        if (wiped) {
          // Horde wiped out mid-raid (attack) — no return trip.
          raids.splice(i, 1);
          persistRaid();
        } else {
          beginReturnTrip(raid, now);
        }
      }
      break;

    case 'returning':
      if (now >= raid.moveStartAt + raid.moveDurationMs) {
        const villageId = raid.villageId;
        applyRaidAction(raid);
        returnGroupToPool(raid);
        raids.splice(i, 1);
        emit('rats-returned', { villageId });
        persistRaid();
      }
      break;
    }
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
    getGroupSpeed(raid.creatures)
  );
  persistRaid();
}

/** Returns surviving creatures from a completed raid back to their group. */
function returnGroupToPool(raid: RatRaid): void {
  if (!registry) return;
  const group = groups.find((g) => g.id === raid.groupId);
  if (!group) {
    // Group was deleted while raiding — creatures go to unassigned pool.
    for (const [type, count] of Object.entries(raid.creatures) as [CreatureType, number][]) {
      if (count) {
        const statKey = CREATURE_STAT_MAP[type as CreatureType].amount as keyof GameState;
        const current = getStat(registry, statKey);
        setStat(registry, statKey, current + count);
      }
    }
  } else {
    for (const [type, count] of Object.entries(raid.creatures) as [CreatureType, number][]) {
      if (count) {
        group.creatures[type] = (group.creatures[type] || 0) + count;
      }
    }
  }
  emit('creature-stats-changed');
  persistGroups();
}

/** Checks whether the horde is wiped out at the village (attack only). Returns true
 *  when the horde was destroyed and must not return home. For attack, also applies
 *  horde losses (unitDeaths) immediately and stores pending population kills. */
function checkWipe(raid: RatRaid): boolean {
  if (!registry) return false;

  const { action, villageId, creatures } = raid;

  // Only attack can wipe the horde; scout and loot never do.
  if (action !== 'attack') return false;

  const strength = Math.max(0, getGroupStrength(creatures));
  const possibleKills = Math.trunc(strength / 10);

  if (possibleKills < 1) {
    // Attack too weak — the whole group dies at the village.
    raid.creatures = {};
    return true;
  }

  // Group survives but takes proportional losses. Compute kills now but defer
  // their application to the population until return.
  const population = Math.trunc(
    getStat(registry, VILLAGE_POPULATION_KEYS[villageId])
  );
  const kills = Math.min(population, Phaser.Math.Between(1, possibleKills));
  const totalCreatures = getGroupSize(creatures);
  const unitDeaths = Phaser.Math.Between(1, totalCreatures);

  // Apply losses proportionally across creature types.
  applyLosses(creatures, unitDeaths);

  // Store kills to apply to population when group returns home.
  raid.pendingKills = kills;

  return getGroupSize(creatures) < 1;
}

/** Applies losses proportionally across creature types in a group. */
function applyLosses(
  creatures: Partial<Record<CreatureType, number>>,
  deaths: number
): void {
  const total = getGroupSize(creatures);
  if (total <= 0 || deaths <= 0) return;
  let remaining = Math.min(deaths, total);
  const types = Object.keys(creatures) as CreatureType[];
  // Distribute losses round-robin style for fairness.
  let idx = 0;
  while (remaining > 0 && types.length > 0) {
    const type = types[idx % types.length];
    const count = creatures[type] || 0;
    if (count > 0) {
      creatures[type] = count - 1;
      remaining--;
    }
    idx++;
    // Safety: break if all creatures are dead.
    if (getGroupSize(creatures) <= 0) break;
  }
}

/** Applies the raid's effects when the rats successfully return home. Deferred
 *  from checkWipe so the player sees the outcome when the horde arrives back. */
function applyRaidAction(raid: RatRaid): void {
  if (!registry) return;

  const { action, villageId, creatures } = raid;

  if (action === 'scout') {
    scoutedVillageIds.add(villageId);
    // Freeze the population at scout time — the displayed number stays
    // fixed until the next scout, while the real population keeps growing.
    scoutedPopulation.set(
      villageId,
      Math.trunc(getStat(registry, VILLAGE_POPULATION_KEYS[villageId]))
    );
    scoutedAt.set(villageId, Date.now());
    emit('village-scouted', { villageId });
    return;
  }

  if (action === 'loot') {
    const totalCreatures = getGroupSize(creatures);
    const looted = totalCreatures > 0 ? Phaser.Math.Between(1, totalCreatures) : 0;
    if (looted > 0) {
      addResources(registry, { ratCorpses: looted });
      emit('village-looted', { villageId, lootedCorpses: looted });
    }
    return;
  }

  // attack — apply the kills computed at the village (stored in pendingKills)
  const kills = raid.pendingKills ?? 0;
  if (kills < 1) return;

  const population = Math.trunc(
    getStat(registry, VILLAGE_POPULATION_KEYS[villageId])
  );

  setStat(
    registry,
    VILLAGE_POPULATION_KEYS[villageId],
    Math.max(0, population - kills)
  );
  addResources(registry, { humanCorpses: kills });
  emit('village-attacked', { villageId, kills });
}

/** Whether a raid is currently in flight (used to re-sync 'rats-busy' when
 *  the Location_1 UI mounts). */
export function isRaidActive(): boolean {
  return raids.length > 0;
}

export function isGroupRaiding(groupId: number): boolean {
  return raids.some((r) => r.groupId === groupId);
}

export function getRaids(): RatRaid[] {
  return raids.map((r) => ({ ...r }));
}

/** Returns current creature stats from the registry (available/unassigned creatures). */
export function getCreatureStatsSnapshot(): import('./secondary/creatures').AllCreatureStats | null {
  if (!registry) return null;
  return {
    zombieRats: {
      amount: getStat(registry, 'zombieRatsAmount'),
      speed: getStat(registry, 'ratSpeed'),
      power: getStat(registry, 'ratPower'),
    },
    ghouls: {
      amount: getStat(registry, 'ghoulsAmount'),
      speed: getStat(registry, 'ghoulSpeed'),
      power: getStat(registry, 'ghoulPower'),
    },
  };
}

/** Was this village scouted this session? (Shows its population on the map.) */
export function isVillageScouted(id: VillageId): boolean {
  return scoutedVillageIds.has(id);
}

/**
 * Population captured at the moment the village was scouted. The real
 * population keeps growing in the background, but the displayed number is
 * frozen until the next scout — the seconds-since-scout label shows how
 * stale the intel is.
 */
export function getScoutedPopulation(id: VillageId): number {
  return scoutedPopulation.get(id) ?? 0;
}

/** Epoch ms of the last scout of this village (undefined if never scouted). */
export function getScoutedAt(id: VillageId): number | undefined {
  return scoutedAt.get(id);
}

// --- Group management --------------------------------------------------------

export function getGroups(): CreatureGroup[] {
  return groups.map((g) => ({ ...g, creatures: { ...g.creatures } }));
}

export function getMaxGroups(): number {
  if (!registry) return 1;
  return getStat(registry, 'maxGroups');
}

export function getMaxUnitsPerGroup(): number {
  if (!registry) return 10;
  return getStat(registry, 'maxUnitsPerGroup');
}

export function createGroup(): boolean {
  if (!registry) return false;
  if (groups.length >= getMaxGroups()) return false;
  groups.push({ id: nextGroupId++, creatures: {} });
  persistGroups();
  emit('groups-changed');
  return true;
}

export function deleteGroup(groupId: number): boolean {
  const idx = groups.findIndex((g) => g.id === groupId);
  if (idx === -1) return false;
  // Return creatures to pool.
  const group = groups[idx];
  for (const [type, count] of Object.entries(group.creatures) as [CreatureType, number][]) {
    if (count) {
      const statKey = CREATURE_STAT_MAP[type as CreatureType].amount as keyof GameState;
      const current = getStat(registry as Phaser.Data.DataManager, statKey);
      setStat(registry as Phaser.Data.DataManager, statKey, current + count);
    }
  }
  groups.splice(idx, 1);
  emit('creature-stats-changed');
  persistGroups();
  emit('groups-changed');
  return true;
}

export function assignCreature(
  groupId: number,
  creatureType: CreatureType,
  count: number
): boolean {
  if (!registry || count <= 0) return false;
  const group = groups.find((g) => g.id === groupId);
  if (!group) return false;
  const statKey = CREATURE_STAT_MAP[creatureType].amount as keyof GameState;
  const available = getStat(registry as Phaser.Data.DataManager, statKey);
  if (available < count) return false;
  // Check group capacity.
  const currentGroupSize = getGroupSize(group.creatures);
  if (currentGroupSize + count > getMaxUnitsPerGroup()) return false;
  // Subtract from pool, add to group.
  setStat(registry as Phaser.Data.DataManager, statKey, available - count);
  group.creatures[creatureType] = (group.creatures[creatureType] || 0) + count;
  emit('creature-stats-changed');
  persistGroups();
  emit('groups-changed');
  return true;
}

export function unassignCreature(
  groupId: number,
  creatureType: CreatureType,
  count: number
): boolean {
  if (!registry || count <= 0) return false;
  const group = groups.find((g) => g.id === groupId);
  if (!group) return false;
  const current = group.creatures[creatureType] || 0;
  if (current < count) return false;
  // Return to pool, remove from group.
  const statKey = CREATURE_STAT_MAP[creatureType].amount as keyof GameState;
  const poolCount = getStat(registry as Phaser.Data.DataManager, statKey);
  setStat(registry as Phaser.Data.DataManager, statKey, poolCount + count);
  group.creatures[creatureType] = current - count;
  if (group.creatures[creatureType] === 0) delete group.creatures[creatureType];
  emit('creature-stats-changed');
  persistGroups();
  emit('groups-changed');
  return true;
}

/** Read-only render snapshots for all active raids. */
export function getRaidRenderStates(now: number): RatRaidRenderState[] {
  return raids.map((raid) => getSingleRaidRenderState(raid, now));
}

function getSingleRaidRenderState(raid: RatRaid, now: number): RatRaidRenderState {
  if (!raid) throw new Error('raid is undefined');

  const village = getVillageConfig(raid.villageId);
  const creatureCount = Object.values(raid.creatures).reduce(
    (sum, count) => sum + (count || 0),
    0
  );

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
      creatureCount,
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
    creatureCount,
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
