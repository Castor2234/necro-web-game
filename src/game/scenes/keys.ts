// game/scenes/keys.ts

/**
 * Single source of truth for scene keys, shared by Phaser scenes and the
 * React UI. A typo in `super(SCENE.…)` or `startScene(SCENE.…)` is now a
 * compile error instead of a silent runtime failure.
 */
export const SCENE = {
  Boot: 'Boot',
  Preloader: 'Preloader',
  MainMenu: 'MainMenu',
  Cave: 'Cave',
  Workshop: 'Workshop',
  Tent: 'Tent',
  Location_1: 'Location_1',
  WorldMap: 'WorldMap',
} as const;

export type SceneKey = (typeof SCENE)[keyof typeof SCENE];

/** Runtime guard for raw strings coming from Phaser (e.g. scene.scene.key). */
export const isSceneKey = (key: string): key is SceneKey =>
  (Object.values(SCENE) as string[]).includes(key);