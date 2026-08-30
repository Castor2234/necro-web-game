import type { RefObject } from 'react';
import {
  ExternalUI,
  ExternalUIProps,
} from './components/ExternalUI/ExternalUI';
import { MainMenuUI } from './components/MainMenuUI/MainMenuUI';
import { CaveUI } from './components/CaveUI/CaveUI';
import { Location1UI } from './components/Location_1UI/Location_1UI';
import { WorkshopUI } from './components/WorkshopUI/WorkshopUI';
import { SCENE, type SceneKey } from './game/helpers/keys';
import type { IRefPhaserGame } from './PhaserGame';

export interface SceneUIProps {
  startScene: (sceneKey: SceneKey) => void;
  /** Phaser game ref, so scene UIs can read live values from the registry. */
  phaserRef: RefObject<IRefPhaserGame | null>;
}

/** Scene-specific overlay rendered inside the scaled canvas area. */
export const SCENE_UI: Partial<
  Record<SceneKey, React.ComponentType<SceneUIProps>>
> = {
  [SCENE.MainMenu]: MainMenuUI,
  [SCENE.Cave]: CaveUI,
  [SCENE.Workshop]: WorkshopUI,
  [SCENE.Location_1]: Location1UI,
};

/** Screen-fixed overlay (navigation), rendered per scene. */
export const SCENE_EXTERNAL_UI: Partial<
  Record<SceneKey, React.ComponentType<ExternalUIProps>>
> = {
  [SCENE.Cave]: ExternalUI,
  [SCENE.Workshop]: ExternalUI,
  [SCENE.Location_1]: ExternalUI,
  [SCENE.WorldMap]: ExternalUI,
  [SCENE.Tent]: ExternalUI,
};

export const SCENES_WITH_RESOURCES: SceneKey[] = [
  SCENE.Location_1,
  SCENE.Cave,
  SCENE.Workshop,
];
