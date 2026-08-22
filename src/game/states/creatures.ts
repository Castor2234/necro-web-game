// game/states/creatures.ts
import * as Phaser from 'phaser';

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
      amount: registry.get('zombieRatsAmount') ?? 0,
      speed: registry.get('ratSpeed') ?? 0,
      power: registry.get('ratPower') ?? 0,
    },
    ghouls: {
      amount: registry.get('ghoulsAmount') ?? 0,
      speed: registry.get('ghoulSpeed') ?? 0,
      power: registry.get('ghoulPower') ?? 0,
    },
  };
}
