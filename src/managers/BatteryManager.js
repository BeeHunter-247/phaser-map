import Phaser from "phaser";

/**
 * BatteryManager - Quản lý pin và thu thập pin
 *
 * Tách từ Scene.js để tách biệt trách nhiệm
 * Xử lý tất cả logic liên quan đến pin: tracking, collection, UI updates
 */
export class BatteryManager {
  constructor(scene) {
    this.scene = scene;

    // Battery models management
    this.batteryModels = new Map(); // Store battery models by tile key
    this.allBatteryModels = []; // All battery models for easy iteration

    // References to other managers
    this.robotManager = null;
    this.mapModel = null;
  }

  /**
   * Khởi tạo BatteryManager
   * @param {Object} robotManager - Reference đến RobotManager
   * @param {Object} objectConfig - Config từ mapConfigs
   * @param {Array} loadedBatteries - Batteries từ MapLoader
   */
  initialize(robotManager, objectConfig, loadedBatteries) {
    this.robotManager = robotManager;
    this.objectConfig = objectConfig;

    // Setup battery tracking
    this.setupBatteryTracking(loadedBatteries);
  }

  /**
   * Khởi tạo BatteryManager với Models
   * @param {Object} robotManager - Reference đến RobotManager
   * @param {MapModel} mapModel - Map model
   * @param {Array} loadedBatteries - Battery sprites từ Scene
   */
  initializeWithModels(robotManager, mapModel, loadedBatteries) {
    this.robotManager = robotManager;
    this.mapModel = mapModel;
    this.batteryModels.clear();
    this.allBatteryModels = [];

    // Get battery models from MapModel
    if (mapModel && mapModel.batteries) {
      for (const batteryModel of mapModel.batteries.values()) {
        const tileKey = `${batteryModel.position.x},${batteryModel.position.y}`;

        if (!this.batteryModels.has(tileKey)) {
          this.batteryModels.set(tileKey, []);
        }

        this.batteryModels.get(tileKey).push(batteryModel);
        this.allBatteryModels.push(batteryModel);
      }
    }

    // Link sprites với models
    this.linkSpritesToModels(loadedBatteries);
  }

  /**
   * Link sprites to battery models
   * @param {Array} batterySprites - Array of battery sprites from MapLoader
   */
  linkSpritesToModels(batterySprites) {
    batterySprites.forEach((sprite) => {
      if (sprite.model) {
        // Link sprite to model
        sprite.model.setSprite(sprite);
      }
    });
  }

  /**
   * Setup battery tracking system (legacy method for old config)
   * @param {Array} batterySprites - Array of battery sprites from MapLoader
   */
  setupBatteryTracking(batterySprites) {
    // Vì chỉ sử dụng custom config (không có object layer),
    // ta chỉ cần tạo tracking system từ config và map sprites với config
    if (this.objectConfig && this.objectConfig.batteries) {
      this.objectConfig.batteries.forEach((batteryConfig) => {
        if (batteryConfig.tiles) {
          batteryConfig.tiles.forEach((tilePos) => {
            const tileKey = `${tilePos.x},${tilePos.y}`;
            const count = tilePos.count || 1;
            const batteryType = tilePos.type || batteryConfig.type || "green";

            // Tạo tracking data từ config
            this.batteries.set(tileKey, count);
            this.batteryTypes.set(tileKey, Array(count).fill(batteryType));

            // Tìm sprites tương ứng với vị trí này từ MapLoader
            const matchingSprites = batterySprites.filter((sprite) => {
              const spriteTile = this.findTileForSprite(sprite);
              return (
                spriteTile &&
                spriteTile.x === tilePos.x &&
                spriteTile.y === tilePos.y
              );
            });

            // Lưu sprite references
            this.batterySprites.set(tileKey, [...matchingSprites]);
          });
        }
      });
    } else {
      // Fallback: Nếu không có config, tạo tracking từ sprites
      batterySprites.forEach((batterySprite, index) => {
        const batteryTile = this.findTileForSprite(batterySprite);
        if (batteryTile) {
          const tileKey = `${batteryTile.x},${batteryTile.y}`;

          // Thêm vào battery count
          const currentCount = this.batteries.get(tileKey) || 0;
          this.batteries.set(tileKey, currentCount + 1);

          // Thêm sprite reference
          const currentSprites = this.batterySprites.get(tileKey) || [];
          currentSprites.push(batterySprite);
          this.batterySprites.set(tileKey, currentSprites);

          // Xác định loại battery từ sprite texture
          let batteryType = "green"; // default
          if (batterySprite.texture && batterySprite.texture.key) {
            if (batterySprite.texture.key.includes("red")) batteryType = "red";
            else if (batterySprite.texture.key.includes("yellow"))
              batteryType = "yellow";
            else if (batterySprite.texture.key.includes("green"))
              batteryType = "green";
          }

          // Lưu loại battery
          const currentTypes = this.batteryTypes.get(tileKey) || [];
          currentTypes.push(batteryType);
          this.batteryTypes.set(tileKey, currentTypes);
        }
      });
    }
  }

  /**
   * Tìm tile cho một sprite
   * @param {Phaser.GameObjects.Sprite} sprite - Battery sprite
   * @returns {Object|null} {x, y} tile coordinates or null
   */
  findTileForSprite(sprite) {
    // Sprites được đặt với y + 10, trừ đi 10 để quy đổi đúng về tile
    const adjustY = (sprite?.y ?? 0) - 10;
    const worldX = sprite?.x ?? 0;
    const tilePoint = this.scene.layer.worldToTileXY(worldX, adjustY);

    if (!tilePoint) return null;

    const tileX = Math.max(0, Math.min(this.scene.map.width - 1, tilePoint.x));
    const tileY = Math.max(0, Math.min(this.scene.map.height - 1, tilePoint.y));

    return { x: tileX, y: tileY };
  }

