import React from 'react';

// Define the props for our new component
interface MainMenuUIProps {
  activeSceneKey: string;
}

export const MainMenuUI: React.FC<MainMenuUIProps> = ({ activeSceneKey }) => {
  // Only render the UI if the active scene is 'MainMenu'
  if (activeSceneKey !== 'MainMenu') {
    return null;
  }

  return (
    <div style={overlayStyle}>
      <h1 style={titleStyle}>Главное меню</h1>
    </div>
  );
};

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
