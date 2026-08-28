import { useEffect } from 'react';
import { Button } from '../Button/Button';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  /** Whether the dialog is currently shown. */
  open: boolean;
  title: string;
  /** Optional secondary line under the title. */
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (red). */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** In-game confirmation modal. Rendered inside the scene UI overlay, so it
 *  covers exactly the canvas area and scales with it. Escape or a backdrop
 *  click cancels; only the confirm button triggers onConfirm. */
export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  // Escape closes the dialog without confirming.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.title}>{title}</div>
        {message && <div className={styles.message}>{message}</div>}
        <div className={styles.actions}>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};