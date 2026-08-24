import {
  ExternalUI,
  ExternalUIProps,
} from './components/ExternalUI/ExternalUI';
import { MainMenuUI } from './components/MainMenuUI/MainMenuUI';
import { CaveUI } from './components/CaveUI/CaveUI';
//import { GameplayUI } from './components/GameplayUI/GameplayUI';
import { Location1UI } from './components/Location1UI/Location1UI';
import { WorkshopUI } from './components/WorkshopUI/WorkshopUI';

export const SCENE_UI: Record<
  string,
  React.ComponentType<{
    startScene: (sceneKey: string) => void;
  }>
> = {
  MainMenu: MainMenuUI,
  Cave: CaveUI,
  Workshop: WorkshopUI,
  Location_1: Location1UI,
};

export const SCENE_EXTERNAL_UI: Record<
  string,
  React.ComponentType<ExternalUIProps>
> = {
  Cave: ExternalUI,
  Workshop: ExternalUI,
  Location_1: ExternalUI,
  WorldMap: ExternalUI,
  Tent: ExternalUI,
};

export const SCENES_WITH_RESOURCES = ['Location_1', 'Cave', 'Workshop'];

