import * as Phaser from 'phaser';
import { SCENE } from '../helpers/keys';
import { emit, on, off } from '../helpers/events';
import { t } from '../i18n';
import { EntityContainer } from '../objects/EntityContainer';

export class WorldMap extends Phaser.Scene {
  // Scene setup
  background: Phaser.GameObjects.Image;
  gameText: Phaser.GameObjects.Text;
  camera: Phaser.Cameras.Scene2D.Camera;

  // Containers
  forestBase: EntityContainer;
  village1: EntityContainer;

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

    // Scene title (Карта пока что показывается в зуме x2)
    this.gameText = this.add
      .text(250, 50, t('worldMap.title'), {
        fontFamily: 'Pixelify Sans',
        fontSize: 32,
        color: '#b98ba0',
        stroke: '#000000',
        strokeThickness: 2,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(100);

    // Camera
    this.camera = this.cameras.main;
    this.camera.setZoom(1);

    // Forest Base
    this.forestBase = new EntityContainer(
      this,
      'forest_img',
      t('worldMap.backToBase'),
      160,
      140
    );
    this.forestBase
      .setInteractive(
        new Phaser.Geom.Circle(0, 0, this.forestBase.getRadius()),
        Phaser.Geom.Circle.Contains
      )
      .on('pointerover', () => {
        this.forestBase.setScale(1.1);
        this.forestBase.setAlpha(0.95);
        this.forestBase.updateLabelColor('rgb(23, 252, 72)');
      })
      .on('pointerout', () => {
        this.forestBase.setScale(1);
        this.forestBase.setAlpha(1);
        this.forestBase.updateLabelColor('rgb(255,255,255)');
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
    this.gameText.setText(t('worldMap.title'));
    this.forestBase.updateLabel(t('worldMap.backToBase'));
  }
}

