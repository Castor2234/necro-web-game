import { useCallback, useState } from 'react';
import {
  getLanguage,
  setLanguage,
  t as translate,
  type Language,
  type TranslationKey,
  type TranslationParams,
} from '../game/i18n';
import { useEventBus } from './useEventBus';

/** React binding for the i18n module. Re-renders the caller whenever the
 *  language changes (via the typed 'language-changed' event), so `t()` calls
 *  in JSX always return strings of the current language. */
export function useTranslation() {
  const [language, setLanguageState] = useState<Language>(getLanguage);

  useEventBus('language-changed', setLanguageState);

  // New `t` identity on every language change, so effects/memo deps re-run.
  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => translate(key, params),
    [language]
  );

  const changeLanguage = useCallback((next: Language) => setLanguage(next), []);

  return { language, setLanguage: changeLanguage, t };
}
