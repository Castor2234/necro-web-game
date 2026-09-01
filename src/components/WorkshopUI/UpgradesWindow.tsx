import { useEffect, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { UpgradesColumn } from './UpgradesColumn';
import type { UpgradeTree } from '../../game/state/secondary/upgrades';
import type { TranslationKey } from '../../game/i18n';
import styles from './UpgradesWindow.module.css';

interface UpgradesWindowProps {
  /** Whether the window is currently shown. */
  open: boolean;
  onClose: () => void;
}

/** The four upgrade trees, arranged in a cross inside the window. */
const TREES: UpgradeTree[] = ['necromancer', 'simple', 'advanced', 'workshop'];

const TREE_LABEL_KEYS: Record<UpgradeTree, TranslationKey> = {
  necromancer: 'upgrades.tree.necromancer',
  simple: 'upgrades.tree.simple',
  advanced: 'upgrades.tree.advanced',
  workshop: 'upgrades.tree.workshop',
};

/** Upgrades overlay opened from the Workshop ("Upgrades" button). Rendered
 *  inside the scene UI overlay, it covers the whole canvas with an opaque
 *  backdrop and scales with it, hiding the workshop while it is open. It first
 *  shows a cross of four tree buttons; picking a tree opens that tree's
 *  upgrades (empty trees show a placeholder). Escape or a backdrop click
 *  closes the window; the workshop keeps running underneath the overlay. */
export const UpgradesWindow = ({ open, onClose }: UpgradesWindowProps) => {
  const { t } = useTranslation();
  const [selectedTree, setSelectedTree] = useState<UpgradeTree | null>(null);

  // Escape closes the window.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Reset the tree view each time the window opens.
  useEffect(() => {
    if (open) setSelectedTree(null);
  }, [open]);

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

        {selectedTree === null ? (
          <div className={styles.menu}>
            {TREES.map((tree) => (
              <button
                key={tree}
                className={`${styles.treeButton} ${styles[tree]}`}
                onClick={() => setSelectedTree(tree)}
              >
                {t(TREE_LABEL_KEYS[tree])}
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.treePanel}>
            <span className={styles.treeTitle}>
              {t(TREE_LABEL_KEYS[selectedTree])}
            </span>
            <div className={styles.treeContent}>
              <UpgradesColumn tree={selectedTree} />
            </div>
            <button
              className={styles.backButton}
              onClick={() => setSelectedTree(null)}
            >
              {t('upgrades.back')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
