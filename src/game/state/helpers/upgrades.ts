// game/states/upgrades.ts
import { emit } from '../../events';
import type { GameState } from '../gameState';

export interface UpgradeConfig {
  /** GameState stat this upgrade modifies (typed so a typo can't compile). */
  key: keyof GameState;
  label: string;
  increment: number;
  baseCost: number;
  costGrowth: number;
  costResource: 'ratCorpses' | 'humanCorpses';
}

export interface UpgradeState {
  upgradeKey: string;
  label: string;
  currentValue: number;
  cost: number;
  costResource: 'ratCorpses' | 'humanCorpses';
}

export const WORKSHOP_UPGRADES: Record<string, UpgradeConfig> = {
  ratSpeed: {
    key: 'ratSpeed',
    label: 'Rat Speed',
    increment: 5,
    baseCost: 3,
    costGrowth: 1.4,
    costResource: 'ratCorpses',
  },
  maxConcurrentConversions: {
    key: 'maxConcurrentConversions',
    label: 'Max Conversions',
    increment: 1,
    baseCost: 5,
    costGrowth: 1.8,
    costResource: 'humanCorpses', // pays with humanCorpses now
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

