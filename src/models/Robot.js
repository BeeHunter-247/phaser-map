/**
 * Robot Model - Đại diện cho robot trong game
 *
 * Thuộc tính:
 * - position: {x, y} - Vị trí tile hiện tại
 * - direction: number - Hướng hiện tại (0=north, 1=east, 2=south, 3=west)
 * - sprite: Phaser.GameObjects.Sprite - Sprite của robot
 * - isMoving: boolean - Trạng thái di chuyển
 *
 * Methods:
 * - moveForward() - Di chuyển thẳng
 * - turnLeft() - Quay trái
 * - turnRight() - Quay phải
 * - turnBack() - Quay 180 độ
 * - getCurrentDirection() - Lấy hướng hiện tại
 * - getFrontTile() - Lấy tile phía trước
 */
export class Robot {
  constructor(scene, x = 0, y = 0, direction = 0) {
    this.scene = scene;
    this.position = { x, y };
    this.direction = direction; // 0=north, 1=east, 2=south, 3=west
    this.sprite = null;
    this.isMoving = false;
    this.map = null;
    this.layer = null;
  }

  /**
   * Khởi tạo robot với sprite và map
   * @param {Phaser.GameObjects.Sprite} sprite - Sprite của robot
   * @param {Phaser.Tilemaps.Tilemap} map - Map object
   * @param {Phaser.Tilemaps.TilemapLayer} layer - Layer object
   */
  initialize(sprite, map, layer) {
    this.sprite = sprite;
    this.map = map;
    this.layer = layer;
    this.updateSpritePosition();
    this.updateSpriteRotation();
  }

  /**
   * Cập nhật vị trí sprite theo position
   */
  updateSpritePosition() {
    if (!this.sprite || !this.layer) return;

    const worldCenter = this.getTileWorldCenter(
      this.position.x,
      this.position.y
    );
    this.sprite.setPosition(worldCenter.x, worldCenter.y + 30);
    this.updateSpriteDepth();
  }

  /**
   * Cập nhật rotation sprite theo direction
   */
  updateSpriteRotation() {
    if (!this.sprite) return;

    const directionSprites = [
      "robot_north",
      "robot_east",
      "robot_south",
      "robot_west",
    ];
    const spriteKey = directionSprites[this.direction];

    // Lưu vị trí và scale hiện tại
    const currentX = this.sprite.x;
    const currentY = this.sprite.y;
    const currentScale = this.sprite.scaleX;

    // Thay đổi texture
    this.sprite.setTexture(spriteKey);

    // Khôi phục vị trí và scale
    this.sprite.setPosition(currentX, currentY);
    this.sprite.setScale(currentScale);
    this.sprite.setOrigin(0.5, 1);
  }

  /**
   * Cập nhật depth để robot luôn ở trên các object khác
   */
  updateSpriteDepth() {
    if (!this.sprite) return;
    this.sprite.setDepth(this.sprite.y + 10);
  }

  /**
   * Lấy world center của tile
   * @param {number} tileX
   * @param {number} tileY
   * @returns {Object} {x, y} world coordinates
   */
  getTileWorldCenter(tileX, tileY) {
    if (!this.layer) return { x: 0, y: 0 };

    const worldPoint = this.layer.tileToWorldXY(tileX, tileY);
    const cx = worldPoint.x + (this.map.tileWidth * this.layer.scaleX) / 2;
    const cy = worldPoint.y + (this.map.tileHeight * this.layer.scaleY) / 2;
    return { x: cx, y: cy };
  }

  /**
   * Lấy hướng hiện tại dưới dạng string
   * @returns {string} Direction name: 'north', 'east', 'south', 'west'
   */
  getCurrentDirection() {
    const directions = ["north", "east", "south", "west"];
    return directions[this.direction];
  }

  /**
   * Lấy tọa độ tile phía trước robot theo hướng hiện tại
   * @returns {Object} {x, y} coordinates of front tile
   */
  getFrontTile() {
    let frontX = this.position.x;
    let frontY = this.position.y;

    switch (this.direction) {
      case 0:
        frontY -= 1;
        break; // North
      case 1:
        frontX += 1;
        break; // East
      case 2:
        frontY += 1;
        break; // South
      case 3:
        frontX -= 1;
        break; // West
    }

    return { x: frontX, y: frontY };
  }

  /**
   * Kiểm tra vị trí có nằm trong biên của bản đồ không
   * @param {number} tileX
   * @param {number} tileY
   * @returns {boolean}
   */
  isWithinBounds(tileX, tileY) {
    if (!this.map) return false;
    return (
      tileX >= 0 &&
      tileX < this.map.width &&
      tileY >= 0 &&
      tileY < this.map.height
    );
  }

