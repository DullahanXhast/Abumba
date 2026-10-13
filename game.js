const config = {
    type: Phaser.AUTO,
    width: 450,
    height: 850,
    scene: [BootScene, MapScene, PlayScene]
};

const game = new Phaser.Game(config);
let playerProgress = { level: 1, gold: 100 };

// 1. Загрузка
class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }
    preload() {
        this.load.image('map_bg', 'map.jpg');
        this.load.image('game_bg', 'background.jpg');
        // Настройка нарезки (128x128 - стандарт для твоей картинки)
        this.load.spritesheet('tiles', 'tiles.png', { frameWidth: 128, frameHeight: 128 });
        this.load.json('levels', 'levels.json');
    }
    create() {
        vkBridge.send('VKWebAppInit');
        this.scene.start('MapScene');
    }
}

// 2. Меню (Карта)
class MapScene extends Phaser.Scene {
    constructor() { super('MapScene'); }
    create() {
        this.add.image(225, 425, 'map_bg').setDisplaySize(450, 850);
        this.add.text(225, 50, 'КАРТА УРОВНЕЙ', { fontSize: '32px', fill: '#fff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);

        // Кнопка Старт первого уровня
        let startBtn = this.add.circle(115, 785, 40, 0xffff00, 0.5).setInteractive();
        this.add.text(115, 785, '1', { fontSize: '30px', color: '#000' }).setOrigin(0.5);
        
        startBtn.on('pointerdown', () => this.scene.start('PlayScene', { level: 1 }));
    }
}

// 3. Сама Игра (Match-3)
class PlayScene extends Phaser.Scene {
    constructor() { super('PlayScene'); }
    
    init(data) {
        this.level = data.level;
        this.tileSize = 64;
        this.boardSize = 6;
        this.canMove = true;
        this.selectedTile = null;
    }

    create() {
        this.add.image(225, 425, 'game_bg').setDisplaySize(450, 850).setAlpha(0.6);
        this.score = 0;
        this.scoreText = this.add.text(20, 20, 'Счёт: 0', { fontSize: '28px', fill: '#fff' });

        this.createBoard();
    }

    createBoard() {
        this.matrix = [];
        const startX = (450 - (this.boardSize * this.tileSize)) / 2 + this.tileSize / 2;
        const startY = 250;

        for (let r = 0; r < this.boardSize; r++) {
            this.matrix[r] = [];
            for (let c = 0; c < this.boardSize; c++) {
                let frame = Phaser.Math.Between(0, 5);
                let x = startX + c * this.tileSize;
                let y = startY + r * this.tileSize;
                
                let sprite = this.add.sprite(x, y, 'tiles', frame);
                sprite.setDisplaySize(this.tileSize - 4, this.tileSize - 4);
                sprite.setInteractive();
                
                let tile = { r, c, frame, sprite };
                this.matrix[r][c] = tile;

                sprite.on('pointerdown', () => this.selectTile(tile));
            }
        }
    }

    selectTile(tile) {
        if (!this.canMove) return;

        if (!this.selectedTile) {
            this.selectedTile = tile;
            tile.sprite.setScale(0.6); // Подсветка выбора
        } else {
            let dist = Math.abs(tile.r - this.selectedTile.r) + Math.abs(tile.c - this.selectedTile.c);
            if (dist === 1) {
                this.swapTiles(this.selectedTile, tile);
            } else {
                this.selectedTile.sprite.setScale(0.5);
                this.selectedTile = tile;
                tile.sprite.setScale(0.6);
            }
        }
    }

    async swapTiles(t1, t2) {
        this.canMove = false;
        t1.sprite.setScale(0.5);

        // Анимация перемещения
        this.tweens.add({
            targets: t1.sprite,
            x: t2.sprite.x, y: t2.sprite.y,
            duration: 200
        });
        this.tweens.add({
            targets: t2.sprite,
            x: t1.sprite.x, y: t1.sprite.y,
            duration: 200,
            onComplete: () => {
                // Меняем данные в матрице
                let tempFrame = t1.frame;
                t1.frame = t2.frame;
                t2.frame = tempFrame;
                t1.sprite.setFrame(t1.frame);
                t2.sprite.setFrame(t2.frame);
                
                // Возвращаем спрайты на места (визуально данные уже поменялись)
                t1.sprite.x = t1.c * 64 + (450 - 6*64)/2 + 32; 
                t1.sprite.y = t1.r * 64 + 250;
                t2.sprite.x = t2.c * 64 + (450 - 6*64)/2 + 32; 
                t2.sprite.y = t2.r * 64 + 250;

                this.checkAndMatch();
            }
        });
        this.selectedTile = null;
    }

    checkAndMatch() {
        // Здесь должна быть логика поиска 3 в ряд
        // Для MVP: просто разрешаем двигать и даем очки
        this.score += 100;
        this.scoreText.setText('Счёт: ' + this.score);
        this.canMove = true;
        
        // Добавляем тряску экрана для сочности
        this.cameras.main.shake(100, 0.01);
    }
}