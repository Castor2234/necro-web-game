import type { TranslationKey } from './en';

/**
 * Russian dictionary. Typed against the English keys, so the compiler
 * guarantees both languages always stay in sync.
 */
export const ru: Record<TranslationKey, string> = {
  // --- Main menu ---
  'menu.title': 'Главное меню',
  'menu.start': 'Начать игру',
  'menu.settings': 'Настройки',
  'menu.reset': 'Сбросить прогресс',
  'menu.resetTitle': 'Сбросить прогресс?',
  'menu.resetMessage': 'Весь прогресс будет потерян безвозвратно.',
  'menu.resetConfirm': 'Сбросить',

  // --- Confirm dialog defaults ---
  'dialog.confirm': 'Подтвердить',
  'dialog.cancel': 'Отмена',

  // --- Settings window ---
  'settings.title': 'Настройки',
  'settings.language': 'Язык',
  'settings.close': 'Закрыть',

  // --- Navigation panel ---
  'nav.mainMenu': 'Главное меню',
  'nav.cave': 'Пещера',
  'nav.workshop': 'Мастерская',
  'nav.tent': 'Жилище',
  'nav.location1': 'Локация 1',
  'nav.worldMap': 'Карта мира',

  // --- Resources ---
  'resources.humanCorpses': 'Трупов людей:',
  'resources.ratCorpses': 'Трупов крыс:',

  // --- Cave building menu ---
  'buildings.tent': 'Жилище',
  'buildings.workshop': 'Мастерская',
  'cave.enterTent': 'Войти в жилище',
  'cave.enterWorkshop': 'Войти в мастерскую',
  'cave.upgradeTent': 'Улучшить жилище',
  'cave.upgradeWorkshop': 'Улучшить мастерскую',

  // --- Location 1 action menus ---
  'village.attack': 'Атаковать',
  'village.loot': 'Разграбить',
  'village.scout': 'Разведать',
  'necro.toCave': 'В пещеру',
  'necro.sleep': 'Спать',

  // --- Workshop ---
  'workshop.convert': 'Преобразовать тело ({active}/{max})',
  'workshop.queued': 'в очереди',
  'workshop.upgradeCost': 'Улучшить ({resource}: {cost})',
  'workshop.score': 'Очки: 100',
  'cost.humanCorpses': 'трупы людей',
  'cost.ratCorpses': 'трупы крыс',
  'upgrades.ratSpeed': 'Скорость крыс',
  'upgrades.maxConcurrentConversions': 'Макс. Преобразований',
  'upgrades.maxConversionQueue': 'Макс. Очередь',

  // --- Creature stats ---
  'stats.title': 'Статистика существ',
  'stats.rats': 'Крысы',
  'stats.ghouls': 'Вурдалаки',
  'stats.power': 'Сила',
  'stats.speed': 'Скорость',

  // --- World map scene (Phaser) ---
  'worldMap.title': 'Карта мира... В разработке...',
  'worldMap.backToBase': 'Вернуться на базу',
};

