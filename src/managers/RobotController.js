import Phaser from "phaser";

/**
 * RobotController - Quản lý robot movement và rotation
 * 
 * Tách từ Scene.js để tách biệt trách nhiệm
 * Xử lý tất cả logic liên quan đến robot: di chuyển, quay, collision detection
 */
export class RobotController {
  constructor(scene, robot, map, layer) {
    this.scene = scene;
    this.robot = robot;
    this.map = map;
    this.layer = layer;
    
    // Robot state
    this.robotDirection = 0; // 0: North, 1: East, 2: South, 3: West
    this.robotTileX = 0;
    this.robotTileY = 0;
    this.isMoving = false;
  }

  /**
   * Khởi tạo robot với vị trí và hướng từ config
   * @param {Object} objectConfig - Config từ mapConfigs
   */
  initialize(objectConfig) {
    if (!this.robot) return;

    const robotTile = this.findRobotTile();
    if (robotTile) {
      this.robotTileX = robotTile.x;
      this.robotTileY = robotTile.y;

      // Lấy hướng từ config hoặc mặc định là north
      const configDirection = objectConfig?.robot?.direction || "north";
      this.robotDirection = this.getDirectionIndex(configDirection);
      this.updateRobotRotation();

      // Log initial robot state
      console.log(
        `🤖 Robot initialized at tile (${this.robotTileX}, ${this.robotTileY})`
      );
      console.log(
        `   Facing: ${this.getCurrentDirection()} (from config: "${configDirection}")`
      );
      console.log(`   Robot sprite: robot_${configDirection}`);
    }
  }

