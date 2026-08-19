import {
  ExternalHUD,
  ExternalHUDProps,
} from './components/ExternalHUD/ExternalHUD';
import { MainMenuHUD } from './components/MainMenuHUD/MainMenuHUD';
import { GameplayHUD } from './components/GameplayHUD/GameplayHUD';
import { Location1UI } from './components/Location1UI/Location1UI';

export const SCENE_UI: Record<
  string,
  React.ComponentType<{
    startScene: (sceneKey: string) => void;
  }>
> = {
  MainMenu: MainMenuHUD,
  Base: GameplayHUD,
  Location_1: Location1UI,
  //Base: BaseHUD,
};

export const SCENE_EXTERNAL_UI: Record<
  string,
  React.ComponentType<ExternalHUDProps>
> = {
  Base: ExternalHUD,
  Location_1: ExternalHUD,
  WorldMap: ExternalHUD,
};

