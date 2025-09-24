import { BaseModel } from "./BaseModel.js";

/**
 * BatteryModel - Model quản lý trạng thái và hành vi của battery
 */
export class BatteryModel extends BaseModel {
  constructor(config = {}) {
    super(config);

    this.color = config.color || "green";
    this.isCollected = config.isCollected || false;
    this.collectedBy = config.collectedBy || null;
    this.collectedAt = config.collectedAt || null;

    // Collection rules
    this.allowedCollect =
      config.allowedCollect !== undefined ? config.allowedCollect : true;

    // Visual properties
    this.spread = config.spread || 1;
    this.index = config.index || 0; // Index trong nhóm batteries cùng tile
    this.originalCount = config.originalCount || 1; // Số lượng ban đầu tại tile này

    // Sprite reference for visual management
    this.sprite = null;
  }

  /**
   * Validate battery data
   * @returns {boolean} Is valid
   */
  validate() {
    const validColors = ["red", "yellow", "green"];
    if (!validColors.includes(this.color)) {
      throw new Error(`Invalid battery color: ${this.color}`);
    }

    if (this.isCollected && !this.collectedBy) {
      throw new Error("Collected battery must have collectedBy field");
    }

    return true;
  }

  /**
   * Serialize battery data
   * @returns {Object} Serialized data
   */
  serialize() {
    return {
      id: this.id,
      type: this.type,
      position: { ...this.position },
      color: this.color,
      isCollected: this.isCollected,
      collectedBy: this.collectedBy,
      collectedAt: this.collectedAt,
      allowedCollect: this.allowedCollect,
      spread: this.spread,
      index: this.index,
      originalCount: this.originalCount,
      isActive: this.isActive,
      metadata: { ...this.metadata },
      createdAt: this.createdAt,
    };
  }

  // ========================================
  // BATTERY SPECIFIC METHODS
  // ========================================

  /**
   * Thu thập battery
   * @param {string} robotId - ID của robot thu thập
   * @returns {Object} {success: boolean, gameOver: boolean, message: string}
   */
  collect(robotId) {
    if (this.isCollected || !this.isActive) {
      return {
        success: false,
        gameOver: false,
        message: "Battery already collected or inactive",
      };
    }

    // Kiểm tra allowedCollect
    if (!this.allowedCollect) {
      // Nếu không được phép thu thập, trả về game over
      return {
        success: false,
        gameOver: true,
        message: `Game Over! You collected a forbidden ${this.color} battery at (${this.position.x}, ${this.position.y})`,
      };
    }

    this.isCollected = true;
    this.collectedBy = robotId;
    this.collectedAt = Date.now();
    this.setActive(false);

    // Hide sprite when collected
    this.hideSprite();

    return {
      success: true,
      gameOver: false,
      message: `Collected ${this.color} battery`,
    };
  }

  /**
   * Thu thập battery ở chế độ im lặng (không cập nhật sprite/UI)
   * Dùng cho physical robot mode khi chỉ cần xử lý logic ngầm
   * @param {string} robotId - ID của robot thu thập
   * @returns {Object} {success: boolean, gameOver: boolean, message: string}
   */
  collectSilently(robotId) {
    if (this.isCollected || !this.isActive) {
      return {
        success: false,
        gameOver: false,
        message: "Battery already collected or inactive",
      };
    }

    // Kiểm tra allowedCollect
    if (!this.allowedCollect) {
      return {
        success: false,
        gameOver: true,
        message: `Game Over! You collected a forbidden ${this.color} battery at (${this.position.x}, ${this.position.y})`,
      };
    }

    this.isCollected = true;
    this.collectedBy = robotId;
    this.collectedAt = Date.now();
    this.setActive(false);

    // KHÔNG cập nhật sprite ở chế độ im lặng

    return {
      success: true,
      gameOver: false,
      message: `Collected ${this.color} battery (silent)`,
    };
  }

  /**
   * Reset battery về trạng thái chưa được thu thập
   */
  reset() {
    this.isCollected = false;
    this.collectedBy = null;
    this.collectedAt = null;
    this.setActive(true);

    // Show sprite when reset
    this.showSprite();
  }

  /**
   * Kiểm tra battery có thể thu thập được không
   * @returns {boolean} Is available
   */
  isAvailable() {
    return !this.isCollected && this.isActive;
  }

  /**
   * Lấy sprite key cho battery
   * @returns {string} Sprite key
   */
  getSpriteKey() {
    return `pin_${this.color}`;
  }

