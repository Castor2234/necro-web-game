import { useTranslation } from '../../hooks/useTranslation';

export const WorkshopHUD = () => {
  const { t } = useTranslation();

  return (
    <>
      <div style={{ position: 'absolute', bottom: '20px', right: '20px' }}>
        {t('workshop.score')}
      </div>
    </>
  );
};

