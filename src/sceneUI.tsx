import {
  ExternalUI,
  ExternalUIProps,
} from './components/ExternalUI/ExternalUI';
import { MainMenuUI } from './components/MainMenuUI/MainMenuUI';
import { GameplayUI } from './components/GameplayUI/GameplayUI';
import { Location1UI } from './components/Location1UI/Location1UI';

export const SCENE_UI: Record<
  string,
  React.ComponentType<{
    startScene: (sceneKey: string) => void;
  }>
> = {
  MainMenu: MainMenuUI,
  Base: GameplayUI,
  Location_1: Location1UI,
  //Base: BaseUI,
};

export const SCENE_EXTERNAL_UI: Record<
  string,
  React.ComponentType<ExternalUIProps>
> = {
  Base: ExternalUI,
  Location_1: ExternalUI,
  WorldMap: ExternalUI,
};

