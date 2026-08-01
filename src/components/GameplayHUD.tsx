import React from 'react';

export const GameplayHUD: React.FC = () => {
  return (
    <div>
      <button
        style={{
          pointerEvents: 'auto',
          position: 'absolute',
          top: '20px',
          left: '20px',
        }}
        onClick={() => console.log('React UI Scale Synced!')}
      >
        Menu
      </button>
      <div
        style={{
          position: 'absolute',
          top: '40px',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '32px',
          textAlign: 'center',
        }}
      >
        Главное меню
      </div>
      <div style={{ position: 'absolute', bottom: '20px', right: '20px' }}>
        Score: 100
      </div>
    </div>
  );
};

