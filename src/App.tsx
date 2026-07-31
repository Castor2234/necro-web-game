import { useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { MainMenu } from './game/scenes/2MainMenu';
//import { MainMenuUI } from './components/MainMenuUI';
import { usePhaserScale } from './hooks/usePhaserScale';
import styles from '../public/css_modules/ExternalUI.module.css';

function App() {
  //  References to the PhaserGame component (game and scene are exposed)
  const phaserRef = useRef<IRefPhaserGame | null>(null);

  const [currentSceneKey, setCurrentSceneKey] = useState<string>('');
  const uiStyle = usePhaserScale(phaserRef);

  const updateCurrentSceneKey = (scene: Phaser.Scene) => {
    setCurrentSceneKey(scene.scene.key);
  };

  const startScene = (sceneKey: string) => {
    if (phaserRef.current) {
      const scene = phaserRef.current.scene as MainMenu;

      if (scene) {
        scene.scene.start(sceneKey);
      }
    }
  };

  return (
    // Главный компонент app сразу под root
    <div id="app">
      {/* gamecontainer, внутри которого phaser canvas */}
      <PhaserGame ref={phaserRef} currentActiveScene={updateCurrentSceneKey} />
      {/* Dynamic React Game HUD Overlay */}
      <div style={uiStyle}>
        {/* Ensure buttons inside re-enable pointer-events so they can be clicked */}
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

        <div style={{ position: 'absolute', bottom: '20px', right: '20px' }}>
          Score: 100
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'absolute', // Added so it doesn't get hidden behind the canvas
          bottom: '50%', // Adjust as needed
          right: '2px', // Adjust as needed
          transform: 'translatey(50%)',
          zIndex: 10,
        }}
      >
        <button
          className={styles.button}
          onClick={() => startScene('MainMenu')}
          disabled={currentSceneKey === 'MainMenu'}
        >
          Главное меню
        </button>
        <button
          className={styles.button}
          onClick={() => startScene('Base')}
          disabled={currentSceneKey === 'Base'}
        >
          База
        </button>
        <button
          className={styles.button}
          onClick={() => startScene('WorldMap')}
          disabled={currentSceneKey === 'WorldMap'}
        >
          Карта локации
        </button>
      </div>
    </div>
  );
}

export default App;

