import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import type { CreatureType } from '../../game/state/secondary/creatures';
import styles from './CreatureDropdown.module.css';

interface Props {
  /** Currently selected creature type. */
  value: CreatureType;
  onChange: (type: CreatureType) => void;
}

/** Dropdown options in display order. */
const OPTIONS: readonly CreatureType[] = ['zombieRats', 'ghouls'];

/** Creature picker shown next to the Raise Dead button. Opens downward,
 *  closes on outside click or Escape. */
export const CreatureDropdown = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const label = (type: CreatureType) =>
    t(type === 'zombieRats' ? 'stats.rats' : 'stats.ghouls');

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {label(value)}
        <span className={styles.chevron}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className={styles.list} role="listbox">
          {OPTIONS.map((type) => (
            <button
              key={type}
              role="option"
              aria-selected={type === value}
              className={`${styles.option} ${type === value ? styles.selected : ''}`}
              onClick={() => {
                onChange(type);
                setOpen(false);
              }}
            >
              {label(type)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
