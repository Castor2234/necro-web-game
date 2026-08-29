import { useEffect } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { UpgradesColumn } from './UpgradesColumn';
import styles from './UpgradesWindow.module.css';

interface UpgradesWindowProps {
  /** Whether the window is currently shown. */
  open: boolean;
  onClose: () => void;
}

/** Upgrades panel opened from the Workshop ("Upgrades" button). Rendered
 *  inside the scene UI overlay at the old upgrades column spot, so it covers
 *  exactly the canvas area and scales with it. Escape or a backdrop click
 *  closes the window; the workshop keeps running underneath the overlay. */
export const UpgradesWindow = ({ open, onClose }: UpgradesWindowProps) => {
  const { t } = useTranslation();

  // Escape closes the window.
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
        <div className={styles.header}>
          <span className={styles.title}>{t('workshop.upgrades')}</span>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t('settings.close')}
          >
            ✕
          </button>
        </div>
        <UpgradesColumn />
      </div>
    </div>
  );
};