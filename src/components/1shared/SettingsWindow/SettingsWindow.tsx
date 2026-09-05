import { useEffect } from 'react';
import { LANGUAGES } from '../../../game/i18n/languages';
import { useTranslation } from '../../../hooks/useTranslation';
import { Button } from '../Button/Button';
import styles from './SettingsWindow.module.css';

interface SettingsWindowProps {
  /** Whether the window is currently shown. */
  open: boolean;
  onClose: () => void;
}

/** In-game settings modal. Rendered inside the scene UI overlay, so it
 *  covers exactly the canvas area and scales with it. Escape or a backdrop
 *  click closes the window. */
export const SettingsWindow = ({ open, onClose }: SettingsWindowProps) => {
  const { language, setLanguage, t } = useTranslation();

  // Escape closes the window without applying anything.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.window}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.title}>{t('settings.title')}</div>

        <div className={styles.setting}>
          <div className={styles.settingLabel}>{t('settings.language')}</div>
          <div className={styles.languageOptions}>
            {LANGUAGES.map(({ code, nativeName }) => (
              <button
                key={code}
                className={
                  code === language
                    ? `${styles.languageOption} ${styles.active}`
                    : styles.languageOption
                }
                onClick={() => setLanguage(code)}
              >
                {nativeName}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <Button onClick={onClose}>{t('settings.close')}</Button>
        </div>
      </div>
    </div>
  );
};
