import * as Phaser from 'phaser';


export class CustomContainer extends Phaser.GameObjects.Container {
    image: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, pathToImg: string, label: string, x: number, y: number) {
        // Super arguments: scene, x, y, [children]
        super(scene, x, y);

        // Create internal child components relative to (0, 0)
        this.image = scene.add.image(0, 0, pathToImg);
        this.label = scene.add.text(0,-(20+(this.image.height/2)), label, { color: '#ffffff' }).setOrigin(0.5);

        // Add children to this container
        this.add([this.image, this.label]);

        // REQUIRED: Register this container instance with the Scene's display list
        scene.add.existing(this);
    }

    // Example custom method
    public updateText(newText: string): void {
        this.label.setText(newText);
    }
}


export class Boot extends Phaser.Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
        //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.

        this.load.image('background', 'assets/background.png');
    }

    create ()
    {
        this.scene.start('Preloader');
    }
}
