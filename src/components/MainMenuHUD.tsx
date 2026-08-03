import React from 'react';

export const MainMenuHUD: React.FC = () => {
  return (
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
  );
};

/*
// Styles moved from App.tsx
const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  display: 'flex',
  justifyContent: 'center',
  paddingTop: '80px',
  zIndex: 10,
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'sans-serif',
  fontSize: '40px',
  color: '#faf8f8',
  WebkitTextStroke: '2px #000000',
  margin: 0,
};
*/

