import * as Phaser from 'phaser';

/**
 * Класс для быстрого создания контейнера с картинкой и текстом над ней.
 * @param scene - Всегда пишем this
 * @param imageKey - Уникальный ключ картинки, выбранный при её загрузке в память
 * @param label - Текст над картинкой
 * @param x - Координата x расположения
 * @param y - Координата y расположения
 */

export class EntityContainer extends Phaser.GameObjects.Container {
  image: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    imageKey: string,
    label: string,
    x: number,
    y: number
  ) {
    // Super arguments: scene, x, y, [children]
    super(scene, x, y);

    // Create internal child components relative to (0, 0)
    this.image = scene.add.image(0, 0, imageKey);
    this.label = scene.add
      .text(0, -this.image.height, label, {
        color: 'rgb(255, 255, 255)',
        fontFamily: 'Pixelify Sans',
        fontSize: '14px',
        wordWrap: {
          width: 128,
          useAdvancedWrap: true,
        },
        align: 'center',
      })
      .setOrigin(0.5);

    // Add children to this container
    this.add([this.image, this.label]);

    // REQUIRED: Register this container instance with the Scene's display list
    scene.add.existing(this);
  }

  // Change label
  public updateLabel(newText: string): void {
    this.label.setText(newText);
  }

  // Return radius
  public getRadius(): number {
    return (1.1 * this.image.width) / 2;
  }

  // Change label color
  public updateLabelColor(
    newColor: string | CanvasPattern | CanvasGradient
  ): void {
    this.label.setColor(newColor);
  }
}

