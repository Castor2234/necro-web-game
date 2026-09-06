// game/config/villages.ts
import type { GameState } from '../state/gameState';

/**
 * Single source of truth for the Location_1 villages. Shared by:
 *  - the Location_1 scene (rendering, hover/click, population labels),
 *  - the world simulation (movement targets, population growth, attack/loot).
 * Keeping them in one file guarantees the sim and the renderer never drift.
 */

/** Village ids, matching the `village{N}Population` registry keys. */
export type VillageId =
  'village1' | 'village2' | 'village3' | 'village4' | 'village5' | 'village6';

export interface VillageConfig {
  id: VillageId;
  /** World position of the village sprite. */
  x: number;
  y: number;
  /** Texture key loaded by the Preloader. */
  texture: string;
  maxPopulation: number;
  growthRate: number;
}

/** Maps a village id to its persisted population stat key. */
export const VILLAGE_POPULATION_KEYS: Record<VillageId, keyof GameState> = {
  village1: 'village1Population',
  village2: 'village2Population',
  village3: 'village3Population',
  village4: 'village4Population',
  village5: 'village5Population',
  village6: 'village6Population',
};

/** Runtime guard for raw strings coming from the UI or a save file. */
export const isVillageId = (value: string): value is VillageId =>
  value in VILLAGE_POPULATION_KEYS;

/** World position of the necromancer — the raid sim uses it as the horde's
 *  base, the scene renders the sprite there. */
export const NECROMANCER_POSITION = { x: 20, y: 50 } as const;

export const VILLAGE_CONFIGS: readonly VillageConfig[] = [
  {
    id: 'village1',
    x: 130,
    y: 70,
    texture: 'village_img',
    maxPopulation: 300,
    growthRate: 0.02,
  },
  {
    id: 'village2',
    x: 40,
    y: 160,
    texture: 'village_img',
    maxPopulation: 700,
    growthRate: 0.04,
  },
  {
    id: 'village3',
    x: 185,
    y: 215,
    texture: 'village_img',
    maxPopulation: 2000,
    growthRate: 0.05,
  },
  {
    id: 'village4',
    x: 350,
    y: 140,
    texture: 'village_img',
    maxPopulation: 20000,
    growthRate: 0.1,
  },
  {
    id: 'village5',
    x: 350,
    y: 230,
    texture: 'village_img',
    maxPopulation: 50000,
    growthRate: 0.1,
  },
  {
    id: 'village6',
    x: 500,
    y: 150,
    texture: 'village_img',
    maxPopulation: 100000,
    growthRate: 0.1,
  },
];

/** Looks a village up by id. Only call with a validated `VillageId`. */
export function getVillageConfig(id: VillageId): VillageConfig {
  // The array is exhaustive over VillageId, so this cannot miss.
  return VILLAGE_CONFIGS.find((cfg) => cfg.id === id)!;
}
