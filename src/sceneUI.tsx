import { ExternalHUD, ExternalHUDProps } from './components/ExternalHUD';
import { MainMenuHUD } from './components/MainMenuHUD';
import { GameplayHUD } from './components/GameplayHUD';

export const SCENE_UI: Record<string, React.ComponentType> = {
  MainMenu: MainMenuHUD,
  Base: GameplayHUD,
  //Base: BaseHUD,
  //Location_1: GameplayHUD,
  //WorldMap: GameplayHUD, // reuse same HUD for multiple scenes if needed
};

export const SCENE_EXTERNAL_UI: Record<
  string,
  React.ComponentType<ExternalHUDProps>
> = {
  MainMenu: ExternalHUD,
  Base: ExternalHUD,
  Location_1: ExternalHUD,
};

