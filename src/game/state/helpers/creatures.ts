// game/states/creatures.ts
import * as Phaser from 'phaser';
import { getStat } from '../gameState';

export interface CreatureStats {
  amount: number;
  speed: number;
  power: number;
}

export interface AllCreatureStats {
  zombieRats: CreatureStats;
  ghouls: CreatureStats;
}

export function getCreatureStats(
  registry: Phaser.Data.DataManager
): AllCreatureStats {
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

