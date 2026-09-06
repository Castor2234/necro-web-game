// game/state/helpers/upgrades.ts
import * as Phaser from 'phaser';
import { emit } from '../../helpers/events';
import { getStat, INITIAL_VALUES_CONFIG } from '../gameState';
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
  'ratSpeed' | 'maxConcurrentConversions' | 'maxConversionQueue' | 'maxGroups' | 'maxUnitsPerGroup';

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
  maxGroups: {
    key: 'maxGroups',
    label: 'Max Groups',
    increment: 1,
    baseCost: 10,
    costGrowth: 2.0,
    costResource: 'humanCorpses',
    tree: 'necromancer',
  },
  maxUnitsPerGroup: {
    key: 'maxUnitsPerGroup',
    label: 'Max Units Per Group',
    increment: 5,
    baseCost: 8,
    costGrowth: 1.8,
    costResource: 'humanCorpses',
    tree: 'necromancer',
  },
};

let currentUpgradeState: UpgradeState[] = [];

export function setUpgradeState(state: UpgradeState[]): void {
  currentUpgradeState = state;
  emit('upgrades-updated', state);
}

/**
 * The upgrade level is derived from the stat itself (initial value → each
 * purchase adds `increment`), so purchased upgrades survive a page refresh:
 * the stat value is what gets saved and restored.
 */
export function getUpgradeLevel(
  registry: Phaser.Data.DataManager,
  upgradeKey: WorkshopUpgradeKey
): number {
  const config = WORKSHOP_UPGRADES[upgradeKey];
  const initial = INITIAL_VALUES_CONFIG[config.key];
  const current = getStat(registry, config.key);
  return Math.max(0, Math.round((current - initial) / config.increment));
}

/** Current cost of the next level of `upgradeKey`, based on its level. */
export function getUpgradeCost(
  registry: Phaser.Data.DataManager,
  upgradeKey: WorkshopUpgradeKey
): number {
  const config = WORKSHOP_UPGRADES[upgradeKey];
  const level = getUpgradeLevel(registry, upgradeKey);
  return Math.round(config.baseCost * Math.pow(config.costGrowth, level));
}

export function getUpgradeState(): UpgradeState[] {
  return currentUpgradeState;
}
