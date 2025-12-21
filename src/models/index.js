export { BaseModel } from "./BaseModel.js";
export { RobotModel } from "./RobotModel.js";
export { BatteryModel } from "./BatteryModel.js";
export { BoxModel } from "./BoxModel.js";
export { MapModel } from "./MapModel.js";

/**
 * Model Factory - Tạo models từ config
 */
export class ModelFactory {
  /**
   * Tạo MapModel từ mapKey và config
   * @param {string} mapKey - Map key
   * @param {Object} config - Map config
   * @returns {Promise<MapModel>} Map model instance
   */
  static async createMap(mapKey, config) {
    const { MapModel } = await import("./MapModel.js");
    return MapModel.fromConfig(mapKey, config);
  }

  /**
   * Tạo RobotModel từ config
   * @param {Object} config - Robot config
   * @returns {Promise<RobotModel>} Robot model instance
   */
  static async createRobot(config) {
    const { RobotModel } = await import("./RobotModel.js");
    return new RobotModel(config);
  }

  /**
   * Tạo BatteryModel từ config
   * @param {Object} config - Battery config
   * @returns {Promise<BatteryModel>} Battery model instance
   */
  static async createBattery(config) {
    const { BatteryModel } = await import("./BatteryModel.js");
    return new BatteryModel(config);
  }

  /**
   * Tạo BoxModel từ config
   * @param {Object} config - Box config
   * @returns {Promise<BoxModel>} Box model instance
   */
  static async createBox(config) {
    const { BoxModel } = await import("./BoxModel.js");
    return new BoxModel(config);
  }

  /**
   * Tạo model từ type và config
   * @param {string} type - Model type
   * @param {Object} config - Model config
   * @returns {Promise<BaseModel>} Model instance
   */
  static async createFromType(type, config) {
    switch (type.toLowerCase()) {
      case "robot":
        return this.createRobot(config);
      case "battery":
        return this.createBattery(config);
      case "box":
        return this.createBox(config);
      case "map":
        return this.createMap(config.mapKey, config);
      default:
        throw new Error(`Unknown model type: ${type}`);
    }
  }
}

// ConfigLoader đã được chuyển sang src/utils/ConfigLoader.js
// Export để tương thích với code cũ
export { ConfigLoader } from "../utils/ConfigLoader.js";