  /**
   * Tính toán vị trí visual của battery trong nhóm
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

  /**
   * Tạo battery từ tile config
   * @param {Object} tileConfig - Config từ challenge.json
   * @param {number} index - Index trong nhóm
   * @returns {BatteryModel} New battery model
   */
  static fromTileConfig(tileConfig, index = 0) {
    const count = tileConfig.count || 1;
    let color = "green";

    // Xác định màu theo priority: types[index] > type > 'green'
    if (Array.isArray(tileConfig.types) && tileConfig.types.length > 0) {
      color =
        tileConfig.types[index] ||
        tileConfig.types[tileConfig.types.length - 1];
    } else if (tileConfig.type) {
      color = tileConfig.type;
    }

    return new BatteryModel({
      position: { x: tileConfig.x, y: tileConfig.y },
      color: color,
      spread: tileConfig.spread || 1,
      index: index,
      originalCount: count,
      allowedCollect:
        tileConfig.allowedCollect !== undefined
          ? tileConfig.allowedCollect
          : true,
      metadata: {
        tileConfig: tileConfig,
      },
    });
  }

  /**
   * Tạo nhiều batteries từ tile config
   * @param {Object} tileConfig - Config từ challenge.json
   * @returns {Array<BatteryModel>} Array of battery models
   */
  static createMultipleFromTileConfig(tileConfig) {
    const count = tileConfig.count || 1;
    const batteries = [];

    for (let i = 0; i < count; i++) {
      batteries.push(BatteryModel.fromTileConfig(tileConfig, i));
    }

    return batteries;
  }

  /**
   * Tạo batteries từ battery config (có thể có nhiều tiles)
   * @param {Object} batteryConfig - Config từ challenge.json.batteries
   * @returns {Array<BatteryModel>} Array of battery models
   */
  static createFromBatteryConfig(batteryConfig) {
    const batteries = [];

    if (batteryConfig.tiles) {
      batteryConfig.tiles.forEach((tileConfig) => {
        // Merge battery config với tile config
        const mergedConfig = {
          ...tileConfig,
          type: tileConfig.type || batteryConfig.type,
          spread: tileConfig.spread || batteryConfig.spread,
        };

        const tileBatteries =
          BatteryModel.createMultipleFromTileConfig(mergedConfig);
        batteries.push(...tileBatteries);
      });
    }

    return batteries;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * So sánh với battery khác
   * @param {BatteryModel} other - Other battery
   * @returns {boolean} Is same
   */
  isSame(other) {
    return this.id === other.id;
  }

  /**
   * Kiểm tra có cùng màu không
   * @param {string} color - Color to check
   * @returns {boolean} Same color
   */
  isSameColor(color) {
    return this.color === color;
  }

  /**
   * Lấy thông tin để debug
   * @returns {string} Debug info
   */
  getDebugInfo() {
    return `Battery(${this.color}) at (${this.position.x},${
      this.position.y
    }) - ${this.isCollected ? "collected" : "available"}`;
  }

  // ========================================
  // SPRITE MANAGEMENT METHODS
  // ========================================

  /**
   * Set sprite reference
   * @param {Phaser.GameObjects.Sprite} sprite - Battery sprite
   */
  setSprite(sprite) {
    this.sprite = sprite;
  }

  /**
   * Get sprite reference
   * @returns {Phaser.GameObjects.Sprite|null} Battery sprite
   */
  getSprite() {
    return this.sprite;
  }

  /**
   * Hide battery sprite
   */
  hideSprite() {
    if (this.sprite && this.sprite.active) {
      this.sprite.setVisible(false);
    }
  }

  /**
   * Show battery sprite
   */
  showSprite() {
    if (this.sprite && this.sprite.active) {
      this.sprite.setVisible(true);
    }
  }

  /**
   * Destroy battery sprite
   */
  destroySprite() {
    if (this.sprite && this.sprite.active) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }

  /**
   * Update sprite position based on model position
   * @param {number} tileWidth - Width of tile
   * @param {number} tileHeight - Height of tile
   * @param {number} centerX - Center X of tile
   * @param {number} centerY - Center Y of tile
   */
  updateSpritePosition(tileWidth, tileHeight, centerX, centerY) {
    if (!this.sprite || !this.sprite.active) return;

    const visualPos = this.calculateVisualPosition(
      tileWidth,
      tileHeight,
      centerX,
      centerY
    );
    this.sprite.setPosition(visualPos.x, visualPos.y);
  }
}
