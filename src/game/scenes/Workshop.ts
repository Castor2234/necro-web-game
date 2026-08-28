import * as Phaser from 'phaser';
import { SCENE } from './keys';
import { emit, on, off } from '../events';
import type { ConversionProgress } from '../events';
import { getStat, setStat } from '../state/gameState';
import { getResources, addResources } from '../state/helpers/resources';
import {
  WORKSHOP_UPGRADES,
  setUpgradeState,
  type WorkshopUpgradeKey,
} from '../state/helpers/upgrades';

interface ConversionTask {
  id: number;
  timer: number;
  duration: number;
}

export class Workshop extends Phaser.Scene {
  background: Phaser.GameObjects.Image;
  zombieRatsAmountLabel: Phaser.GameObjects.Text;

  private conversionTasks: ConversionTask[] = [];
  private nextTaskId = 0;
  private corpseConversionDuration = 0;
  private progressTickAccumulator = 0;
  private upgradeLevels: Record<string, number> = {};

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
    this.background = this.add.image(320, 180, 'background').setDepth(-1);

    on('convert-corpse', this.handleConvertCorpse, this);
    on('purchase-upgrade', this.handlePurchaseUpgrade, this);
    this.events.once('shutdown', () => {
      off('convert-corpse', this.handleConvertCorpse, this);
      off('purchase-upgrade', this.handlePurchaseUpgrade, this);
    });

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
      };
    });
  }

  private handleConvertCorpse = (): void => {
    const maxConcurrent = this.getMaxConcurrentConversions();
    const maxQueue = this.getMaxConversionQueue();

    // Tasks beyond maxConcurrent go into the queue, up to maxQueue slots.
    if (this.conversionTasks.length >= maxConcurrent + maxQueue) return;

    const resources = getResources(this.registry);
    if (resources.ratCorpses < 1) return;

    addResources(this.registry, { ratCorpses: -1 });

    const task: ConversionTask = {
      id: this.nextTaskId++,
      timer: this.corpseConversionDuration,
      duration: this.corpseConversionDuration,
    };
    this.conversionTasks.push(task);

    const { activeCount, queuedCount } = this.getQueueCounts(maxConcurrent);
    emit('corpse-conversion-started', {
      activeCount,
      queuedCount,
      maxConcurrent,
      maxQueue,
    });
  };

  // Upgrades
  private getUpgradeCost(upgradeKey: WorkshopUpgradeKey): number {
    const config = WORKSHOP_UPGRADES[upgradeKey];
    const level = this.upgradeLevels[upgradeKey] ?? 0;
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

    this.upgradeLevels[payload.upgradeKey] =
      (this.upgradeLevels[payload.upgradeKey] ?? 0) + 1;

    this.emitUpgradeState();
    emit('creature-stats-changed');
  };

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
      const currentAmount = getStat(this.registry, 'zombieRatsAmount');
      const newAmount = currentAmount + completed.length;
      setStat(this.registry, 'zombieRatsAmount', newAmount);

      this.conversionTasks = this.conversionTasks.filter(
        (t) => !completed.includes(t)
      );

      // Queued tasks are promoted on the next frame (their timers are still
      // full), but report the fresh active/queued split right away.
      const { activeCount: newActiveCount, queuedCount } = this.getQueueCounts(
        maxConcurrent
      );

      emit('corpse-conversion-complete', {
        completedCount: completed.length,
        activeCount: newActiveCount,
        queuedCount,
        maxConcurrent,
        maxQueue: this.getMaxConversionQueue(),
        remainingTasks: this.buildProgressList(maxConcurrent),
      });
      emit('zombie-rats-updated', newAmount);
      emit('creature-stats-changed');
    }
  }
}

