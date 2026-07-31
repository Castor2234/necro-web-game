import { useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { MainMenu } from './game/scenes/2MainMenu';
//import { MainMenuUI } from './components/MainMenuUI';
//import { Game } from 'phaser';
import { usePhaserScale } from './hooks/usePhaserScale';

function App() {
  //  References to the PhaserGame component (game and scene are exposed)
  const phaserRef = useRef<IRefPhaserGame | null>(null);

  const [currentSceneKey, setCurrentSceneKey] = useState<string>('');
  const uiStyle = usePhaserScale(phaserRef);

  const updateCurrentSceneKey = (scene: Phaser.Scene) => {
    setCurrentSceneKey(scene.scene.key);
  };

  const changeScene = () => {
    if (phaserRef.current) {
      const scene = phaserRef.current.scene as MainMenu;

      if (scene) {
        scene.scene.start('Base');
      }
    }
  };

  return (
    <div
      id="app"
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
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
      <div>
        <button className="button" onClick={changeScene}>
          Change Scene
        </button>
      </div>
    </div>
  );
}

export default App;

