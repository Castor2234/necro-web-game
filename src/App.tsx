import { useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { usePhaserScale } from './hooks/usePhaserScale';
import { ExternalHUD } from './components/ExternalHUD';
import { SCENE_UI } from './sceneUI';

function App() {
  //  References to the PhaserGame component (game and scene are exposed)
  const phaserRef = useRef<IRefPhaserGame | null>(null);
  const uiStyle = usePhaserScale(phaserRef);

  const [currentSceneKey, setCurrentSceneKey] = useState<string>('');
  const updateCurrentSceneKey = (scene: Phaser.Scene) => {
    setCurrentSceneKey(scene.scene.key);
  };

  const startScene = (sceneKey: string) => {
    const scene = phaserRef.current?.scene;

    if (scene) {
      scene.scene.start(sceneKey);
    }
  };

  const SceneUIComponent = SCENE_UI[currentSceneKey];

  return (
    // Главный компонент app (сразу под root)
    <div id="app">
      {/* gamecontainer, внутри которого phaser canvas */}
      <PhaserGame ref={phaserRef} currentActiveScene={updateCurrentSceneKey} />
      {/* Overlay над phaser canvas (Зависит от сцены) */}
      {SceneUIComponent && (
        <div style={uiStyle}>
          <SceneUIComponent />
        </div>
      )}
      <ExternalHUD currentSceneKey={currentSceneKey} onNavigate={startScene} />
    </div>
  );
}

export default App;

