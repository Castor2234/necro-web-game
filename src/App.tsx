import { useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { usePhaserScale } from './hooks/usePhaserScale';
import { SCENE_UI, SCENE_EXTERNAL_UI, SCENES_WITH_RESOURCES } from './sceneUI';
import { isSceneKey, type SceneKey } from './game/scenes/keys';
import { ResourceBar } from './components/!shared/ResourceBar/ResourceBar';
import { ShowCreatureStatsButton } from './components/!shared/ShowCreatureStatsButton/ShowCreatureStatsButton';

function App() {
  const phaserRef = useRef<IRefPhaserGame | null>(null);
  const uiStyle = usePhaserScale(phaserRef);

  const [currentSceneKey, setCurrentSceneKey] = useState<SceneKey | null>(null);
  const updateCurrentSceneKey = (scene: Phaser.Scene) => {
    const key = scene.scene.key;
    // Guard the bridge: Phaser reports scene keys as plain strings
    setCurrentSceneKey(isSceneKey(key) ? key : null);
  };

  const startScene = (sceneKey: SceneKey) => {
    const scene = phaserRef.current?.scene;
    if (scene) {
      scene.scene.start(sceneKey);
    }
  };

  const SceneUIComponent = currentSceneKey
    ? SCENE_UI[currentSceneKey]
    : undefined;
  const ExternalUIComponent = currentSceneKey
    ? SCENE_EXTERNAL_UI[currentSceneKey]
    : undefined;
  const showResources =
    currentSceneKey !== null && SCENES_WITH_RESOURCES.includes(currentSceneKey);

  return (
    // Главный компонент app (сразу под root)
    <div id="app">
      {/* gamecontainer, внутри которого phaser canvas */}
      <PhaserGame ref={phaserRef} currentActiveScene={updateCurrentSceneKey} />
      {
        // Overlay над phaser canvas (Зависит от сцены)
        SceneUIComponent && (
          <div style={uiStyle}>
            <SceneUIComponent startScene={startScene} />
          </div>
        )
      }
      {
        // Внешний Overlay (внутри app, но снаружи canvas)
        ExternalUIComponent && (
          <ExternalUIComponent
            currentSceneKey={currentSceneKey}
            onNavigate={startScene}
          />
        )
      }
      {showResources && (
        <>
          <ResourceBar phaserRef={phaserRef} />
          <ShowCreatureStatsButton phaserRef={phaserRef} />
        </>
      )}
    </div>
  );
}

export default App;

