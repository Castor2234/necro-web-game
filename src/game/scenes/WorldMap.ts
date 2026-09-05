import * as Phaser from 'phaser';
import { SCENE } from '../helpers/keys';
import { emit, on, off } from '../helpers/events';
import { t } from '../i18n';

export class WorldMap extends Phaser.Scene {
  // Scene setup
  background: Phaser.GameObjects.Image;
  sceneTitle: Phaser.GameObjects.BitmapText;

  // Forest
  forestImg: Phaser.GameObjects.Image;
  forestText: Phaser.GameObjects.BitmapText;
  forestBase: Phaser.GameObjects.Container;

  // Starting values
  //private ratSpeed = 400;
  //private v1pw = 50;

  constructor() {
    super(SCENE.WorldMap);
  }

  init(_data: number): void {
    // this.score = data.score || 0;
  }

  create(): void {
    // Bg
    this.background = this.add.image(320, 180, 'background').setDepth(-1);

    // Scene title
    this.sceneTitle = this.add
      .bitmapText(250, 50, 'font1', t('worldMap.title'), 32)
      .setOrigin(0.5)
      .setDepth(100);

    // Forest Base
    this.forestImg = this.add.image(0, 0, 'forest_img');
    this.forestText = this.add.bitmapText(
      0,
      40,
      'font1',
      t('worldMap.backToBase'),
      16
    );

    this.forestBase = this.add.container(160, 140, [
      this.forestImg,
      this.forestText,
    ]);

    this.forestImg
      .setInteractive()
      .on('pointerover', () => {
        this.forestBase.setScale(1.1);
        this.forestBase.setAlpha(0.95);
        this.forestText.setTint(0x00ff00);
      })
      .on('pointerout', () => {
        this.forestBase.setScale(1);
        this.forestBase.setAlpha(1);
        this.forestText.clearTint();
      })
      .on('pointerdown', () => {
        this.scene.start(SCENE.Cave);
      });

    // Re-translate visible text when the language changes in the settings.
    on('language-changed', this.handleLanguageChanged, this);
    this.events.once('shutdown', () => {
      off('language-changed', this.handleLanguageChanged, this);
    });

    emit('current-scene-ready', this);
  }

  private handleLanguageChanged(): void {
    this.sceneTitle.setText(t('worldMap.title'));
    this.forestText.setText(t('worldMap.backToBase'));
  }
}
