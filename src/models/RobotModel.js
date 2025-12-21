import { BaseModel } from "./BaseModel.js";

/**
 * RobotModel - Model quản lý trạng thái và hành vi của robot
 */
export class RobotModel extends BaseModel {
  constructor(config = {}) {
    super(config);

    // Robot direction: 0=north, 1=east, 2=south, 3=west
    this.direction = this.parseDirection(config.direction || "north");
    this.isMoving = false;

    // Map references for validation
    this.map = null;
    this.layer = null;

    // Inventory - những gì robot đang mang
    this.inventory = {
      batteries: { red: 0, yellow: 0, green: 0 },
      boxes: 0,
    };

    // Movement history
    this.movementHistory = [];
    this.maxHistorySize = 100;
  }

  /**
   * Parse direction từ string sang number
   * @param {string|number} direction - Direction
   * @returns {number} Direction index
   */
  parseDirection(direction) {
    if (typeof direction === "number") {
      return Math.max(0, Math.min(3, direction));
    }

    const directions = {
      north: 0,
      east: 1,
      south: 2,
      west: 3,
    };

    return directions[direction.toLowerCase()] || 0;
  }

  /**
   * Lấy direction name từ index
   * @returns {string} Direction name
   */
  getDirectionName() {
    const directions = ["north", "east", "south", "west"];
    return directions[this.direction];
  }

  /**
   * Validate robot data
   * @returns {boolean} Is valid
   */
  validate() {
    if (this.direction < 0 || this.direction > 3) {
      throw new Error(`Invalid direction: ${this.direction}`);
    }

    if (
      typeof this.position.x !== "number" ||
      typeof this.position.y !== "number"
    ) {
      throw new Error("Invalid position coordinates");
    }

    return true;
  }

  /**
   * Serialize robot data
   * @returns {Object} Serialized data
   */
  serialize() {
    return {
      id: this.id,
      type: this.type,
      position: { ...this.position },
      direction: this.direction,
      directionName: this.getDirectionName(),
      isMoving: this.isMoving,
      inventory: {
        batteries: { ...this.inventory.batteries },
        boxes: this.inventory.boxes,
      },
      isActive: this.isActive,
      metadata: { ...this.metadata },
      createdAt: this.createdAt,
    };
  }

  // ========================================
  // MAP AND VALIDATION METHODS
  // ========================================

  /**
   * Set map references for validation
   * @param {Object} map - Map object
   * @param {Object} layer - Layer object
   */
  setMapReferences(map, layer) {
    this.map = map;
    this.layer = layer;
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
    if (!this.map || !this.layer) return false;

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

    // Robot có thể di chuyển trên Road (index 1) và Crossroad (index 6)
    return tile.index === 1 || tile.index === 6;
  }

  /**
   * Lấy world center của tile
   * @param {number} tileX
   * @param {number} tileY
   * @returns {Object} {x, y} world coordinates
   */
  getTileWorldCenter(tileX, tileY) {
    if (!this.map || !this.layer) return { x: 0, y: 0 };

    const worldPoint = this.layer.tileToWorldXY(tileX, tileY);
    const cx = worldPoint.x + (this.map.tileWidth * this.layer.scaleX) / 2;
    const cy = worldPoint.y + (this.map.tileHeight * this.layer.scaleY) / 2;
    return { x: cx, y: cy };
  }

  // ========================================
  // MOVEMENT METHODS
  // ========================================

  /**
   * Quay trái 90 độ
   */
  turnLeft() {
    this.direction = (this.direction - 1 + 4) % 4;
    this.addToHistory("turnLeft");
  }

  /**
   * Quay phải 90 độ
   */
  turnRight() {
    this.direction = (this.direction + 1) % 4;
    this.addToHistory("turnRight");
  }

  /**
   * Quay lại 180 độ
   */
  turnBack() {
    this.direction = (this.direction + 2) % 4;
    this.addToHistory("turnBack");
  }

  /**
   * Lấy vị trí phía trước robot
   * @returns {Object} {x, y} Front position
   */
  getFrontPosition() {
    const { x, y } = this.position;

    switch (this.direction) {
      case 0:
        return { x, y: y - 1 }; // North
      case 1:
        return { x: x + 1, y }; // East
      case 2:
        return { x, y: y + 1 }; // South
      case 3:
        return { x: x - 1, y }; // West
      default:
        return { x, y };
    }
  }

  /**
   * Di chuyển đến vị trí mới
   * @param {number} x - New X position
   * @param {number} y - New Y position
   */
  moveTo(x, y) {
    const oldPosition = { ...this.position };
    this.updatePosition(x, y);
    this.addToHistory("move", { from: oldPosition, to: { x, y } });
  }

  /**
   * Di chuyển tiến lên phía trước - move trước, check sau
   * @returns {Object} {success: boolean, newPosition: Object, error: string}
   */
  moveForward() {
    if (this.isMoving) {
      return {
        success: false,
        newPosition: this.position,
        error: "Robot is already moving!",
      };
    }

    const frontTile = this.getFrontPosition();

    // Di chuyển trước (update position)
    this.moveTo(frontTile.x, frontTile.y);

    // Kiểm tra sau khi đã di chuyển
    const validationResult = this.validateCurrentPosition();

    if (!validationResult.isValid) {
      // Không rollback - đứng tại vị trí mới và thông báo thua
      return {
        success: false,
        newPosition: frontTile, // Vị trí mới (không rollback)
        error: validationResult.error,
      };
    }

    // Di chuyển thành công
    return { success: true, newPosition: frontTile, error: null };
  }

