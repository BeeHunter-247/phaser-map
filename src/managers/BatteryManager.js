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

    // Battery tracking state
    this.batteries = new Map(); // Store batteries at each tile position
    this.collectedBatteries = 0;
    this.batterySprites = new Map();
    this.batteryTypes = new Map(); // Store battery types at each position
    this.collectedBatteryTypes = { red: 0, yellow: 0, green: 0 };

    // References to other managers
    this.robotController = null;
    this.objectConfig = null;
  }

  /**
   * Khởi tạo BatteryManager
   * @param {Object} robotController - Reference đến RobotController
   * @param {Object} objectConfig - Config từ mapConfigs
   * @param {Array} loadedBatteries - Batteries từ MapLoader
   */
  initialize(robotController, objectConfig, loadedBatteries) {
    this.robotController = robotController;
    this.objectConfig = objectConfig;

    // Setup battery tracking
    this.setupBatteryTracking(loadedBatteries);

    console.log("🔋 BatteryManager initialized");
  }

  /**
   * Setup battery tracking system
   * @param {Array} batterySprites - Array of battery sprites from MapLoader
   */
  setupBatteryTracking(batterySprites) {
    console.log("🔋 DEBUG: Setting up battery tracking...");
    console.log(`   Loaded sprites: ${batterySprites.length}`);
    console.log(`   Object config:`, this.objectConfig);

    // Đảm bảo mảng pin từ mapConfig đã được đặt đúng vị trí
    if (this.objectConfig && this.objectConfig.batteries) {
      this.objectConfig.batteries.forEach((batteryConfig) => {
        if (batteryConfig.tiles) {
          batteryConfig.tiles.forEach((tilePos) => {
            // Đặt pin theo vị trí cụ thể từ config
            const tileKey = `${tilePos.x},${tilePos.y}`;
            console.log(
              `🔋 DEBUG: Registering battery from config at tile ${tileKey}`
            );

            // Tìm sprite tương ứng với vị trí này
            const matchingSprites = batterySprites.filter((sprite) => {
              const spriteTile = this.findTileForSprite(sprite);
              console.log(
                `   Checking sprite at world(${sprite.x}, ${sprite.y}) -> tile(${spriteTile?.x}, ${spriteTile?.y})`
              );
              return (
                spriteTile &&
                spriteTile.x === tilePos.x &&
                spriteTile.y === tilePos.y
              );
            });

            console.log(
              `   Found ${matchingSprites.length} matching sprites for tile ${tileKey}`
            );

            if (matchingSprites.length > 0) {
              // Thêm vào battery count
              this.batteries.set(tileKey, matchingSprites.length);

              // Thêm sprite reference
              this.batterySprites.set(tileKey, [...matchingSprites]);

              // Xác định loại battery từ config
              const batteryType = tilePos.type || batteryConfig.type || "green";
              const types = Array(matchingSprites.length).fill(batteryType);
              this.batteryTypes.set(tileKey, types);

              console.log(
                `   Found ${matchingSprites.length} sprites for tile ${tileKey}, type: ${batteryType}`
              );
            } else {
              // Nếu không tìm thấy sprite phù hợp, tạo pin theo config
              console.log(
                `   No matching sprites found, creating batteries from config for tile ${tileKey}`
              );
              const count = tilePos.count || 1;
              const batteryType = tilePos.type || batteryConfig.type || "green";

              this.batteries.set(tileKey, count);
              this.batteryTypes.set(tileKey, Array(count).fill(batteryType));
              this.batterySprites.set(tileKey, []); // Empty array, sẽ tạo sprites khi cần

              console.log(
                `   Created ${count} ${batteryType} batteries from config`
              );
            }
          });
        }
      });
    } else {
      // Fallback: Xử lý theo cách cũ nếu không có config
      batterySprites.forEach((batterySprite, index) => {
        // Tìm tile của battery này
        const batteryTile = this.findTileForSprite(batterySprite);
        console.log(`🔋 DEBUG: Battery ${index} at tile:`, batteryTile);
        if (batteryTile) {
          const tileKey = `${batteryTile.x},${batteryTile.y}`;

          // Thêm vào battery count
          const currentCount = this.batteries.get(tileKey) || 0;
          this.batteries.set(tileKey, currentCount + 1);

          // Thêm sprite reference
          const currentSprites = this.batterySprites.get(tileKey) || [];
          currentSprites.push(batterySprite);
          this.batterySprites.set(tileKey, currentSprites);

          // Xác định loại battery (mặc định hoặc từ sprite texture)
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
    const key = this.robotController.getCurrentTileKey();
    const sprites = this.batterySprites.get(key) || [];
    const types = this.batteryTypes.get(key) || [];

    // Lấy count từ battery tracking system (đã được setup)
    let count = this.batteries.get(key) || 0;

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
    const robotPos = this.robotController.getCurrentTilePosition();
    const tileKey = `${robotPos.x},${robotPos.y}`;
    console.log(`🔋 DEBUG: Collecting at tile (${robotPos.x},${robotPos.y})`);
    console.log(`   Robot position: x=${robotPos.x}, y=${robotPos.y}`);
    console.log(`   Tile key: "${tileKey}"`);
    console.log(`   Battery map:`, Array.from(this.batteries.entries()));
    console.log(
      `   Battery sprites:`,
      Array.from(this.batterySprites.entries())
    );

    // Kiểm tra có pin tại tile này không
    const currentCount = this.batteries.get(tileKey) || 0;
    console.log(`   Current count for ${tileKey}: ${currentCount}`);

    // Debug: Kiểm tra tất cả keys có sẵn
    console.log(`   Available tile keys:`, Array.from(this.batteries.keys()));
    console.log(`   Looking for key: "${tileKey}"`);
    console.log(`   Key exists:`, this.batteries.has(tileKey));

    if (currentCount === 0) {
      console.log(`   ❌ No batteries found at ${tileKey}`);
      this.scene.lose(`Không có pin tại ô (${robotPos.x}, ${robotPos.y})`);
      return 0;
    }

    console.log(`   ✅ Found ${currentCount} batteries at ${tileKey}`);

    const sprites = this.batterySprites.get(tileKey) || [];
    const types = this.batteryTypes.get(tileKey) || [];

    // Xác định loại pin cần thu thập
    let collectedType = null;
    if (preferredColor) {
      // Kiểm tra có loại pin phù hợp không
      if (types.includes(preferredColor)) {
        collectedType = preferredColor;
      } else {
        this.scene.lose(
          `Sai màu pin. Cần nhặt màu ${preferredColor} tại ô (${robotPos.x}, ${robotPos.y})`
        );
        return 0;
      }
    } else {
      // Lấy loại pin đầu tiên có sẵn
      collectedType = types.length > 0 ? types[0] : "green";
    }

    // Xử lý sprite nếu có
    console.log(`🔋 DEBUG: Sprite removal for ${collectedType} at ${tileKey}`);
    console.log(`   sprites.length: ${sprites.length}`);
    if (sprites.length > 0) {
      console.log(
        `   Available sprite keys:`,
        sprites.map((s) => s?.texture?.key)
      );
      const indexToRemove = sprites.findIndex(
        (s) => s?.texture?.key === `pin_${collectedType}`
      );
      console.log(`   indexToRemove: ${indexToRemove}`);
      if (indexToRemove !== -1) {
        const [sprite] = sprites.splice(indexToRemove, 1);
        console.log(`   Destroying sprite: ${sprite?.texture?.key}`);
        if (sprite && sprite.active) sprite.destroy();
        this.batterySprites.set(tileKey, sprites);
        console.log(`   Remaining sprites: ${sprites.length}`);
      } else {
        console.log(
          `   ❌ No matching sprite found for type: ${collectedType}`
        );
      }
    } else {
      console.log(`   ❌ No sprites available to remove`);
      // Fallback: Tìm và destroy sprite gần nhất nếu không tìm thấy trong batterySprites
      console.log(`   🔍 Searching for nearby sprites to destroy...`);
      const allSprites = Array.from(this.batterySprites.values()).flat();
      const nearbySprite = allSprites.find((s) => {
        if (!s || !s.active) return false;
        const spriteTile = this.findTileForSprite(s);
        return (
          spriteTile &&
          spriteTile.x === robotPos.x &&
          spriteTile.y === robotPos.y
        );
      });

      if (nearbySprite) {
        console.log(
          `   🎯 Found nearby sprite to destroy: ${nearbySprite.texture.key}`
        );
        nearbySprite.destroy();
      } else {
        console.log(`   ❌ No nearby sprites found either`);
        // Ultimate fallback: Tìm sprite theo vị trí world coordinates
        console.log(
          `   🔍 Ultimate fallback: searching by world coordinates...`
        );
        const robotWorldPos = this.robotController.getTileWorldCenter(
          robotPos.x,
          robotPos.y
        );
        console.log(
          `   Robot world position: (${robotWorldPos.x}, ${robotWorldPos.y})`
        );

        // Tìm tất cả pin sprites trong scene
        const allBatterySprites = this.scene.children.list.filter(
          (child) =>
            child.texture &&
            child.texture.key &&
            child.texture.key.startsWith("pin_")
        );

        console.log(
          `   Found ${allBatterySprites.length} battery sprites in scene`
        );

        const closestSprite = allBatterySprites.find((sprite) => {
          const distance = Phaser.Math.Distance.Between(
            sprite.x,
            sprite.y,
            robotWorldPos.x,
            robotWorldPos.y
          );
          console.log(
            `   Sprite at (${sprite.x}, ${
              sprite.y
            }) distance: ${distance.toFixed(2)}`
          );
          return distance < 50; // Trong vòng 50 pixels
        });

        if (closestSprite) {
          console.log(
            `   🎯 Found closest sprite to destroy: ${closestSprite.texture.key}`
          );
          closestSprite.destroy();
        } else {
          console.log(`   ❌ No sprites found within 50 pixels`);
        }
      }
    }

    // Cập nhật maps đếm và loại
    this.batteries.set(tileKey, Math.max(0, currentCount - 1));

    const typesAtTile = this.batteryTypes.get(tileKey) || [];
    const typeIdx = typesAtTile.findIndex((t) => t === collectedType);
    if (typeIdx !== -1) typesAtTile.splice(typeIdx, 1);
    this.batteryTypes.set(tileKey, typesAtTile);

    // Tăng thống kê tổng theo loại
    if (collectedType) {
      this.collectedBatteryTypes[collectedType] =
        (this.collectedBatteryTypes[collectedType] || 0) + 1;
    }
    this.collectedBatteries += 1;

    console.log(
      `🔋 Collected 1 ${collectedType} battery at (${robotPos.x}, ${robotPos.y})`
    );
    console.log(`   Remaining at tile: ${this.batteries.get(tileKey)}`);
    console.log(`   Total inventory:`, this.collectedBatteryTypes);
    console.log(`   Total batteries: ${this.collectedBatteries}`);

    return 1;
  }

  /**
   * Lấy thông tin pin đã thu thập
   * @returns {Object} Collected battery information
   */
  getCollectedBatteries() {
    return {
      total: this.collectedBatteries,
      byType: this.collectedBatteryTypes,
    };
  }

  /**
   * Reset thống kê pin đã thu thập
   */
  resetCollectedBatteries() {
    this.collectedBatteries = 0;
    this.collectedBatteryTypes = { red: 0, yellow: 0, green: 0 };
  }

  /**
   * Lấy tổng số pin còn lại trên map
   * @returns {number} Total remaining batteries
   */
  getRemainingBatteriesCount() {
    let total = 0;
    for (const count of this.batteries.values()) {
      total += count;
    }
    return total;
  }

  /**
   * Kiểm tra có pin tại tile cụ thể không
   * @param {string} tileKey - Tile key format: "x,y"
   * @returns {boolean} True nếu có pin
   */
  hasBatteriesAtTile(tileKey) {
    const count = this.batteries.get(tileKey) || 0;
    return count > 0;
  }

  /**
   * Lấy số lượng pin tại tile cụ thể
   * @param {string} tileKey - Tile key format: "x,y"
   * @returns {number} Number of batteries at tile
   */
  getBatteryCountAtTile(tileKey) {
    return this.batteries.get(tileKey) || 0;
  }

  /**
   * Lấy loại pin tại tile cụ thể
   * @param {string} tileKey - Tile key format: "x,y"
   * @returns {Array} Array of battery types at tile
   */
  getBatteryTypesAtTile(tileKey) {
    return this.batteryTypes.get(tileKey) || [];
  }

  /**
   * Debug: In ra thông tin tất cả pin
   */
  debugBatteryInfo() {
    console.log("🔍 Battery Manager Debug Info:");
    console.log(`   Total collected: ${this.collectedBatteries}`);
    console.log(`   Collected by type:`, this.collectedBatteryTypes);
    console.log(`   Remaining per tile:`, Array.from(this.batteries.entries()));
    console.log(`   Types per tile:`, Array.from(this.batteryTypes.entries()));
  }
}
