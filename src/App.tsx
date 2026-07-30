import { useRef } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { MainMenu } from './game/scenes/2MainMenu';

function App()
{
    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);

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
        <div id="app" >
            <PhaserGame ref={phaserRef} />

            <div style={overlayStyle}>
                <h1 style={titleStyle}>Главное меню</h1>
            </div>


            <div>
                <button className="button" onClick={changeScene}>Change Scene</button>
            </div>
        </div>
    )
}

// Styles for the React UI Overlay
const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none', // Prevents the text overlay from blocking clicks to the game
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '80px',
};

const titleStyle: React.CSSProperties = {
    fontFamily: 'sans-serif',
    fontSize: '40px',
    color: '#faf8f8',
    WebkitTextStroke: '2px #000000', // Mimics the Phaser stroke thickness
    margin: 0,
};

export default App
