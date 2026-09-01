import { useTranslation } from '../../../hooks/useTranslation';
import styles from './ConvertRatesColumn.module.css';

/** Rows of the rates column, in display order. The rate strings must match
 *  CONVERSION_RECIPES in src/game/state/secondary/conversions.ts. */
const RATE_ROWS = [
  { creatureLabelKey: 'stats.rats', rateKey: 'workshop.rateRats' },
  { creatureLabelKey: 'stats.ghouls', rateKey: 'workshop.rateGhouls' },
] as const;

/** Top-left column showing what each Raise Dead conversion costs and yields
 *  per creature type. Display-only (no pointer events). */
export const ConvertRatesColumn = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.column}>
      <div className={styles.title}>{t('workshop.ratesTitle')}</div>
      {RATE_ROWS.map(({ creatureLabelKey, rateKey }) => (
        <div key={rateKey} className={styles.row}>
          <span className={styles.name}>{t(creatureLabelKey)}</span>
          <span className={styles.rate}>{t(rateKey)}</span>
        </div>
      ))}
    </div>
  );
};
