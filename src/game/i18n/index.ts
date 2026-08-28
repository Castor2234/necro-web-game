import { emit } from '../helpers/events';
import { en, type TranslationKey } from './en';
import { ru } from './ru';
import {
  DEFAULT_LANGUAGE,
  isLanguage,
  loadSavedLanguage,
  saveLanguage,
  type Language,
} from './languages';

/** All dictionaries. Adding a language = add a dictionary file + an entry
 *  (with native name) in LANGUAGES — the compiler does the rest. */
const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = {
  en,
  ru,
};

/** Placeholder values for `{name}` slots in translation templates. */
export type TranslationParams = Record<string, string | number>;

let currentLanguage: Language = loadSavedLanguage() ?? DEFAULT_LANGUAGE;

/** Currently active UI language. */
export function getLanguage(): Language {
  return currentLanguage;
}

/** Switches the UI language, persists the choice and notifies every listener
 *  (React components re-render via 'language-changed', Phaser scenes can
 *  rebuild their text too). */
export function setLanguage(language: Language): void {
  if (!isLanguage(language) || language === currentLanguage) return;

  currentLanguage = language;
  saveLanguage(language);
  document.documentElement.lang = language;
  emit('language-changed', language);
}

/** Translates `key` into the current language. `{name}` placeholders in the
 *  template are replaced by matching entries of `params`. */
export function t(key: TranslationKey, params?: TranslationParams): string {
  const template = DICTIONARIES[currentLanguage][key];
  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export { LANGUAGES, DEFAULT_LANGUAGE } from './languages';
export type { Language } from './languages';
export type { TranslationKey } from './en';
