import { BaseModel } from "./BaseModel.js";
import { RobotModel } from "./RobotModel.js";
import { BatteryModel } from "./BatteryModel.js";
import { BoxModel } from "./BoxModel.js";

/**
 * MapModel - Model quản lý toàn bộ trạng thái của một map
 */
export class MapModel extends BaseModel {
  constructor(config = {}) {
    super(config);

    this.mapKey = config.mapKey || "";
    this.width = config.width || 10;
    this.height = config.height || 10;
    this.tileSize = config.tileSize || 64;

    // Collections of entities
    this.robots = new Map();
    this.batteries = new Map();
    this.boxes = new Map();

    // Victory conditions
    this.victoryConditions = config.victory || {};

    // Game state
    this.gameState = "ready"; // ready, playing, won, lost
    this.startTime = null;
    this.endTime = null;

    // Load entities từ config nếu có
    if (config) {
      this.loadFromConfig(config);
    }
  }

  /**
   * Validate map data
   * @returns {boolean} Is valid
   */
  validate() {
    if (!this.mapKey) {
      throw new Error("Map key is required");
    }

    if (this.width <= 0 || this.height <= 0) {
      throw new Error("Invalid map dimensions");
    }

    // Validate tất cả entities
    for (const robot of this.robots.values()) {
      robot.validate();
    }

    for (const battery of this.batteries.values()) {
      battery.validate();
    }

    for (const box of this.boxes.values()) {
      box.validate();
    }

    return true;
  }

  /**
   * Serialize map data
   * @returns {Object} Serialized data
   */
  serialize() {
    return {
      id: this.id,
      type: this.type,
      mapKey: this.mapKey,
      width: this.width,
      height: this.height,
      tileSize: this.tileSize,
      robots: Array.from(this.robots.values()).map((r) => r.serialize()),
      batteries: Array.from(this.batteries.values()).map((b) => b.serialize()),
      boxes: Array.from(this.boxes.values()).map((b) => b.serialize()),
      victoryConditions: { ...this.victoryConditions },
      gameState: this.gameState,
      startTime: this.startTime,
      endTime: this.endTime,
      isActive: this.isActive,
      metadata: { ...this.metadata },
      createdAt: this.createdAt,
    };
  }

  // ========================================
  // CONFIG LOADING METHODS
  // ========================================

  /**
   * Load entities từ map config
   * @param {Object} config - Map config từ challenge.json
   */
  loadFromConfig(config) {
    // Load robot
    if (config.robot) {
      const robot = new RobotModel({
        ...config.robot,
        position: config.robot.tile || { x: 0, y: 0 },
      });
      this.addRobot(robot);
    }

    // Load batteries
    if (config.batteries && Array.isArray(config.batteries)) {
      config.batteries.forEach((batteryConfig) => {
        const batteries = BatteryModel.createFromBatteryConfig(batteryConfig);
        batteries.forEach((battery) => this.addBattery(battery));
      });
    }

    // Load boxes
    if (config.boxes && Array.isArray(config.boxes)) {
      config.boxes.forEach((boxConfig) => {
        const boxes = BoxModel.createFromBoxConfig(boxConfig);
        boxes.forEach((box) => this.addBox(box));
      });
    }

    // Load victory conditions
    if (config.victory) {
      this.victoryConditions = { ...config.victory };
    }
  }

  // ========================================
  // ENTITY MANAGEMENT METHODS
  // ========================================

  /**
   * Thêm robot vào map
   * @param {RobotModel} robot - Robot model
   */
  addRobot(robot) {
    this.robots.set(robot.id, robot);
  }

  /**
   * Thêm battery vào map
   * @param {BatteryModel} battery - Battery model
   */
  addBattery(battery) {
    this.batteries.set(battery.id, battery);
  }

  /**
   * Thêm box vào map
   * @param {BoxModel} box - Box model
   */
  addBox(box) {
    this.boxes.set(box.id, box);
  }