  /**
   * Tìm tile hiện tại của robot
   * @returns {Object|null} {x, y} hoặc null nếu không tìm thấy
   */
  findRobotTile() {
    if (!this.robot) return null;

    const robotX = this.robot.x;
    const robotY = this.robot.y;

    // Convert world position back to tile position
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const worldCenter = this.getTileWorldCenter(x, y);
        const distance = Phaser.Math.Distance.Between(
          robotX,
          robotY,
          worldCenter.x,
          worldCenter.y
        );

        if (distance < 20) {
          // Threshold cho khoảng cách
          return { x, y };
        }
      }
    }

    return null;
  }

  /**
   * Lấy world center của tile
   * @param {number} tileX 
   * @param {number} tileY 
   * @returns {Object} {x, y} world coordinates
   */
  getTileWorldCenter(tileX, tileY) {
    const worldPoint = this.layer.tileToWorldXY(tileX, tileY);
    const cx = worldPoint.x + (this.map.tileWidth * this.layer.scaleX) / 2;
    const cy = worldPoint.y + (this.map.tileHeight * this.layer.scaleY) / 2;
    return { x: cx, y: cy };
  }

  /**
   * Xác định hướng hiện tại của robot
   * @returns {string} Direction name: 'north', 'east', 'south', 'west'
   */
  getCurrentDirection() {
    const directions = ["north", "east", "south", "west"];
    return directions[this.robotDirection];
  }

  /**
   * Lấy tọa độ tile phía trước robot theo hướng hiện tại
   * @returns {Object} {x, y} coordinates of front tile
   */
  getFrontTile() {
    let frontX = this.robotTileX;
    let frontY = this.robotTileY;

    switch (this.robotDirection) {
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
    // Kiểm tra biên
    if (
      tileX < 0 ||
      tileX >= this.map.width ||
      tileY < 0 ||
      tileY >= this.map.height
    ) {
      return false;
    }

    const tile = this.layer.getTileAt(tileX, tileY);
    if (!tile) return false;

    // Robot có thể di chuyển trên Road (index 3), Robot tile (index 4), và Battery tile (index 2)
    return (tile.index >= 1 && tile.index <= 4) || tile.index === 6;
  }

  /**
   * Di chuyển thẳng theo hướng hiện tại của robot
   * @returns {boolean} Success/failure
   */
  moveForward() {
    if (this.isMoving) {
      console.log("Robot is already moving!");
      return false;
    }

    const frontTile = this.getFrontTile();

    // Thua khi đi ra ngoài biên
    if (!this.isWithinBounds(frontTile.x, frontTile.y)) {
      this.scene.lose(`Đi ra ngoài bản đồ tại (${frontTile.x}, ${frontTile.y})`);
      return false;
    }

    const targetTile = this.layer.getTileAt(frontTile.x, frontTile.y);
    if (!targetTile) {
      this.scene.lose(`Ô không hợp lệ tại (${frontTile.x}, ${frontTile.y})`);
      return false;
    }

    // Luật thua mới: chạm vào ô trống (index 0) => thua
    if (targetTile.index === 0) {
      this.scene.lose(
        `Rơi vào ô trống (index 0) tại (${frontTile.x}, ${frontTile.y})`
      );
      return false;
    }

    // Luật thua cũ: chạm vào tile index 2 hoặc 5 => thua (nếu có)
    if (targetTile.index === 2 || targetTile.index === 5) {
      this.scene.lose(
        `Rơi vào ô cấm (index ${targetTile.index}) tại (${frontTile.x}, ${frontTile.y})`
      );
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
    this.robotTileX = frontTile.x;
    this.robotTileY = frontTile.y;

    // Tween di chuyển (cộng thêm 10 vào Y để phù hợp với MapLoader)
    this.scene.tweens.add({
      targets: this.robot,
      x: targetPos.x,
      y: targetPos.y + 10,
      duration: 300,
      ease: "Power2",
      onComplete: () => {
        this.isMoving = false;
        console.log(`Arrived at tile (${this.robotTileX}, ${this.robotTileY})`);
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
    this.robotDirection = (this.robotDirection - 1 + 4) % 4;
    this.updateRobotRotation();

    console.log(`Turned left: ${oldDirection} → ${this.getCurrentDirection()}`);
    console.log(
      `   Robot sprite changed to: robot_${this.getCurrentDirection().toLowerCase()}`
    );
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
    this.robotDirection = (this.robotDirection + 1) % 4;
    this.updateRobotRotation();

    console.log(
      `Turned right: ${oldDirection} → ${this.getCurrentDirection()}`
    );
    console.log(
      `   Robot sprite changed to: robot_${this.getCurrentDirection().toLowerCase()}`
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
    this.robotDirection = (this.robotDirection + 2) % 4;
    this.updateRobotRotation();

    console.log(
      `Turned around: ${oldDirection} → ${this.getCurrentDirection()}`
    );
    console.log(
      `   Robot sprite changed to: robot_${this.getCurrentDirection().toLowerCase()}`
    );
    return true;
  }

  /**
   * Cập nhật rotation sprite của robot
   */
  updateRobotRotation() {
    if (!this.robot) return;

    // Thay đổi sprite theo hướng thay vì xoay
    const directionSprites = [
      "robot_north",
      "robot_east",
      "robot_south",
      "robot_west",
    ];
    const spriteKey = directionSprites[this.robotDirection];

    // Lưu vị trí và scale hiện tại
    const currentX = this.robot.x;
    const currentY = this.robot.y;
    const currentScale = this.robot.scaleX;

    // Thay đổi texture
    this.robot.setTexture(spriteKey);

    // Khôi phục vị trí và scale với độ cao điều chỉnh (giống MapLoader)
    // Robot đã có độ cao đúng từ MapLoader (y + 10), chỉ cần giữ nguyên
    this.robot.setPosition(currentX, currentY);
    this.robot.setScale(currentScale);
    this.robot.setOrigin(0.5, 1); // Đặt anchor point ở giữa dưới
  }

  /**
   * Chuyển đổi tên hướng thành số
   * @param {string} direction - Tên hướng: "north", "east", "south", "west"
   * @returns {number} Direction index: 0=north, 1=east, 2=south, 3=west
   */
  getDirectionIndex(direction) {
    const directions = {
      north: 0,
      east: 1,
      south: 2,
      west: 3,
    };
    return directions[direction] || 0; // Default to north if invalid
  }

  /**
   * Lấy vị trí tile hiện tại của robot
   * @returns {Object} {x, y} tile coordinates
   */
  getCurrentTilePosition() {
    return { x: this.robotTileX, y: this.robotTileY };
  }

  /**
   * Lấy key của tile hiện tại (dùng cho battery tracking)
   * @returns {string} Tile key format: "x,y"
   */
  getCurrentTileKey() {
    return `${this.robotTileX},${this.robotTileY}`;
  }

  /**
   * Kiểm tra robot có đang di chuyển không
   * @returns {boolean}
   */
  isRobotMoving() {
    return this.isMoving;
  }
}
