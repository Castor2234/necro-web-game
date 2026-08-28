export interface GameState {
  // ----------Villages

  // Actions
  lootDuration: number;
  scoutDuration: number;

  // Populations
  village1Population: number;
  village2Population: number;
  village3Population: number;

  // ----------Resources
  ratCorpses: number;
  humanCorpses: number;

  // ----------Conversions
  corpseConversionDuration: number;
  maxConcurrentConversions: number;

  // ----------Creatures

  // Rats
  zombieRatsAmount: number;
  ratSpeed: number;
  ratPower: number;

  // Ghouls
  ghoulsAmount: number;
  ghoulSpeed: number;
  ghoulPower: number;
}

// Typed so the compiler enforces that this config always covers every key of GameState.
export const INITIAL_VALUES_CONFIG: Record<keyof GameState, number> = {
  // ----------Villages

  // Actions
  lootDuration: 3000,
  scoutDuration: 2000,

  // Populations
  village1Population: 100,
  village2Population: 300,
  village3Population: 1000,

  // ----------Resources
  ratCorpses: 99,
  humanCorpses: 50,

  // ----------Conversions
  corpseConversionDuration: 5000,
  maxConcurrentConversions: 7,

  // ----------Creatures

  // Rats
  zombieRatsAmount: 0,
  ratSpeed: 60,
  ratPower: 1,

  // Ghouls
  ghoulsAmount: 0,
  ghoulSpeed: 40,
  ghoulPower: 20,
} as const;

export const getStat = <K extends keyof GameState>(
  r: Phaser.Data.DataManager,
  k: K
): GameState[K] => r.get(k);
export const setStat = <K extends keyof GameState>(
  r: Phaser.Data.DataManager,
  k: K,
  v: GameState[K]
) => r.set(k, v);

