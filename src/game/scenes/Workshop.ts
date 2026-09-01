import * as Phaser from 'phaser';
import { SCENE } from '../helpers/keys';
import { emit, on, off } from '../helpers/events';
import type { ConversionProgress } from '../helpers/events';
import { getStat, setStat, INITIAL_VALUES_CONFIG } from '../state/gameState';
import { getResources, addResources } from '../state/secondary/resources';
import { getConversionSaveData, setConversionSaveData } from '../state/save';
import {
  WORKSHOP_UPGRADES,
  setUpgradeState,
  type WorkshopUpgradeKey,
} from '../state/secondary/upgrades';
import { CONVERSION_RECIPES } from '../state/secondary/conversions';
import type { CreatureType } from '../state/secondary/creatures';

interface ConversionTask {
  id: number;
  timer: number;
  duration: number;
  /** Which creature this task produces (per CONVERSION_RECIPES). */
  creatureType: CreatureType;
}

export class Workshop extends Phaser.Scene {
  background: Phaser.GameObjects.Image;
  zombieRatsAmountLabel: Phaser.GameObjects.Text;

  private conversionTasks: ConversionTask[] = [];
  private nextTaskId = 0;
  private corpseConversionDuration = 0;
  private progressTickAccumulator = 0;

  constructor() {
    super(SCENE.Workshop);
  }

  init(): void {
    this.corpseConversionDuration = getStat(
      this.registry,
      'corpseConversionDuration'
    );
  }

  create(): void {
    this.background = this.add.image(320, 180, 'inside_workshop').setDepth(-1);

    on('convert-corpse', this.handleConvertCorpse, this);
    on('purchase-upgrade', this.handlePurchaseUpgrade, this);
    this.events.once('shutdown', () => {
      off('convert-corpse', this.handleConvertCorpse, this);
      off('purchase-upgrade', this.handlePurchaseUpgrade, this);
    });

    // Rebuild in-flight conversions saved before the page was refreshed, so
    // corpses already spent on them are not lost.
    this.restoreConversionTasks();
    this.emitUpgradeState();
    emit('current-scene-ready', this);
  }

  // Converts
  private getMaxConcurrentConversions(): number {
    return getStat(this.registry, 'maxConcurrentConversions');
  }

  private getMaxConversionQueue(): number {
    return getStat(this.registry, 'maxConversionQueue');
  }

  /** Active vs queued split: only the first `maxConcurrent` tasks run. */
  private getQueueCounts(maxConcurrent: number): {
    activeCount: number;
    queuedCount: number;
  } {
    const activeCount = Math.min(this.conversionTasks.length, maxConcurrent);
    return {
      activeCount,
      queuedCount: this.conversionTasks.length - activeCount,
    };
  }

  private buildProgressList(maxConcurrent: number): ConversionProgress[] {
    const activeCount = Math.min(this.conversionTasks.length, maxConcurrent);
    return this.conversionTasks.map((task, index) => {
      const active = index < activeCount;
      return {
        id: task.id,
        progress: active ? 1 - Math.max(task.timer, 0) / task.duration : 0,
        secondsLeft: active ? Math.ceil(Math.max(task.timer, 0) / 1000) : 0,
        queued: !active,
        creatureType: task.creatureType,
      };
    });
  }

  private handleConvertCorpse = (payload: {
    creatureType: CreatureType;
  }): void => {
    const recipe = CONVERSION_RECIPES[payload.creatureType];
    if (!recipe) return;

    const maxConcurrent = this.getMaxConcurrentConversions();
    const maxQueue = this.getMaxConversionQueue();

    // Tasks beyond maxConcurrent go into the queue, up to maxQueue slots.
    if (this.conversionTasks.length >= maxConcurrent + maxQueue) return;

    const resources = getResources(this.registry);
    if (resources[recipe.costResource] < recipe.costAmount) return;

    addResources(this.registry, { [recipe.costResource]: -recipe.costAmount });

    const task: ConversionTask = {
      id: this.nextTaskId++,
      timer: this.corpseConversionDuration,
      duration: this.corpseConversionDuration,
      creatureType: payload.creatureType,
    };
    this.conversionTasks.push(task);
    this.syncConversionSaveData();

    const { activeCount, queuedCount } = this.getQueueCounts(maxConcurrent);
    emit('corpse-conversion-started', {
      activeCount,
      queuedCount,
      maxConcurrent,
      maxQueue,
    });
  };

  // Upgrades
  /** The upgrade level is derived from the stat itself (initial value → each
   *  purchase adds `increment`), so purchased upgrades survive a page refresh:
   *  the stat value is what gets saved and restored. */
  private getUpgradeLevel(upgradeKey: WorkshopUpgradeKey): number {
    const config = WORKSHOP_UPGRADES[upgradeKey];
    const initial = INITIAL_VALUES_CONFIG[config.key];
    const current = getStat(this.registry, config.key);
    return Math.max(0, Math.round((current - initial) / config.increment));
  }

