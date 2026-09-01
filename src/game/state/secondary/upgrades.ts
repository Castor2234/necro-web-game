// game/state/helpers/upgrades.ts
import { emit } from '../../helpers/events';
import type { GameState } from '../gameState';

/** The four upgrade trees shown in the Upgrades window. */
export type UpgradeTree = 'necromancer' | 'simple' | 'advanced' | 'workshop';

export interface UpgradeConfig {
  /** GameState stat this upgrade modifies (typed so a typo can't compile). */
  key: keyof GameState;
  label: string;
  increment: number;
  baseCost: number;
  costGrowth: number;
  costResource: 'ratCorpses' | 'humanCorpses';
  /** Which upgrade tree this upgrade belongs to. */
  tree: UpgradeTree;
}

export type WorkshopUpgradeKey =
  'ratSpeed' | 'maxConcurrentConversions' | 'maxConversionQueue';

export interface UpgradeState {
  upgradeKey: WorkshopUpgradeKey;
  label: string;
  currentValue: number;
  cost: number;
  costResource: 'ratCorpses' | 'humanCorpses';
  tree: UpgradeTree;
}

export const WORKSHOP_UPGRADES: Record<WorkshopUpgradeKey, UpgradeConfig> = {
  ratSpeed: {
    key: 'ratSpeed',
    label: 'Rat Speed',
    increment: 5,
    baseCost: 3,
    costGrowth: 1.4,
    costResource: 'ratCorpses',
    tree: 'simple',
  },
  maxConcurrentConversions: {
    key: 'maxConcurrentConversions',
    label: 'Max Conversions',
    increment: 1,
    baseCost: 5,
    costGrowth: 1.8,
    costResource: 'humanCorpses', // pays with humanCorpses now
    tree: 'workshop',
  },
  maxConversionQueue: {
    key: 'maxConversionQueue',
    label: 'Max Queue',
    increment: 1,
    baseCost: 4,
    costGrowth: 1.6,
    costResource: 'ratCorpses',
    tree: 'workshop',
  },
};

let currentUpgradeState: UpgradeState[] = [];

export function setUpgradeState(state: UpgradeState[]): void {
  currentUpgradeState = state;
  emit('upgrades-updated', state);
}

export function getUpgradeState(): UpgradeState[] {
  return currentUpgradeState;
}
