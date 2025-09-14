import { BaseModel } from "./BaseModel.js";

/**
 * BoxModel - Model quản lý trạng thái và hành vi của box
 */
export class BoxModel extends BaseModel {
  constructor(config = {}) {
    super(config);

    // Box states
    this.isInWarehouse = config.isInWarehouse || false;
    this.isCarried = config.isCarried || false;
    this.carriedBy = config.carriedBy || null;
    this.isPlaced = config.isPlaced || false;

    // Warehouse info
    this.warehousePosition = config.warehousePosition || null;

    // Visual properties
    this.spread = config.spread || 1;
    this.index = config.index || 0;
    this.originalCount = config.originalCount || 1;
  }

  /**
   * Validate box data
   * @returns {boolean} Is valid
   */
  validate() {
    // Box chỉ có thể ở một trong các trạng thái: warehouse, carried, placed
    const stateCount = [
      this.isInWarehouse,
      this.isCarried,
      this.isPlaced,
    ].filter(Boolean).length;
    if (stateCount > 1) {
      throw new Error(
        "Box can only be in one state: warehouse, carried, or placed"
      );
    }

    if (this.isCarried && !this.carriedBy) {
      throw new Error("Carried box must have carriedBy field");
    }

    return true;
  }

  /**
   * Serialize box data
   * @returns {Object} Serialized data
   */
  serialize() {
    return {
      id: this.id,
      type: this.type,
      position: { ...this.position },
      isInWarehouse: this.isInWarehouse,
      isCarried: this.isCarried,
      carriedBy: this.carriedBy,
      isPlaced: this.isPlaced,
      warehousePosition: this.warehousePosition
        ? { ...this.warehousePosition }
        : null,
      spread: this.spread,
      index: this.index,
      originalCount: this.originalCount,
      isActive: this.isActive,
      metadata: { ...this.metadata },
      createdAt: this.createdAt,
    };
  }

  // ========================================
  // BOX STATE METHODS
  // ========================================

  /**
   * Lấy box từ warehouse
   * @param {string} robotId - ID của robot lấy box
   * @returns {boolean} Success
   */
  takeFromWarehouse(robotId) {
    if (!this.isInWarehouse || this.isCarried || this.isPlaced) {
      return false;
    }

    this.isInWarehouse = false;
    this.isCarried = true;
    this.carriedBy = robotId;

    return true;
  }

  /**
   * Đặt box tại vị trí mới
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {boolean} Success
   */
  placeAtPosition(x, y) {
    if (!this.isCarried) {
      return false;
    }

    this.isCarried = false;
    this.carriedBy = null;
    this.isPlaced = true;
    this.updatePosition(x, y);

    return true;
  }

  /**
   * Trả box về warehouse
   * @returns {boolean} Success
   */
  returnToWarehouse() {
    if (!this.isCarried && !this.isPlaced) {
      return false;
    }

    this.isCarried = false;
    this.carriedBy = null;
    this.isPlaced = false;
    this.isInWarehouse = true;

    if (this.warehousePosition) {
      this.updatePosition(this.warehousePosition.x, this.warehousePosition.y);
    }

    return true;
  }

  /**
   * Reset box về warehouse
   */
  reset() {
    this.isCarried = false;
    this.carriedBy = null;
    this.isPlaced = false;
    this.isInWarehouse = true;
    this.setActive(true);

    if (this.warehousePosition) {
      this.updatePosition(this.warehousePosition.x, this.warehousePosition.y);
    }
  }

  // ========================================
  // STATE CHECKING METHODS
  // ========================================

  /**
   * Kiểm tra box có available trong warehouse không
   * @returns {boolean} Is available in warehouse
   */
  isAvailableInWarehouse() {
    return this.isInWarehouse && this.isActive;
  }

  /**
   * Kiểm tra box có đang được carry không
   * @returns {boolean} Is being carried
   */
  isBeingCarried() {
    return this.isCarried && this.carriedBy !== null;
  }

  /**
   * Kiểm tra box có đã được placed không
   * @returns {boolean} Is placed
   */
  isPlacedOnMap() {
    return this.isPlaced;
  }

  /**
   * Lấy trạng thái hiện tại của box
   * @returns {string} Current state
   */
  getCurrentState() {
    if (this.isInWarehouse) return "warehouse";
    if (this.isCarried) return "carried";
    if (this.isPlaced) return "placed";
    return "unknown";
  }

  /**
   * Lấy sprite key cho box
   * @returns {string} Sprite key
   */
  getSpriteKey() {
    return "box";
  }

  /**
   * Tính toán vị trí visual của box trong nhóm
   * @param {number} tileWidth - Width of tile
   * @param {number} tileHeight - Height of tile
   * @param {number} centerX - Center X of tile
   * @param {number} centerY - Center Y of tile
   * @returns {Object} {x, y} Visual position
   */
  calculateVisualPosition(tileWidth, tileHeight, centerX, centerY) {
    if (this.originalCount <= 1) {
      return { x: centerX, y: centerY };
    }

    // Đặt theo hình tròn quanh center
    const base = Math.min(tileWidth, tileHeight);
    const radius = base * 0.2 * this.spread;
    const angle =
      -Math.PI / 2 + (this.index * (Math.PI * 2)) / this.originalCount;

    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  }

  // ========================================
  // FACTORY METHODS
  // ========================================

  /**
   * Tạo box từ tile config
   * @param {Object} tileConfig - Config từ challenge.json
   * @param {number} index - Index trong nhóm
   * @returns {BoxModel} New box model
   */
  static fromTileConfig(tileConfig, index = 0) {
    const count = tileConfig.count || 1;

    return new BoxModel({
      position: { x: tileConfig.x, y: tileConfig.y },
      isInWarehouse: true,
      warehousePosition: { x: tileConfig.x, y: tileConfig.y },
      spread: tileConfig.spread || 1,
      index: index,
      originalCount: count,
      metadata: {
        tileConfig: tileConfig,
      },
    });
  }

  /**
   * Tạo nhiều boxes từ tile config
   * @param {Object} tileConfig - Config từ challenge.json
   * @returns {Array<BoxModel>} Array of box models
   */
  static createMultipleFromTileConfig(tileConfig) {
    const count = tileConfig.count || 1;
    const boxes = [];

    for (let i = 0; i < count; i++) {
      boxes.push(BoxModel.fromTileConfig(tileConfig, i));
    }

    return boxes;
  }

  /**
   * Tạo boxes từ box config (có thể có nhiều tiles)
   * @param {Object} boxConfig - Config từ challenge.json.boxes
   * @returns {Array<BoxModel>} Array of box models
   */
  static createFromBoxConfig(boxConfig) {
    const boxes = [];

    if (boxConfig.tiles) {
      boxConfig.tiles.forEach((tileConfig) => {
        // Merge box config với tile config
        const mergedConfig = {
          ...tileConfig,
          spread: tileConfig.spread || boxConfig.spread,
        };

        const tileBoxes = BoxModel.createMultipleFromTileConfig(mergedConfig);
        boxes.push(...tileBoxes);
      });
    }

    return boxes;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * So sánh với box khác
   * @param {BoxModel} other - Other box
   * @returns {boolean} Is same
   */
  isSame(other) {
    return this.id === other.id;
  }

  /**
   * Lấy thông tin để debug
   * @returns {string} Debug info
   */
  getDebugInfo() {
    const state = this.getCurrentState();
    const carriedInfo = this.isCarried ? ` by ${this.carriedBy}` : "";
    return `Box at (${this.position.x},${this.position.y}) - ${state}${carriedInfo}`;
  }
}
