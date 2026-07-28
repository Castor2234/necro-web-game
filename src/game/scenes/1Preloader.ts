import * as Phaser from 'phaser'

/** 
 * Класс для быстрого создания контейнера с картинкой и текстом над ней.
 * @param scene - Всегда пишем this
 * @param imageKey - Уникальный ключ картинки, выбранный при её загрузке в память
 * @param label - Текст над картинкой
 * @param x - Координата x расположения
 * @param y - Координата y расположения
*/

export class CustomContainer extends Phaser.GameObjects.Container {
    image: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    

    constructor(scene: Phaser.Scene, imageKey: string, label: string, x: number, y: number) {
        // Super arguments: scene, x, y, [children]
        super(scene, x, y);

        // Create internal child components relative to (0, 0)
        this.image = scene.add.image(0, 0, imageKey);
        this.label = scene.add.text(0,-(this.image.height), label, { 
            color: 'rgb(255, 255, 255)', 
            fontFamily: 'Pixelify Sans', fontSize: '14px',
            wordWrap: {
                width: 128,
                useAdvancedWrap: true
            },
            align: 'center'
        }).setOrigin(0.5);

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
        return 1.1*this.image.width/2
    }

    // Change label color
    public updateLabelColor(newColor:string | CanvasPattern | CanvasGradient): void {
        this.label.setColor(newColor)
    }

    

}

// Класс сцены фейзера
export class Preloader extends Phaser.Scene
{
    agr: Phaser.GameObjects.Container
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(0, 0, 'background');

        
        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(320, 180, 240, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (236 * progress);

        });
        
        
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.image('forest', 'forest_tile.png');
        this.load.image('village', 'village_tile.png');
        this.load.image('zombie_horde', 'zombie_horde.png');
        this.load.image('dark_tree', 'dark_tree.png');

    }

    create ()
    {           
        
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('WorldMap');
    }
}
