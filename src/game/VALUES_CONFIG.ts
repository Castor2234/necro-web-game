export const INITIAL_VALUES_CONFIG: Record<string, number> = {
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

