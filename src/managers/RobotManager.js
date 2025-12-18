import Phaser from "phaser";

/**
 * RobotManager - Quản lý robot movement và rotation
 *
 * Tách từ Scene.js để tách biệt trách nhiệm
 * Xử lý tất cả logic liên quan đến robot: di chuyển, quay, collision detection
 */
export class RobotManager {
  constructor(scene, robot, map, layer) {
    this.scene = scene;
    this.robot = robot;
    this.map = map;
    this.layer = layer;
    this.robotModel = null; // Will be set during initialization
  }

  /**
   * Khởi tạo robot với vị trí và hướng từ config
   * @param {Object} objectConfig - Config từ mapConfigs
   */
  async initialize(objectConfig) {
    if (!this.robot) return;

    // Create a temporary RobotModel for old config-based initialization
    const robotConfig = {
      position: objectConfig?.robot?.tile || { x: 0, y: 0 },
      direction: objectConfig?.robot?.direction || "north",
    };

    const { RobotModel } = await import("../models/RobotModel.js");
    this.robotModel = new RobotModel(robotConfig);
    this.robotModel.setMapReferences(this.map, this.layer);

    this.updateRobotRotation();
    this.updateRobotDepth();
  }

  /**
   * Khởi tạo robot với MapModel thay vì config
   * @param {MapModel} mapModel - Map model
   */
  initializeWithModel(mapModel) {
    if (!this.robot) return;

    const robotModel = mapModel.getFirstRobot();
    if (!robotModel) {
      console.warn("⚠️ Không tìm thấy robot model trong map!");
      return;
    }

    // Set robot model and map references
    this.robotModel = robotModel;
    this.robotModel.setMapReferences(this.map, this.layer);

    this.updateRobotRotation();
    this.updateRobotDepth();
  }

  /**
   * Cập nhật depth để robot luôn ở trên các object khác cùng tile
   */
  updateRobotDepth() {
    if (!this.robot) return;
    // Depth theo y: cao hơn box (y-1) nhưng thấp hơn pin (sẽ đặt y+20)
    this.robot.setDepth(this.robot.y + 10);
  }

  /**
   * Xác định hướng hiện tại của robot
   * @returns {string} Direction name: 'north', 'east', 'south', 'west'
   */
  getCurrentDirection() {
    return this.robotModel ? this.robotModel.getDirectionName() : "north";
  }

  /**
   * Lấy tọa độ tile phía trước robot theo hướng hiện tại
   * @returns {Object} {x, y} coordinates of front tile
   */
  getFrontTile() {
    return this.robotModel ? this.robotModel.getFrontTile() : { x: 0, y: 0 };
  }

  /**
   * Kiểm tra vị trí có nằm trong biên của bản đồ không
   * @param {number} tileX
   * @param {number} tileY
   * @returns {boolean}
   */
  isWithinBounds(tileX, tileY) {
    return this.robotModel
      ? this.robotModel.isWithinBounds(tileX, tileY)
      : false;
  }

  /**
   * Kiểm tra tile có thể di chuyển được không
   * @param {number} tileX
   * @param {number} tileY
   * @returns {boolean}
   */
  isValidTile(tileX, tileY) {
    return this.robotModel ? this.robotModel.isValidTile(tileX, tileY) : false;
  }

  /**
   * Di chuyển thẳng theo hướng hiện tại của robot
   * @returns {boolean} Success/failure
   */
  moveForward(onComplete) {
    if (!this.robotModel) {
      console.error("Robot model not initialized!");
      return false;
    }

    // Use RobotModel to validate and get movement result
    const result = this.robotModel.moveForward();

    // Set moving state
    this.robotModel.isMoving = true;
    const targetPos = this.robotModel.getTileWorldCenter(
      result.newPosition.x,
      result.newPosition.y
    );

    // Tween di chuyển (cộng thêm 30 vào Y để phù hợp với MapLoader)
    this.scene.tweens.add({
      targets: this.robot,
      x: targetPos.x,
      y: targetPos.y + 30,
      duration: 300,
      ease: "Power2",
      onUpdate: () => {
        this.updateRobotDepth();
      },
      onComplete: () => {
        this.robotModel.isMoving = false;
        this.updateRobotDepth();

        // Kiểm tra thua sau khi di chuyển xong
        if (!result.success) {
          this.scene.lose(result.error);
          return;
        }

        // Thông báo hoàn thành bước di chuyển cho caller (vd: ProgramExecutor)
        if (typeof onComplete === "function") {
          onComplete();
        }
      },
    });

    return result.success;
  }

  /**
   * Quay trái 90 độ
   * @returns {boolean} Success/failure
   */
  turnLeft() {
    if (!this.robotModel) {
      console.error("Robot model not initialized!");
      return false;
    }

    if (this.robotModel.isMoving) {
      return false;
    }

    const oldDirection = this.robotModel.getDirectionName();
    this.robotModel.turnLeft();
    this.updateRobotRotation();
    this.updateRobotDepth();
    return true;
  }

  /**
   * Quay phải 90 độ
   * @returns {boolean} Success/failure
   */
  turnRight() {
    if (!this.robotModel) {
      console.error("Robot model not initialized!");
      return false;
    }

    if (this.robotModel.isMoving) {
      return false;
    }

    const oldDirection = this.robotModel.getDirectionName();
    this.robotModel.turnRight();
    this.updateRobotRotation();
    this.updateRobotDepth();
    return true;
  }

  /**
   * Quay lại sau lưng 180 độ
   * @returns {boolean} Success/failure
   */
  turnBack() {
    if (!this.robotModel) {
      console.error("Robot model not initialized!");
      return false;
    }

    if (this.robotModel.isMoving) {
      return false;
    }

    const oldDirection = this.robotModel.getDirectionName();
    this.robotModel.turnBack();
    this.updateRobotRotation();
    this.updateRobotDepth();
    return true;
  }

  /**
   * Cập nhật rotation sprite của robot
   */
  updateRobotRotation() {
    if (!this.robot || !this.robotModel) return;

    // Get sprite key from RobotModel
    const spriteKey = this.robotModel.getSpriteKey();

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
   * Lấy vị trí tile hiện tại của robot
   * @returns {Object} {x, y} tile coordinates
   */
  getCurrentTilePosition() {
    return this.robotModel ? this.robotModel.position : { x: 0, y: 0 };
  }

  /**
   * Lấy key của tile hiện tại (dùng cho battery tracking)
   * @returns {string} Tile key format: "x,y"
   */
  getCurrentTileKey() {
    return this.robotModel ? this.robotModel.getCurrentTileKey() : "0,0";
  }

  /**
   * Kiểm tra robot có đang di chuyển không
   * @returns {boolean}
   */
  isRobotMoving() {
    return this.robotModel ? this.robotModel.isMoving : false;
  }

  /**
   * Lấy world center của tile
   * @param {number} tileX
   * @param {number} tileY
   * @returns {Object} {x, y} world coordinates
   */
  getTileWorldCenter(tileX, tileY) {
    return this.robotModel
      ? this.robotModel.getTileWorldCenter(tileX, tileY)
      : { x: 0, y: 0 };
  }
}