  /**
   * Kiểm tra tile có thể di chuyển được không
   * @param {number} tileX
   * @param {number} tileY
   * @returns {boolean}
   */
  isValidTile(tileX, tileY) {
    if (!this.layer) return false;

    // Kiểm tra biên
    if (!this.isWithinBounds(tileX, tileY)) return false;

    const tile = this.layer.getTileAt(tileX, tileY);
    if (!tile) return false;

    // Robot có thể di chuyển trên Road (index 1) và Robot tile (index 6)
    return tile.index === 1 || tile.index === 6;
  }

  /**
   * Di chuyển thẳng theo hướng hiện tại
   * @returns {boolean} Success/failure
   */
  moveForward() {
    if (this.isMoving) {
      console.log("Robot is already moving!");
      return false;
    }

    const frontTile = this.getFrontTile();

    // Kiểm tra biên
    if (!this.isWithinBounds(frontTile.x, frontTile.y)) {
      console.log(`Out of bounds at (${frontTile.x}, ${frontTile.y})`);
      return false;
    }

    // Kiểm tra tile hợp lệ
    if (!this.isValidTile(frontTile.x, frontTile.y)) {
      console.log(`Invalid tile at (${frontTile.x}, ${frontTile.y})`);
      return false;
    }

    console.log(
      `Moving ${this.getCurrentDirection()} to tile (${frontTile.x}, ${
        frontTile.y
      })`
    );

    this.isMoving = true;
    const targetPos = this.getTileWorldCenter(frontTile.x, frontTile.y);

    // Cập nhật vị trí tile
    this.position.x = frontTile.x;
    this.position.y = frontTile.y;

    // Tween di chuyển
    this.scene.tweens.add({
      targets: this.sprite,
      x: targetPos.x,
      y: targetPos.y + 30,
      duration: 300,
      ease: "Power2",
      onUpdate: () => {
        this.updateSpriteDepth();
      },
      onComplete: () => {
        this.isMoving = false;
        console.log(`Arrived at tile (${this.position.x}, ${this.position.y})`);
        this.updateSpriteDepth();
      },
    });

    return true;
  }

  /**
   * Quay trái 90 độ
   * @returns {boolean} Success/failure
   */
  turnLeft() {
    if (this.isMoving) {
      console.log("Cannot turn while moving!");
      return false;
    }

    const oldDirection = this.getCurrentDirection();
    this.direction = (this.direction - 1 + 4) % 4;
    this.updateSpriteRotation();
    this.updateSpriteDepth();

    console.log(`Turned left: ${oldDirection} → ${this.getCurrentDirection()}`);
    return true;
  }

  /**
   * Quay phải 90 độ
   * @returns {boolean} Success/failure
   */
  turnRight() {
    if (this.isMoving) {
      console.log("Cannot turn while moving!");
      return false;
    }

    const oldDirection = this.getCurrentDirection();
    this.direction = (this.direction + 1) % 4;
    this.updateSpriteRotation();
    this.updateSpriteDepth();

    console.log(
      `Turned right: ${oldDirection} → ${this.getCurrentDirection()}`
    );
    return true;
  }

  /**
   * Quay lại sau lưng 180 độ
   * @returns {boolean} Success/failure
   */
  turnBack() {
    if (this.isMoving) {
      console.log("Cannot turn while moving!");
      return false;
    }

    const oldDirection = this.getCurrentDirection();
    this.direction = (this.direction + 2) % 4;
    this.updateSpriteRotation();
    this.updateSpriteDepth();

    console.log(
      `Turned around: ${oldDirection} → ${this.getCurrentDirection()}`
    );
    return true;
  }

  /**
   * Lấy vị trí tile hiện tại
   * @returns {Object} {x, y} tile coordinates
   */
  getCurrentTilePosition() {
    return { ...this.position };
  }

  /**
   * Lấy key của tile hiện tại
   * @returns {string} Tile key format: "x,y"
   */
  getCurrentTileKey() {
    return `${this.position.x},${this.position.y}`;
  }

  /**
   * Kiểm tra robot có đang di chuyển không
   * @returns {boolean}
   */
  isRobotMoving() {
    return this.isMoving;
  }

  /**
   * Chuyển đổi tên hướng thành số
   * @param {string} direction - Tên hướng: "north", "east", "south", "west"
   * @returns {number} Direction index: 0=north, 1=east, 2=south, 3=west
   */
  static getDirectionIndex(direction) {
    const directions = {
      north: 0,
      east: 1,
      south: 2,
      west: 3,
    };
    return directions[direction] || 0;
  }

  /**
   * Tạo robot từ config
   * @param {Object} config - Robot config
   * @param {Phaser.Scene} scene - Scene object
   * @returns {Robot} Robot instance
   */
  static fromConfig(config, scene) {
    const x = config.tile?.x || 0;
    const y = config.tile?.y || 0;
    const direction = Robot.getDirectionIndex(config.direction || "north");

    return new Robot(scene, x, y, direction);
  }
}
