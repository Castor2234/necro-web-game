import React from 'react';

export const GameplayHUD: React.FC = () => {
  return (
    <div>
      <button
        style={{
          pointerEvents: 'auto',
          position: 'absolute',
          top: '10px',
          left: '10px',
        }}
        onClick={() => console.log('React UI Scale Synced!')}
      >
        Menu
      </button>
      <div style={{ position: 'absolute', bottom: '20px', right: '20px' }}>
        Score: 100
      </div>
    </div>
  );
};