  private getUpgradeCost(upgradeKey: WorkshopUpgradeKey): number {
    const config = WORKSHOP_UPGRADES[upgradeKey];
    const level = this.getUpgradeLevel(upgradeKey);
    return Math.round(config.baseCost * Math.pow(config.costGrowth, level));
  }

  private handlePurchaseUpgrade = (payload: {
    upgradeKey: WorkshopUpgradeKey;
  }): void => {
    const config = WORKSHOP_UPGRADES[payload.upgradeKey];
    if (!config) return;

    const cost = this.getUpgradeCost(payload.upgradeKey);
    const resources = getResources(this.registry);

    const available = resources[config.costResource];
    if (available < cost) return; // can't afford

    addResources(this.registry, { [config.costResource]: -cost });

    const currentValue = getStat(this.registry, config.key);
    setStat(this.registry, config.key, currentValue + config.increment);

    this.emitUpgradeState();
    emit('creature-stats-changed');
  };

  /** Reports the conversion queue to the save system so in-flight tasks (and
   *  the corpses already paid for them) survive a page refresh. */
  private syncConversionSaveData(): void {
    setConversionSaveData(this.conversionTasks, this.nextTaskId);
  }

  /** Rebuilds the conversion queue saved before the page was refreshed and
   *  pushes it to the React UI. */
  private restoreConversionTasks(): void {
    const { tasks, nextTaskId } = getConversionSaveData();
    this.conversionTasks = tasks.map((task) => ({ ...task }));

    // Never hand out an id that is still referenced by a restored task.
    const maxSavedId = this.conversionTasks.reduce(
      (max, task) => Math.max(max, task.id),
      -1
    );
    this.nextTaskId = Math.max(nextTaskId, maxSavedId + 1);

    if (this.conversionTasks.length > 0) {
      const maxConcurrent = this.getMaxConcurrentConversions();
      const { activeCount, queuedCount } = this.getQueueCounts(maxConcurrent);
      emit('corpse-conversion-started', {
        activeCount,
        queuedCount,
        maxConcurrent,
        maxQueue: this.getMaxConversionQueue(),
      });
      emit('corpse-conversion-progress', this.buildProgressList(maxConcurrent));
    }

    this.syncConversionSaveData();
  }

  private emitUpgradeState(): void {
    const upgradeKeys = Object.keys(WORKSHOP_UPGRADES) as WorkshopUpgradeKey[];
    const state = upgradeKeys.map((upgradeKey) => {
      const config = WORKSHOP_UPGRADES[upgradeKey];
      return {
        upgradeKey,
        label: config.label,
        currentValue: getStat(this.registry, config.key),
        cost: this.getUpgradeCost(upgradeKey),
        costResource: config.costResource,
        tree: config.tree,
      };
    });
    setUpgradeState(state);
  }

  update(_time: number, delta: number): void {
    if (this.conversionTasks.length === 0) return;

    const maxConcurrent = this.getMaxConcurrentConversions();
    // Only the first `maxConcurrent` tasks tick down; queued tasks wait with
    // full timers and are promoted automatically when a slot frees up.
    const activeCount = Math.min(this.conversionTasks.length, maxConcurrent);

    const completed: ConversionTask[] = [];

    for (let i = 0; i < activeCount; i++) {
      const task = this.conversionTasks[i];
      task.timer -= delta;
      if (task.timer <= 0) {
        completed.push(task);
      }
    }

    // Only emit progress once per second, not every frame
    this.progressTickAccumulator += delta;
    if (this.progressTickAccumulator >= 1000) {
      this.progressTickAccumulator -= 1000;
      emit('corpse-conversion-progress', this.buildProgressList(maxConcurrent));
    }

    if (completed.length > 0) {
      // A mixed queue can complete several creature types in one frame —
      // group them and apply each recipe to its own stat.
      const completedByType = new Map<CreatureType, number>();
      for (const task of completed) {
        completedByType.set(
          task.creatureType,
          (completedByType.get(task.creatureType) ?? 0) + 1
        );
      }
      completedByType.forEach((count, creatureType) => {
        const recipe = CONVERSION_RECIPES[creatureType];
        const currentAmount = getStat(this.registry, recipe.amountStat);
        setStat(
          this.registry,
          recipe.amountStat,
          currentAmount + count * recipe.yieldAmount
        );
        if (creatureType === 'zombieRats') {
          emit(
            'zombie-rats-updated',
            getStat(this.registry, 'zombieRatsAmount')
          );
        }
      });

      this.conversionTasks = this.conversionTasks.filter(
        (t) => !completed.includes(t)
      );
      this.syncConversionSaveData();

      // Queued tasks are promoted on the next frame (their timers are still
      // full), but report the fresh active/queued split right away.
      const { activeCount: newActiveCount, queuedCount } =
        this.getQueueCounts(maxConcurrent);

      emit('corpse-conversion-complete', {
        completedCount: completed.length,
        activeCount: newActiveCount,
        queuedCount,
        maxConcurrent,
        maxQueue: this.getMaxConversionQueue(),
        remainingTasks: this.buildProgressList(maxConcurrent),
      });
      emit('creature-stats-changed');
    }
  }
}

