import * as Phaser from 'phaser';
import { emit } from '../../events';
import { getStat, setStat } from '../gameState';
import type { GameState } from '../gameState';

/** The corpse resources the necromancer tracks. Derived from GameState so the
 *  registry stays the single source of truth for these keys. */
export type Resources = Pick<GameState, 'ratCorpses' | 'humanCorpses'>;

export function getResources(registry: Phaser.Data.DataManager): Resources {
  return {
    ratCorpses: getStat(registry, 'ratCorpses'),
    humanCorpses: getStat(registry, 'humanCorpses'),
  };
}

export function addResources(
  registry: Phaser.Data.DataManager,
  partial: Partial<Resources>
): void {
  const current = getResources(registry);
  const next: Resources = {
    ratCorpses: Math.max(0, current.ratCorpses + (partial.ratCorpses ?? 0)),
    humanCorpses: Math.max(
      0,
      current.humanCorpses + (partial.humanCorpses ?? 0)
    ),
  };

  setStat(registry, 'ratCorpses', next.ratCorpses);
  setStat(registry, 'humanCorpses', next.humanCorpses);

  emit('resources-updated', next);
}

