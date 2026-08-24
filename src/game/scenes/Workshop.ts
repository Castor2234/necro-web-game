import { EventBus } from '../EventBus';
import * as Phaser from 'phaser';
import { getResources, addResources } from '../states/resources';

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

  constructor() {
    super('Workshop');
  }

  init(): void {
    this.corpseConversionDuration =
      this.registry.get('corpseConversionDuration') ?? 100;
  }

  create(): void {
    this.background = this.add.image(320, 180, 'background').setDepth(-1);

    EventBus.on('convert-corpse', this.handleConvertCorpse, this);
    this.events.once('shutdown', () => {
      EventBus.off('convert-corpse', this.handleConvertCorpse, this);
    });

    EventBus.emit('current-scene-ready', this);
  }

  private getMaxConcurrentConversions(): number {
    return this.registry.get('maxConcurrentConversions') ?? 1;
  }

  private handleConvertCorpse = (): void => {
    const maxConcurrent = this.getMaxConcurrentConversions();
    if (this.conversionTasks.length >= maxConcurrent) return;

    const resources = getResources(this.registry);
    if (resources.ratCorpses < 1) return;

    addResources(this.registry, { ratCorpses: -1 });

    const task: ConversionTask = {
      id: this.nextTaskId++,
      timer: this.corpseConversionDuration,
      duration: this.corpseConversionDuration,
    };
    this.conversionTasks.push(task);

    EventBus.emit('corpse-conversion-started', {
      activeCount: this.conversionTasks.length,
      maxConcurrent,
    });
  };

  update(_time: number, delta: number): void {
    if (this.conversionTasks.length === 0) return;

    const completed: ConversionTask[] = [];

    for (const task of this.conversionTasks) {
      task.timer -= delta;
      if (task.timer <= 0) {
        completed.push(task);
      }
    }

    // Only emit progress once per second, not every frame
    this.progressTickAccumulator += delta;
    if (this.progressTickAccumulator >= 1000) {
      this.progressTickAccumulator -= 1000;

      const progressList = this.conversionTasks.map((t) => ({
        id: t.id,
        progress: 1 - Math.max(t.timer, 0) / t.duration,
        secondsLeft: Math.ceil(Math.max(t.timer, 0) / 1000),
      }));
      EventBus.emit('corpse-conversion-progress', progressList);
    }

    if (completed.length > 0) {
      const currentAmount = this.registry.get('zombieRatsAmount') ?? 0;
      const newAmount = currentAmount + completed.length;
      this.registry.set('zombieRatsAmount', newAmount);

      this.conversionTasks = this.conversionTasks.filter(
        (t) => !completed.includes(t)
      );

      EventBus.emit('corpse-conversion-complete', {
        completedCount: completed.length,
        activeCount: this.conversionTasks.length,
      });
      EventBus.emit('zombie-rats-updated', newAmount);
    }
  }
}