  /**
   * Lấy robot theo ID
   * @param {string} id - Robot ID
   * @returns {RobotModel|null} Robot model
   */
  getRobot(id) {
    return this.robots.get(id) || null;
  }

  /**
   * Lấy robot đầu tiên (thường chỉ có 1 robot)
   * @returns {RobotModel|null} First robot
   */
  getFirstRobot() {
    const robots = Array.from(this.robots.values());
    return robots.length > 0 ? robots[0] : null;
  }

  /**
   * Lấy tất cả batteries tại vị trí
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {Array<BatteryModel>} Batteries at position
   */
  getBatteriesAtPosition(x, y) {
    return Array.from(this.batteries.values()).filter(
      (battery) =>
        battery.position.x === x &&
        battery.position.y === y &&
        battery.isAvailable()
    );
  }

  /**
   * Lấy tất cả boxes tại vị trí
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {Array<BoxModel>} Boxes at position
   */
  getBoxesAtPosition(x, y) {
    return Array.from(this.boxes.values()).filter(
      (box) => box.position.x === x && box.position.y === y
    );
  }

  /**
   * Lấy tất cả batteries available
   * @returns {Array<BatteryModel>} Available batteries
   */
  getAvailableBatteries() {
    return Array.from(this.batteries.values()).filter((b) => b.isAvailable());
  }

  /**
   * Lấy tất cả batteries (cả collected và available)
   * @returns {Array<BatteryModel>} All batteries
   */
  getAllBatteries() {
    return Array.from(this.batteries.values());
  }

  /**
   * Lấy tất cả boxes available trong warehouse
   * @returns {Array<BoxModel>} Available boxes
   */
  getAvailableBoxes() {
    return Array.from(this.boxes.values()).filter((b) =>
      b.isAvailableInWarehouse()
    );
  }

  // ========================================
  // GAME STATE METHODS
  // ========================================

  /**
   * Bắt đầu game
   */
  startGame() {
    this.gameState = "playing";
    this.startTime = Date.now();
  }

  /**
   * Kết thúc game với kết quả
   * @param {boolean} isWon - Game won or lost
   */
  endGame(isWon) {
    this.gameState = isWon ? "won" : "lost";
    this.endTime = Date.now();
  }

  /**
   * Reset game về trạng thái ban đầu
   */
  resetGame() {
    this.gameState = "ready";
    this.startTime = null;
    this.endTime = null;

    // Reset tất cả entities
    this.robots.forEach((robot) => robot.reset());
    this.batteries.forEach((battery) => battery.reset());
    this.boxes.forEach((box) => box.reset());
  }

  /**
   * Lấy thời gian chơi (ms)
   * @returns {number|null} Play time in milliseconds
   */
  getPlayTime() {
    if (!this.startTime) return null;
    const endTime = this.endTime || Date.now();
    return endTime - this.startTime;
  }

  // ========================================
  // VICTORY CHECKING METHODS
  // ========================================

  /**
   * Kiểm tra điều kiện thắng
   * @returns {Object} Victory result
   */
  checkVictoryConditions() {
    // Kiểm tra victory theo box positions nếu có
    if (this.hasBoxVictoryConditions()) {
      return this.checkBoxVictoryConditions();
    }

    // Kiểm tra victory theo batteries
    return this.checkBatteryVictoryConditions();
  }

  /**
   * Kiểm tra có victory conditions theo box không
   * @returns {boolean} Has box victory conditions
   */
  hasBoxVictoryConditions() {
    const byType = this.victoryConditions.byType;
    if (!Array.isArray(byType)) return false;

    return byType.some(
      (condition) =>
        typeof condition.x === "number" && typeof condition.y === "number"
    );
  }