  /**
   * Kiểm tra vị trí hiện tại có hợp lệ không
   * @returns {Object} {isValid: boolean, error: string}
   */
  validateCurrentPosition() {
    // Kiểm tra có trong bounds không
    if (!this.isWithinBounds(this.position.x, this.position.y)) {
      return {
        isValid: false,
        error: `Moved outside the map at (${this.position.x}, ${this.position.y})`,
      };
    }

    if (!this.layer) {
      return {
        isValid: false,
        error: `Layer does not exist`,
      };
    }

    const currentTile = this.layer.getTileAt(this.position.x, this.position.y);
    if (!currentTile) {
      return {
        isValid: false,
        error: "Uh-oh! Empty space trap — game over!",
      };
    }

    // Luật thua: chạm vào tile index 4 hoặc 5 => thua
    if (currentTile.index === 4 || currentTile.index === 5) {
      return {
        isValid: false,
        error: "Yikes! You walked straight into nothingness.",
      };
    }

    return { isValid: true, error: null };
  }

  // ========================================
  // INVENTORY METHODS
  // ========================================

  /**
   * Thêm battery vào inventory
   * @param {string} color - Battery color
   * @param {number} count - Number to add
   */
  addBattery(color, count = 1) {
    if (this.inventory.batteries[color] !== undefined) {
      this.inventory.batteries[color] += count;
      this.addToHistory("addBattery", { color, count });
    }
  }

  /**
   * Loại bỏ battery từ inventory
   * @param {string} color - Battery color
   * @param {number} count - Number to remove
   * @returns {boolean} Success
   */
  removeBattery(color, count = 1) {
    if (this.inventory.batteries[color] >= count) {
      this.inventory.batteries[color] -= count;
      this.addToHistory("removeBattery", { color, count });
      return true;
    }
    return false;
  }

  /**
   * Thêm box vào inventory
   * @param {number} count - Number to add
   */
  addBox(count = 1) {
    this.inventory.boxes += count;
    this.addToHistory("addBox", { count });
  }

  /**
   * Loại bỏ box từ inventory
   * @param {number} count - Number to remove
   * @returns {boolean} Success
   */
  removeBox(count = 1) {
    if (this.inventory.boxes >= count) {
      this.inventory.boxes -= count;
      this.addToHistory("removeBox", { count });
      return true;
    }
    return false;
  }

  /**
   * Lấy tổng số battery đang mang
   * @returns {number} Total batteries
   */
  getTotalBatteries() {
    return Object.values(this.inventory.batteries).reduce(
      (sum, count) => sum + count,
      0
    );
  }

  /**
   * Kiểm tra có đủ battery theo màu không
   * @param {string} color - Battery color
   * @param {number} count - Required count
   * @returns {boolean} Has enough
   */
  hasBattery(color, count = 1) {
    return this.inventory.batteries[color] >= count;
  }

  /**
   * Kiểm tra có đủ box không
   * @param {number} count - Required count
   * @returns {boolean} Has enough
   */
  hasBox(count = 1) {
    return this.inventory.boxes >= count;
  }

  // ========================================
  // HISTORY METHODS
  // ========================================

  /**
   * Thêm action vào history
   * @param {string} action - Action name
   * @param {Object} data - Action data
   */
  addToHistory(action, data = {}) {
    this.movementHistory.push({
      action,
      data,
      timestamp: Date.now(),
      position: { ...this.position },
      direction: this.direction,
    });

    // Giới hạn size của history
    if (this.movementHistory.length > this.maxHistorySize) {
      this.movementHistory.shift();
    }
  }

  /**
   * Lấy history
   * @param {number} limit - Limit number of entries
   * @returns {Array} History entries
   */
  getHistory(limit = 10) {
    return this.movementHistory.slice(-limit);
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.movementHistory = [];
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Reset robot về trạng thái ban đầu
   * @param {Object} initialConfig - Initial config
   */
  reset(initialConfig = {}) {
    this.position = initialConfig.position || { x: 0, y: 0 };
    this.direction = this.parseDirection(initialConfig.direction || "north");
    this.isMoving = false;
    this.inventory = {
      batteries: { red: 0, yellow: 0, green: 0 },
      boxes: 0,
    };
    this.clearHistory();
  }

  /**
   * Tạo robot sprite key theo hướng
   * @returns {string} Sprite key
   */
  getSpriteKey() {
    return `robot_${this.getDirectionName()}`;
  }

  /**
   * Lấy key của tile hiện tại (dùng cho battery tracking)
   * @returns {string} Tile key format: "x,y"
   */
  getCurrentTileKey() {
    return `${this.position.x},${this.position.y}`;
  }

  /**
   * Lấy tọa độ tile phía trước robot theo hướng hiện tại
   * @returns {Object} {x, y} coordinates of front tile
   */
  getFrontTile() {
    return this.getFrontPosition();
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
}
