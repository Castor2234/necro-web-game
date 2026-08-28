/**
 * Language metadata and persistence for the i18n system.
 * `code` doubles as the translation dictionary selector.
 */
export const LANGUAGES = [
  { code: 'ru', nativeName: 'Русский' },
  { code: 'en', nativeName: 'English' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

/** Shown until the player picks a language in the settings window. */
export const DEFAULT_LANGUAGE: Language = 'en';

/** localStorage key. Deliberately separate from the game save file, so
 *  resetting progress keeps the chosen language. */
const LANGUAGE_STORAGE_KEY = 'necro-web-game.language';

/** Runtime guard for raw values (e.g. read back from localStorage). */
export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some(({ code }) => code === value);
}

export function loadSavedLanguage(): Language | null {
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Storage unavailable (private mode etc.) — language just won't persist.
  }
}

