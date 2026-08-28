import type { CreatureType } from './creatures';

/** What one Raise Dead conversion consumes and produces. */
export interface ConversionRecipe {
  /** GameState stat the produced creatures are added to. */
  amountStat: 'zombieRatsAmount' | 'ghoulsAmount';
  /** Corpse resource consumed per conversion. */
  costResource: 'ratCorpses' | 'humanCorpses';
  /** Corpses consumed per conversion. */
  costAmount: number;
  /** Creatures produced per conversion. */
  yieldAmount: number;
}

/** Single source of truth for the workshop conversion recipes. The display
 *  strings live in the i18n dictionaries ('workshop.rateRats' / 
 *  'workshop.rateGhouls') — keep them in sync when changing numbers here. */
export const CONVERSION_RECIPES: Record<CreatureType, ConversionRecipe> = {
  zombieRats: {
    amountStat: 'zombieRatsAmount',
    costResource: 'ratCorpses',
    costAmount: 1,
    yieldAmount: 1,
  },
  ghouls: {
    amountStat: 'ghoulsAmount',
    costResource: 'humanCorpses',
    costAmount: 2,
    yieldAmount: 1,
  },
};
