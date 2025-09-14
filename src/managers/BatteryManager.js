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

    console.log("🔋 BatteryManager initialized");
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

    console.log("🔋 BatteryManager initialized with models");
    console.log(`   Linked ${loadedBatteries.length} sprites to models`);
    console.log(
      `   Setup tracking for ${this.batteryModels.size} tile positions`
    );
    console.log(`   Total battery models: ${this.allBatteryModels.length}`);
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
    console.log("🔋 DEBUG: Setting up battery tracking...");
    console.log(`   Loaded sprites: ${batterySprites.length}`);
    console.log(`   Object config:`, this.objectConfig);

    // Vì chỉ sử dụng custom config (không có object layer),
    // ta chỉ cần tạo tracking system từ config và map sprites với config
    if (this.objectConfig && this.objectConfig.batteries) {
      this.objectConfig.batteries.forEach((batteryConfig) => {
        if (batteryConfig.tiles) {
          batteryConfig.tiles.forEach((tilePos) => {
            const tileKey = `${tilePos.x},${tilePos.y}`;
            const count = tilePos.count || 1;
            const batteryType = tilePos.type || batteryConfig.type || "green";

            console.log(
              `🔋 DEBUG: Registering ${count} ${batteryType} batteries at tile ${tileKey}`
            );

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

            console.log(
              `   Mapped ${matchingSprites.length} sprites to ${count} config batteries`
            );
          });
        }
      });
    } else {
      // Fallback: Nếu không có config, tạo tracking từ sprites
      console.log(
        "🔋 DEBUG: No config found, creating tracking from sprites only"
      );
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

    console.log(
      `🔍 findTileForSprite: sprite(${sprite?.x}, ${sprite?.y}) -> adjusted(${worldX}, ${adjustY}) -> tile(${tilePoint?.x}, ${tilePoint?.y})`
    );

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

    console.log(`🔍 getBatteriesAtCurrentTile() at ${key}:`);
    console.log(`   sprites.length: ${sprites.length}`);
    console.log(`   available count: ${count}`);
    console.log(`   types:`, types);

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

    console.log(`🔋 DEBUG: Collecting at tile (${robotPos.x},${robotPos.y})`);
    console.log(`   Available battery models: ${batteryModels.length}`);

    // Filter available batteries
    const availableBatteries = batteryModels.filter((battery) =>
      battery.isAvailable()
    );

    if (availableBatteries.length === 0) {
      console.log(`   ❌ No available batteries found at ${tileKey}`);
      this.scene.lose(`Không có pin tại ô (${robotPos.x}, ${robotPos.y})`);
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
          `Sai màu pin. Cần nhặt màu ${preferredColor} tại ô (${robotPos.x}, ${robotPos.y})`
        );
        return 0;
      }
    } else {
      targetBattery = availableBatteries[0];
    }

    // Collect the battery
    const robotModel = this.mapModel.getFirstRobot();
    const success = targetBattery.collect(robotModel.id);

    if (success) {
      console.log(
        `🔋 Collected ${targetBattery.color} battery at (${robotPos.x}, ${robotPos.y})`
      );
      return 1;
    }

    return 0;
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

    console.log("🔋 getCollectedBatteries() called:");
    console.log(`   collectedBatteries: ${collectedBatteries.length}`);
    console.log(`   collectedBatteryTypes:`, collectedBatteryTypes);

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
    console.log(`🔋 Hidden battery sprite for model ${batteryModel.id}`);
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

    console.log("🔍 Battery Manager Debug Info:");
    console.log(`   Total collected: ${collectedBatteries.length}`);
    console.log(`   Collected by type:`, collectedBatteryTypes);
    console.log(`   Total models: ${this.allBatteryModels.length}`);
    console.log(
      `   Available models: ${
        this.allBatteryModels.filter((battery) => battery.isAvailable()).length
      }`
    );
  }
}
