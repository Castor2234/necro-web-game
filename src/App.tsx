import { useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { MainMenu } from './game/scenes/2MainMenu';
import { MainMenuUI } from './components/MainMenuUI';

function App()
{
    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    
    const [currentSceneKey, setCurrentSceneKey] = useState<string>('');

    const updateCurrentSceneKey = (scene: Phaser.Scene) => {
        setCurrentSceneKey(scene.scene.key)
    }

    const changeScene = () => {

        if(phaserRef.current)
        {
            const scene = phaserRef.current.scene as MainMenu;
            
            if (scene)
            {
                scene.changeScene();
            }
        }
    }

    return (
        <div id="app" style={{ position: 'relative' }}>
            <PhaserGame ref={phaserRef} currentActiveScene={updateCurrentSceneKey}>
                
                <MainMenuUI activeSceneKey={currentSceneKey} />
                
            </PhaserGame>
            <div>
                <button className="button" onClick={changeScene}>Change Scene</button>
            </div>
        </div>
    )
}

export default App
