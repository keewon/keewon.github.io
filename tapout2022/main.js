// vim:tabstop=2 sts=2 sw=2 expandtab

const GAME_WIDTH = 320;
const GAME_HEIGHT = 568;
const WATER_TOP = 100;
const WATER_LEFT = 10;
const WATER_WIDTH = 50 * 6;
const WATER_HEIGHT = 50 * 7;

class Boat {
  constructor(name, data) {
    this.name = name;
    this.r = data['r'];
    this.s = data['s'];
    this.x = data['x'];
    this.y = data['y'];
    this.m = data['m'];
    this.right = this.x;
    this.bottom = this.y;

    if (this.r == 'H') {
      this.right = this.x + this.s - 1;
    }
    else if (this.r == 'V') {
      this.bottom = this.y + this.s - 1;
    }
  }

  move(diffX, diffY) {
    this.x += diffX;
    this.right += diffX;
    this.y += diffY;
    this.bottom += diffY;
  }

  getSpritePositionX(blockWidth) {
    let boatWidth = blockWidth;
    if (this.r === 'H') {
      boatWidth = blockWidth * this.s;
    }
    return WATER_LEFT + this.x * blockWidth + boatWidth / 2;
  }

  getSpritePositionY(blockHeight) {
    let boatHeight = blockHeight;
    if (this.r === 'V') {
      boatHeight = blockHeight * this.s;
    }
    return WATER_TOP + this.y * blockHeight + boatHeight / 2;
  }

  overlaps(another, diffX, diffY) {
    return (
      this.x <= another.right + diffX &&
      this.right >= another.x + diffX &&
      this.y <= another.bottom + diffY &&
      this.bottom >= another.y + diffY
    );
  }
}

class TapOutGame extends Phaser.Scene {
  constructor() {
    super({ key: 'TapOutGame', active: true });
  }

  preload() {
    this.load.image('player', 'assets/images/boat-with-man.png');
    this.load.image('hBoat2', 'assets/images/hBoat2.png');
    this.load.image('hBoat3', 'assets/images/hBoat3.png');
    this.load.image('hBoat4', 'assets/images/long-boat-H4.png');
    this.load.image('vBoat4', 'assets/images/long-boat.png');
    this.load.image('vBoat3', 'assets/images/vBoat3.png');
    this.load.image('vBoat2', 'assets/images/smallboat5.png');
    this.load.image('bg',     'assets/images/back-ground.png');
    this.load.image('water',  'assets/images/water0hk.jpg');
  }

  create() {
    this.clickedPosition = null;
    this.clickedSprite = null;
    this.changedX = 0;
    this.changedY = 0;

    this.level = {
      id: 1,
      width: 6,
      height: 7,
      pieces: [
        { r: 'H', s: 2, x: 2, y: 2, m: 1 },
        { r: 'V', s: 2, x: 0, y: 1 },
        { r: 'V', s: 2, x: 1, y: 1 },
        { r: 'V', s: 2, x: 2, y: 0 },
        { r: 'H', s: 2, x: 3, y: 1 },
        { r: 'V', s: 2, x: 4, y: 2 },
        { r: 'V', s: 2, x: 4, y: 4 },
        { r: 'H', s: 2, x: 1, y: 3 },
        { r: 'H', s: 3, x: 0, y: 4 },
        { r: 'H', s: 2, x: 0, y: 5 },
      ]
    };

    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg');

    this.blockWidth = WATER_WIDTH / this.level.width;
    this.blockHeight = WATER_HEIGHT / this.level.height;

    let imageWater = this.add.image(GAME_WIDTH / 2, WATER_TOP + WATER_HEIGHT / 2, 'water');
    imageWater.setScale(WATER_WIDTH / imageWater.width, WATER_HEIGHT / imageWater.height);

    this.boats = this.level.pieces.map((data, i) => {
      let name = `${i}`;
      let boat = new Boat(name, data);

      let texture;
      if (data.m == 1) {
        texture = 'player';
      }
      else {
        texture = `${data.r.toLowerCase()}Boat${data.s}`;
      }

      let sprite = this.add.sprite(
        boat.getSpritePositionX(this.blockWidth),
        boat.getSpritePositionY(this.blockHeight),
        texture);

      sprite.name = name;
      //sprite.setScale(boatWidth / sprite.width, boatHeight / sprite.height);
      sprite.setInteractive();

      sprite.on('pointerdown', (pointer) => {
        this.clickedSprite = sprite;
        this.clickedPosition = pointer.position.clone();
        sprite.setTint(0xff0000);
      });

      sprite.on('pointerout', (pointer) => {
        if (this.clickedSprite) {
          this.cancelDrag(sprite);
        }
      });

      sprite.on('pointerup', (pointer) => {
        if (this.clickedSprite) {
          this.cancelDrag(sprite);
        }
      });

      return boat;
    });

    this.input.on('pointerup', (pointer) => {
      // this.cancelDrag();
    });

    this.input.on('pointermove', (pointer) => {
      if (!this.clickedSprite || !this.clickedPosition) return;

      let clickedBoat = this.boats[this.clickedSprite.name];
      if (!clickedBoat) return;

      let diffX = 0;
      let diffY = 0;

      if (clickedBoat.r == 'H') {
        diffX = (pointer.x - this.clickedPosition.x);
      }
      if (clickedBoat.r == 'V') {
        diffY = (pointer.y - this.clickedPosition.y);
      }

      let changedX = diffX > 0 ? Math.ceil(diffX / this.blockWidth) : Math.floor(diffX / this.blockWidth);
      let changedY = diffY > 0 ? Math.ceil(diffY / this.blockHeight) : Math.floor(diffY / this.blockHeight);

      let overlappedBoat = this.boats.find((boat, index) => {
        if (boat == clickedBoat) {
          return false;
        }

        if (boat.overlaps(clickedBoat, changedX, changedY)) {
          return true;
        }
      
        return false;

      });
      let outOfBounds = false;
      if (clickedBoat.right + changedX >= this.level.width ||
        clickedBoat.x + changedX < 0 ||
        clickedBoat.bottom + changedY >= this.level.height ||
        clickedBoat.y + changedY < 0) {
        outOfBounds = true;
      }

      if (!overlappedBoat && !outOfBounds) {
        this.clickedSprite.setPosition(clickedBoat.getSpritePositionX(this.blockWidth) + diffX, clickedBoat.getSpritePositionY(this.blockHeight) + diffY);
        this.changedX = changedX;
        this.changedY = changedY;
      }
      else {
        console.log(`cantMove : ${clickedBoat.name} and ${overlappedBoat?.name}`);
      }
    });
  }

  update(time, delta) {
  }

  cancelDrag(sprite) {
    if (sprite) {
      let boat = this.boats[sprite.name];

      console.log(`boat: ${boat.name}, ${boat.x}, ${boat.y}, ${boat.right}, ${boat.bottom}, changedX: ${this.changedX}, changedY: ${this.changedY}`);
      if (boat) {
        if (this.changedX != 0 || this.changedY != 0) {
          boat.move(this.changedX, this.changedY);
        }
        sprite.setPosition(boat.getSpritePositionX(this.blockWidth), boat.getSpritePositionY(this.blockHeight));
      }
      this.clickedSprite = null;
      sprite.clearTint();
    }
    this.clickedPosition = null;
    this.changedX = 0;
    this.changedY = 0;
  }
}

let config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scene: [
    TapOutGame
  ]
};

let game = new Phaser.Game(config);

