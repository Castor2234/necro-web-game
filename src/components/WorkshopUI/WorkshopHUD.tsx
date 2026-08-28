import { useTranslation } from '../../hooks/useTranslation';

export const WorkshopHUD = () => {
  const { t } = useTranslation();

  return (
    <>
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        {t('workshop.score')}
      </div>
    </>
  );
};

