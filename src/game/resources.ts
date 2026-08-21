import { EventBus } from './EventBus';
import * as Phaser from 'phaser';

export interface Resources {
  ratCorpses: number;
  humanCorpses: number;
}

export function getResources(registry: Phaser.Data.DataManager): Resources {
  return {
    ratCorpses: registry.get('ratCorpses') ?? 0,
    humanCorpses: registry.get('humanCorpses') ?? 0,
  };
}

export function addResources(
  registry: Phaser.Data.DataManager,
  partial: Partial<Resources>
): void {
  const current = getResources(registry);
  const next: Resources = {
    ratCorpses: current.ratCorpses + (partial.ratCorpses ?? 0),
    humanCorpses: current.humanCorpses + (partial.humanCorpses ?? 0),
  };
  registry.set('resources', next);
  EventBus.emit('resources-updated', next);
}

