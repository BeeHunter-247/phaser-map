import Phaser from "phaser";
import { EntityManager } from "../models/EntityManager.js";

/**
 * BatteryManager - Quản lý pin và thu thập pin
 *
 * Tách từ Scene.js để tách biệt trách nhiệm
 * Xử lý tất cả logic liên quan đến pin: tracking, collection, UI updates
 * Sử dụng EntityManager thay vì hardcode
 */
export class BatteryManager {
  constructor(scene) {
    this.scene = scene;
    this.entityManager = null; // Sẽ được khởi tạo từ EntityManager
  }

  /**
   * Khởi tạo BatteryManager
   * @param {Array} batterySprites - Array of battery sprites from MapLoader
   * @param {GameState} gameState - Game state instance
   */
  initialize(batterySprites, gameState) {
    this.batterySprites = batterySprites || [];
    this.gameState = gameState;
    this.setupBatteryTracking();
    console.log(
      `🔋 BatteryManager initialized with ${this.batterySprites.length} batteries`
    );
  }

  /**
   * Setup battery tracking system
   */
  setupBatteryTracking() {
    console.log(
      `🔋 BatteryManager: Tracking ${this.batterySprites.length} batteries`
    );
  }

  /**
   * Tìm tile cho một sprite - Deprecated, sử dụng EntityManager
   * @param {Phaser.GameObjects.Sprite} sprite - Battery sprite
   * @returns {Object|null} {x, y} tile coordinates or null
   */
  findTileForSprite(sprite) {
    console.log(
      "🔋 DEBUG: findTileForSprite is deprecated, use EntityManager instead"
    );
    return null;
  }

  /**
   * Lấy thông tin pin tại ô hiện tại của robot
   * @returns {Object} {key, sprites, types, count}
   */
  getBatteriesAtCurrentTile() {
    if (!this.entityManager)
      return { key: "0,0", sprites: [], types: [], count: 0 };

    const batteries = this.entityManager.getBatteriesAtCurrentTile();
    const key = this.entityManager.getRobot()?.getCurrentTileKey() || "0,0";
    const sprites = batteries
      .map((battery) => battery.sprite)
      .filter((sprite) => sprite);
    const types = batteries.map((battery) => battery.type);
    const count = batteries.length;

    console.log(`🔍 getBatteriesAtCurrentTile() at ${key}:`);
    console.log(`   sprites.length: ${sprites.length}`);
    console.log(`   tracked count: ${count}`);
    console.log(`   types:`, types);

    return { key, sprites, types, count };
  }

  /**
   * Thu thập 1 pin tại vị trí hiện tại của robot (ưu tiên theo màu nếu truyền vào)
   * @param {string} [preferredColor] - "red" | "yellow" | "green"
   * @returns {number} 1 nếu thu thập thành công, 0 nếu không có pin phù hợp
   */
  collectBattery(preferredColor) {
    if (!this.entityManager) return 0;

    const result = this.entityManager.collectBattery(preferredColor);

    if (result === 0) {
      const robotPos = this.entityManager
        .getRobot()
        ?.getCurrentTilePosition() || { x: 0, y: 0 };
      this.scene.lose(`Không có pin tại ô (${robotPos.x}, ${robotPos.y})`);
    }

    return result;
  }

  /**
   * Lấy thông tin pin đã thu thập
   * @returns {Object} Collected battery information
   */
  getCollectedBatteries() {
    if (!this.entityManager)
      return { total: 0, byType: { red: 0, yellow: 0, green: 0 } };
    return this.entityManager.getCollectedBatteries();
  }

  /**
   * Reset thống kê pin đã thu thập
   */
  resetCollectedBatteries() {
    if (!this.entityManager) return;
    this.entityManager.resetCollectedBatteries();
  }

  /**
   * Lấy tổng số pin còn lại trên map
   * @returns {number} Total remaining batteries
   */
  getRemainingBatteriesCount() {
    if (!this.entityManager) return 0;
    return this.entityManager.getRemainingBatteriesCount();
  }

  /**
   * Kiểm tra có pin tại tile cụ thể không
   * @param {string} tileKey - Tile key format: "x,y"
   * @returns {boolean} True nếu có pin
   */
  hasBatteriesAtTile(tileKey) {
    if (!this.entityManager) return false;
    // EntityManager không có method này, cần implement
    return false;
  }

  /**
   * Lấy số lượng pin tại tile cụ thể
   * @param {string} tileKey - Tile key format: "x,y"
   * @returns {number} Number of batteries at tile
   */
  getBatteryCountAtTile(tileKey) {
    if (!this.entityManager) return 0;
    // EntityManager không có method này, cần implement
    return 0;
  }

  /**
   * Lấy loại pin tại tile cụ thể
   * @param {string} tileKey - Tile key format: "x,y"
   * @returns {Array} Array of battery types at tile
   */
  getBatteryTypesAtTile(tileKey) {
    if (!this.entityManager) return [];
    // EntityManager không có method này, cần implement
    return [];
  }

  /**
   * Debug: In ra thông tin tất cả pin
   */
  debugBatteryInfo() {
    if (!this.entityManager) {
      console.log(
        "🔍 Battery Manager Debug Info: EntityManager not initialized"
      );
      return;
    }
    this.entityManager.debugEntityInfo();
  }
}