  /**
   * Kiểm tra victory conditions theo box positions
   * @returns {Object} Victory result
   */
  checkBoxVictoryConditions() {
    const requiredPositions = this.victoryConditions.byType || [];
    const results = [];
    let allMet = true;

    for (const requirement of requiredPositions) {
      if (
        typeof requirement.x !== "number" ||
        typeof requirement.y !== "number"
      ) {
        continue;
      }

      const boxesAtPosition = this.getBoxesAtPosition(
        requirement.x,
        requirement.y
      );
      const placedBoxes = boxesAtPosition.filter((box) => box.isPlacedOnMap());
      const currentCount = placedBoxes.length;
      const requiredCount = requirement.count || 0;

      results.push({
        position: { x: requirement.x, y: requirement.y },
        current: currentCount,
        required: requiredCount,
        met: currentCount === requiredCount,
      });

      if (currentCount !== requiredCount) {
        allMet = false;
      }
    }

    return {
      isVictory: allMet,
      type: "boxes",
      results: results,
      description: this.victoryConditions.description,
    };
  }

  /**
   * Kiểm tra victory conditions theo batteries
   * @returns {Object} Victory result
   */
  checkBatteryVictoryConditions() {
    const required = this.getRequiredBatteries();
    if (!required) {
      return { isVictory: false, type: "batteries" };
    }

    const collected = this.getCollectedBatteriesByColor();
    const isVictory = Object.keys(required).every(
      (color) => collected[color] >= required[color]
    );

    return {
      isVictory,
      type: "batteries",
      collected: collected,
      required: required,
      description: this.victoryConditions.description,
    };
  }

  /**
   * Lấy required batteries từ victory conditions
   * @returns {Object|null} Required batteries by color
   */
  getRequiredBatteries() {
    const byType = this.victoryConditions.byType;
    if (!Array.isArray(byType) || byType.length === 0) {
      return null;
    }

    const firstCondition = byType[0];
    if (typeof firstCondition.x === "number") {
      return null; // This is box victory condition
    }

    return {
      red: firstCondition.red || 0,
      yellow: firstCondition.yellow || 0,
      green: firstCondition.green || 0,
    };
  }

  /**
   * Đếm batteries đã thu thập theo màu
   * @returns {Object} Collected batteries by color
   */
  getCollectedBatteriesByColor() {
    const collected = { red: 0, yellow: 0, green: 0 };

    this.batteries.forEach((battery) => {
      if (battery.isCollected) {
        collected[battery.color]++;
      }
    });

    return collected;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Kiểm tra vị trí có hợp lệ không
   * @param {number} x - X position
   * @param {number} y - Y position
   * @returns {boolean} Is valid position
   */
  isValidPosition(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /**
   * Lấy thống kê map
   * @returns {Object} Map statistics
   */
  getStatistics() {
    const totalBatteries = this.batteries.size;
    const collectedBatteries = Array.from(this.batteries.values()).filter(
      (b) => b.isCollected
    ).length;
    const totalBoxes = this.boxes.size;
    const placedBoxes = Array.from(this.boxes.values()).filter((b) =>
      b.isPlacedOnMap()
    ).length;

    return {
      robots: this.robots.size,
      batteries: {
        total: totalBatteries,
        collected: collectedBatteries,
        remaining: totalBatteries - collectedBatteries,
      },
      boxes: {
        total: totalBoxes,
        placed: placedBoxes,
        inWarehouse: Array.from(this.boxes.values()).filter((b) =>
          b.isAvailableInWarehouse()
        ).length,
        carried: Array.from(this.boxes.values()).filter((b) =>
          b.isBeingCarried()
        ).length,
      },
      playTime: this.getPlayTime(),
      gameState: this.gameState,
    };
  }

  /**
   * Tạo map model từ mapConfigs
   * @param {string} mapKey - Map key
   * @param {Object} config - Map config
   * @returns {MapModel} New map model
   */
  static fromConfig(mapKey, config) {
    return new MapModel({
      mapKey,
      ...config,
    });
  }
}
