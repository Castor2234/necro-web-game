export interface GameState {
  ratCorpses: number;
  humanCorpses: number;
  zombieRatsAmount: number;
  ratSpeed: number;
  ratPower: number;
  ghoulsAmount: number;
  ghoulSpeed: number;
  ghoulPower: number;
  corpseConversionDuration: number;
  maxConcurrentConversions: number;
  village1Population: number; // ...
}
export const getStat = <K extends keyof GameState>(
  r: Phaser.Data.DataManager,
  k: K
): GameState[K] => r.get(k);
export const setStat = <K extends keyof GameState>(
  r: Phaser.Data.DataManager,
  k: K,
  v: GameState[K]
) => r.set(k, v);

