/**
 * English dictionary. The keys of this object are the single source of truth
 * for `TranslationKey` — every other language is typed as
 * `Record<TranslationKey, string>`, so a missing or extra key is a compile
 * error.
 *
 * Placeholders use `{name}` syntax and are filled by `t(key, params)`.
 */
export const en = {
  // --- Main menu ---
  'menu.title': 'Main Menu',
  'menu.start': 'Start Game',
  'menu.settings': 'Settings',
  'menu.reset': 'Reset Progress',
  'menu.resetTitle': 'Reset progress?',
  'menu.resetMessage': 'All progress will be lost permanently.',
  'menu.resetConfirm': 'Reset',

  // --- Confirm dialog defaults ---
  'dialog.confirm': 'Confirm',
  'dialog.cancel': 'Cancel',

  // --- Settings window ---
  'settings.title': 'Settings',
  'settings.language': 'Language',
  'settings.close': 'Close',

  // --- Navigation panel ---
  'nav.mainMenu': 'Main Menu',
  'nav.cave': 'Cave',
  'nav.workshop': 'Workshop',
  'nav.tent': 'Tent',
  'nav.location1': 'First Location',
  'nav.worldMap': 'World Map',

  // --- Resources ---
  'resources.humanCorpses': 'Human Bodies:',
  'resources.ratCorpses': 'Rat Bodies:',

  // --- Cave building menu ---
  'buildings.tent': 'Tent',
  'buildings.workshop': 'Workshop',
  'cave.enterTent': 'Enter Tent',
  'cave.enterWorkshop': 'Enter Workshop',
  'cave.upgradeTent': 'Upgrade Tent',
  'cave.upgradeWorkshop': 'Upgrade Workshop',

  // --- Location 1 action menus ---
  'village.attack': 'Attack',
  'village.loot': 'Loot',
  'village.scout': 'Scout',
  'necro.toCave': 'To Cave',
  'necro.sleep': 'Sleep',

  // --- Workshop ---
  'workshop.convert': 'Convert Corpse ({active}/{max})',
  'workshop.queued': 'queued',
  'workshop.upgradeCost': 'Upgrade ({cost} {resource})',
  'workshop.score': 'Score: 100',
  'cost.humanCorpses': 'human corpses',
  'cost.ratCorpses': 'rat corpses',
  'upgrades.ratSpeed': 'Rat Speed',
  'upgrades.maxConcurrentConversions': 'Max Conversions',
  'upgrades.maxConversionQueue': 'Max Queue',

  // --- Creature stats ---
  'stats.title': 'Creature Stats',
  'stats.rats': 'Rats',
  'stats.ghouls': 'Ghouls',
  'stats.power': 'Power',
  'stats.speed': 'Speed',

  // --- World map scene (Phaser) ---
  'worldMap.title': 'World Map... Under construction...',
  'worldMap.backToBase': 'Return to base',
} as const;

export type TranslationKey = keyof typeof en;