  /**
   * Lấy thông tin pin tại ô hiện tại của robot
   * @returns {Object} {key, sprites, types, count}
   */
  getBatteriesAtCurrentTile() {
    const key = this.robotManager.getCurrentTileKey();
    const batteryModels = this.batteryModels.get(key) || [];

    // Filter available batteries
    const availableBatteries = batteryModels.filter((battery) =>
      battery.isAvailable()
    );

    const sprites = availableBatteries
      .map((battery) => battery.getSprite())
      .filter((sprite) => sprite);
    const types = availableBatteries.map((battery) => battery.color);
    const count = availableBatteries.length;

    return { key, sprites, types, count };
  }

  /**
   * Thu thập 1 pin tại vị trí hiện tại của robot (ưu tiên theo màu nếu truyền vào)
   * @param {string} [preferredColor] - "red" | "yellow" | "green"
   * @returns {number} 1 nếu thu thập thành công, 0 nếu không có pin phù hợp
   */
  collectBattery(preferredColor) {
    const robotPos = this.robotManager.getCurrentTilePosition();
    const tileKey = `${robotPos.x},${robotPos.y}`;
    const batteryModels = this.batteryModels.get(tileKey) || [];

    // Filter available batteries
    const availableBatteries = batteryModels.filter((battery) =>
      battery.isAvailable()
    );

    if (availableBatteries.length === 0) {
      this.scene.lose(
        `No available batteries found at (${robotPos.x}, ${robotPos.y})`
      );
      return 0;
    }

    // Find battery to collect
    let targetBattery = null;
    if (preferredColor) {
      targetBattery = availableBatteries.find(
        (battery) => battery.color === preferredColor
      );
      if (!targetBattery) {
        this.scene.lose(
          `Wrong pin color. Please pick up the ${preferredColor} color at cell (${robotPos.x}, ${robotPos.y}).`
        );
        return 0;
      }
    } else {
      targetBattery = availableBatteries[0];
    }

    // Collect the battery
    const robotModel = this.mapModel.getFirstRobot();
    const result = targetBattery.collect(robotModel.id);

    if (result.success) {
      return 1;
    } else if (result.gameOver) {
      // Nếu thu thập battery không được phép, game over
      this.scene.lose(result.message);
      return 0;
    } else {
      return 0;
    }
  }

  /**
   * Lấy thông tin pin đã thu thập
   * @returns {Object} Collected battery information
   */
  getCollectedBatteries() {
    const collectedBatteries = this.allBatteryModels.filter(
      (battery) => battery.isCollected
    );
    const collectedBatteryTypes = { red: 0, yellow: 0, green: 0 };

    collectedBatteries.forEach((battery) => {
      collectedBatteryTypes[battery.color] =
        (collectedBatteryTypes[battery.color] || 0) + 1;
    });

    return {
      total: collectedBatteries.length,
      byType: collectedBatteryTypes,
    };
  }

  /**
   * Reset thống kê pin đã thu thập
   */
  resetCollectedBatteries() {
    this.allBatteryModels.forEach((battery) => battery.reset());
  }

  /**
   * Lấy tổng số pin còn lại trên map
   * @returns {number} Total remaining batteries
   */
  getRemainingBatteriesCount() {
    return this.allBatteryModels.filter((battery) => battery.isAvailable())
      .length;
  }

  /**
   * Kiểm tra có pin tại tile cụ thể không
   * @param {string} tileKey - Tile key format: "x,y"
   * @returns {boolean} True nếu có pin
   */
  hasBatteriesAtTile(tileKey) {
    const batteryModels = this.batteryModels.get(tileKey) || [];
    return batteryModels.some((battery) => battery.isAvailable());
  }

  /**
   * Lấy số lượng pin tại tile cụ thể
   * @param {string} tileKey - Tile key format: "x,y"
   * @returns {number} Number of batteries at tile
   */
  getBatteryCountAtTile(tileKey) {
    const batteryModels = this.batteryModels.get(tileKey) || [];
    return batteryModels.filter((battery) => battery.isAvailable()).length;
  }

  /**
   * Lấy loại pin tại tile cụ thể
   * @param {string} tileKey - Tile key format: "x,y"
   * @returns {Array} Array of battery types at tile
   */
  getBatteryTypesAtTile(tileKey) {
    const batteryModels = this.batteryModels.get(tileKey) || [];
    return batteryModels
      .filter((battery) => battery.isAvailable())
      .map((battery) => battery.color);
  }

  /**
   * Ẩn battery sprite khi được thu thập (dành cho model-based approach)
   * @param {BatteryModel} batteryModel - Battery model đã được collect
   */
  hideBatterySprite(batteryModel) {
    batteryModel.hideSprite();
  }

  /**
   * Debug: In ra thông tin tất cả pin
   */
  debugBatteryInfo() {
    const collectedBatteries = this.allBatteryModels.filter(
      (battery) => battery.isCollected
    );
    const collectedBatteryTypes = { red: 0, yellow: 0, green: 0 };

    collectedBatteries.forEach((battery) => {
      collectedBatteryTypes[battery.color] =
        (collectedBatteryTypes[battery.color] || 0) + 1;
    });
  }
}
