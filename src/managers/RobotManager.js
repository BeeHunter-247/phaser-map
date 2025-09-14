import { Robot } from "../models/Robot.js";

/**
 * RobotManager - Quản lý robot và di chuyển (Gộp từ RobotManager và RobotController)
 *
 * Trách nhiệm:
 * - Quản lý robot sprite và model
 * - Xử lý di chuyển và xoay
 * - Kiểm tra va chạm
 * - Cập nhật game state
 * - Wrapper cho Robot model với game-specific logic
 */
export class RobotManager {
  constructor(scene, map, layer) {
    this.scene = scene;
    this.map = map;
    this.layer = layer;
    this.robot = null;
    this.gameState = null;
  }

  /**
   * Khởi tạo robot
   * @param {Challenge} challenge - Dữ liệu thử thách
   * @param {Phaser.GameObjects.Sprite} robotSprite - Robot sprite
   * @param {GameState} gameState - Trạng thái game
   */
  initialize(challenge, robotSprite, gameState) {
    this.gameState = gameState;

    if (!robotSprite) {
      console.warn("⚠️ RobotManager: No robot sprite provided");
      return;
    }

    // Tạo Robot model
    this.robot = new Robot(robotSprite);

    // Set vị trí và hướng ban đầu
    const startPos = challenge.getRobotPosition();
    this.robot.setPosition(startPos.x, startPos.y);
    this.robot.setDirection(challenge.getRobotDirection());

    console.log(
      `✅ RobotManager: Robot initialized at (${startPos.x}, ${
        startPos.y
      }) facing ${challenge.getRobotDirection()}`
    );
  }

  /**
   * Robot di chuyển tiến
   * @returns {boolean} Thành công hay không
   */
  moveForward() {
    if (!this.robot) {
      console.warn("⚠️ RobotManager: Robot not initialized");
      return false;
    }

    const newPos = this.robot.getNextPosition();

    // Kiểm tra va chạm với map
    if (!this.canMoveTo(newPos.x, newPos.y)) {
      console.log(
        `🚫 RobotManager: Cannot move to (${newPos.x}, ${newPos.y}) - blocked`
      );
      return false;
    }

    // Di chuyển robot
    this.robot.moveForward();

    // Cập nhật game state
    this.gameState.updateRobotPosition(
      this.robot.position.x,
      this.robot.position.y
    );

    console.log(
      `✅ RobotManager: Moved to (${this.robot.position.x}, ${this.robot.position.y})`
    );
    return true;
  }

  /**
   * Robot rẽ trái
   * @returns {boolean} Thành công hay không
   */
  turnLeft() {
    if (!this.robot) {
      console.warn("⚠️ RobotManager: Robot not initialized");
      return false;
    }

    this.robot.turnLeft();
    this.gameState.updateRobotDirection(this.robot.direction);

    console.log(
      `✅ RobotManager: Turned left, now facing ${this.robot.direction}`
    );
    return true;
  }

  /**
   * Robot rẽ phải
   * @returns {boolean} Thành công hay không
   */
  turnRight() {
    if (!this.robot) {
      console.warn("⚠️ RobotManager: Robot not initialized");
      return false;
    }

    this.robot.turnRight();
    this.gameState.updateRobotDirection(this.robot.direction);

    console.log(
      `✅ RobotManager: Turned right, now facing ${this.robot.direction}`
    );
    return true;
  }

  /**
   * Kiểm tra có thể di chuyển đến vị trí không
   * @param {number} x - Tọa độ x
   * @param {number} y - Tọa độ y
   * @returns {boolean}
   */
  canMoveTo(x, y) {
    // Kiểm tra biên map
    if (
      x < 0 ||
      y < 0 ||
      x >= this.map.widthInPixels / this.map.tileWidth ||
      y >= this.map.heightInPixels / this.map.tileHeight
    ) {
      return false;
    }

    // Kiểm tra tile có thể đi qua không
    const tile = this.layer.getTileAt(x, y);
    if (!tile) {
      return false;
    }

    // Kiểm tra tile properties (có thể mở rộng thêm logic)
    return true;
  }

  /**
   * Lấy vị trí hiện tại của robot
   * @returns {Object} {x, y}
   */
  getPosition() {
    return this.robot ? this.robot.position : { x: 0, y: 0 };
  }

  /**
   * Lấy hướng hiện tại của robot
   * @returns {string}
   */
  getDirection() {
    return this.robot ? this.robot.direction : "east";
  }

  /**
   * Lấy robot sprite
   * @returns {Phaser.GameObjects.Sprite|null}
   */
  getRobotSprite() {
    return this.robot ? this.robot.sprite : null;
  }

  /**
   * Reset robot về vị trí ban đầu
   * @param {Challenge} challenge - Dữ liệu thử thách
   */
  reset(challenge) {
    if (!this.robot) return;

    const startPos = challenge.getRobotPosition();
    this.robot.setPosition(startPos.x, startPos.y);
    this.robot.setDirection(challenge.getRobotDirection());

    this.gameState.updateRobotPosition(startPos.x, startPos.y);
    this.gameState.updateRobotDirection(challenge.getRobotDirection());

    console.log(
      `✅ RobotManager: Robot reset to (${startPos.x}, ${
        startPos.y
      }) facing ${challenge.getRobotDirection()}`
    );
  }

  // ===== METHODS TỪ ROBOTCONTROLLER =====

  /**
   * Cập nhật depth để robot luôn ở trên các object khác cùng tile
   */
  updateRobotDepth() {
    if (!this.robot) return;
    this.robot.updateSpriteDepth();
  }

  /**
   * Lấy vị trí hiện tại của robot (tile coordinates)
   * @returns {Object} {x, y} tile coordinates
   */
  getCurrentPosition() {
    return this.robot ? this.robot.position : { x: 0, y: 0 };
  }

  /**
   * Lấy hướng hiện tại của robot
   * @returns {string} Direction string
   */
  getCurrentDirection() {
    return this.robot ? this.robot.direction : "east";
  }

  /**
   * Kiểm tra robot có thể di chuyển tiến không
   * @returns {boolean} Có thể di chuyển hay không
   */
  canMoveForward() {
    if (!this.robot) return false;

    const nextPos = this.robot.getNextPosition();
    return this.canMoveTo(nextPos.x, nextPos.y);
  }

  /**
   * Kiểm tra robot có thể thu thập pin không
   * @returns {boolean} Có thể thu thập hay không
   */
  canCollectBattery() {
    if (!this.robot) return false;

    const pos = this.robot.position;
    // Logic kiểm tra pin tại vị trí hiện tại
    // Có thể mở rộng thêm logic kiểm tra pin
    return true;
  }

  /**
   * Kiểm tra robot có thể đẩy hộp không
   * @returns {boolean} Có thể đẩy hay không
   */
  canPushBox() {
    if (!this.robot) return false;

    const nextPos = this.robot.getNextPosition();
    // Logic kiểm tra hộp tại vị trí tiếp theo
    // Có thể mở rộng thêm logic kiểm tra hộp
    return true;
  }

  /**
   * Lấy robot sprite
   * @returns {Phaser.GameObjects.Sprite|null}
   */
  getRobotSprite() {
    return this.robot ? this.robot.sprite : null;
  }

  /**
   * Lấy robot model
   * @returns {Robot|null}
   */
  getRobotModel() {
    return this.robot;
  }
}
