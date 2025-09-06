import Phaser from "phaser";

/**
 * MapLoader - Utility class để load map và objects tái sử dụng
 */
export class MapLoader {
  /**
   * Load tilemap với cấu hình chuẩn
   * @param {Phaser.Scene} scene - Scene hiện tại
   * @param {string} mapKey - Key của tilemap
   * @param {Object} config - Cấu hình load map
   * @returns {Object} Map data với map, layer, scale
   */
  static loadMap(scene, mapKey, config = {}) {
    const {
      offsetX = 300,
      offsetY = 0,
      scale = 1,
      backgroundColor = 0xf3f5f2,
    } = config;

    // Set background
    scene.cameras.main.setBackgroundColor(backgroundColor);
    scene.cameras.main.roundPixels = true;

    // Create tilemap
    const map = scene.make.tilemap({ key: mapKey });

    // Add tilesets (phù hợp với demo1.json từ Tiled)
    const tilesets = [
      map.addTilesetImage("wood", "wood"),
      map.addTilesetImage("road_h", "road_h"),
      map.addTilesetImage("road_v", "road_v"),
      map.addTilesetImage("water", "water"),
      map.addTilesetImage("grass", "grass"),
      map.addTilesetImage("crossroad", "crossroad"),
    ];

    // Create layer với offset (sử dụng tên layer từ Tiled)
    const layer = map.createLayer("Tile Layer 1", tilesets, offsetX, offsetY);
    layer.setScale(scale);

    return {
      map,
      layer,
      scale,
      offsetX,
      offsetY,
    };
  }

  /**
   * Load objects từ object layer hoặc custom data
   * @param {Phaser.Scene} scene - Scene hiện tại
   * @param {Object} mapData - Data từ loadMap()
   * @param {Object} objectConfig - Cấu hình objects
   * @returns {Object} Loaded objects
   */
  static loadObjects(scene, mapData, objectConfig) {
    const { map, layer, scale } = mapData;
    const loadedObjects = {
      robot: null,
      batteries: [],
      boxes: [],
      others: [],
    };

    // Load từ object layer nếu có
    const objectLayer = map.getObjectLayer("objects");
    if (objectLayer) {
      objectLayer.objects.forEach((obj) => {
        const worldPos = this.convertObjectToWorld(obj, mapData);
        const loadedObj = this.createObjectFromTiled(
          scene,
          obj,
          worldPos,
          scale
        );

        if (loadedObj) {
          this.categorizeObject(loadedObj, obj, loadedObjects);
        }
      });
    }

    // Load từ custom config
    if (objectConfig) {
      this.loadCustomObjects(scene, mapData, objectConfig, loadedObjects);
    }

    return loadedObjects;
  }

  /**
   * Chuyển đổi tọa độ object từ Tiled sang world position
   */
  static convertObjectToWorld(obj, mapData) {
    const { map, layer, offsetX, offsetY } = mapData;

    // Convert từ pixel projected sang tile coords
    const tileX = obj.x / map.tileWidth;
    const tileY = obj.y / map.tileHeight;

    // Sử dụng map.tileToWorldXY để tránh double offset
    const worldPoint = map.tileToWorldXY(tileX, tileY);

    // Áp dụng offset của layer
    const finalX = worldPoint.x + offsetX;
    const finalY = worldPoint.y + offsetY;

    return { x: finalX, y: finalY };
  }

  /**
   * Tạo object từ Tiled object
   */
  static createObjectFromTiled(scene, tiledObj, worldPos, scale) {
    let spriteKey = null;
    let origin = { x: 0.5, y: 1 }; // Default isometric origin

    // Xác định sprite key dựa trên tên object
    switch (tiledObj.name) {
      case "RobotPoint":
        spriteKey = "robot_east";
        break;
      case "PinPoint":
      case "BatteryPoint":
        spriteKey = "pin_green"; // Default to green pin
        break;
      case "BoxPoint":
        spriteKey = "box";
        break;
      default:
        return null; // Unknown object type
    }

    // Tạo sprite
    const sprite = scene.add.image(worldPos.x, worldPos.y, spriteKey);
    sprite.setOrigin(origin.x, origin.y);
    sprite.setScale(scale);

    return {
      sprite,
      type: tiledObj.name,
      originalData: tiledObj,
    };
  }

  /**
   * Phân loại object vào categories
   */
  static categorizeObject(loadedObj, tiledObj, loadedObjects) {
    switch (tiledObj.name) {
      case "RobotPoint":
        loadedObjects.robot = loadedObj.sprite;
        break;
      case "PinPoint":
      case "BatteryPoint":
        loadedObjects.batteries.push(loadedObj.sprite);
        break;
      case "BoxPoint":
        if (!loadedObjects.boxes) loadedObjects.boxes = [];
        loadedObjects.boxes.push(loadedObj.sprite);
        break;
      default:
        loadedObjects.others.push(loadedObj);
        break;
    }
  }

  /**
   * Load objects từ custom configuration
   */
  static loadCustomObjects(scene, mapData, objectConfig, loadedObjects) {
    const { map, layer, scale } = mapData;

    // Load robot từ config
    if (objectConfig.robot) {
      const robotConfig = objectConfig.robot;
      let robotPos;

      if (robotConfig.tile) {
        // Đặt robot trên tile cụ thể
        robotPos = this.getTileWorldCenter(
          robotConfig.tile.x,
          robotConfig.tile.y,
          mapData
        );
      } else if (robotConfig.tileType) {
        // Tìm tile đầu tiên của loại này
        robotPos = this.findTileByType(robotConfig.tileType, mapData);
      }

      if (robotPos) {
        // Sử dụng robot sprite phù hợp với hướng từ config
        const direction = robotConfig.direction || "east";
        const robotSpriteKey = `robot_${direction}`;

        const robot = scene.add.image(
          robotPos.x,
          robotPos.y + 20,
          robotSpriteKey
        );
        robot.setOrigin(0.5, 1);
        robot.setScale(scale);
        loadedObjects.robot = robot;
      }
    }

    // Load batteries từ config
    if (objectConfig.batteries) {
      objectConfig.batteries.forEach((batteryConfig) => {
        if (batteryConfig.tileType) {
          // Đặt batteries trên tất cả tile của loại này
          this.placeBatteriesOnTileType(
            scene,
            mapData,
            batteryConfig,
            loadedObjects
          );
        } else if (batteryConfig.tiles) {
          // Đặt batteries trên tiles cụ thể, hỗ trợ count và màu theo từng tile
          batteryConfig.tiles.forEach((tilePos) => {
            const pos = this.getTileWorldCenter(tilePos.x, tilePos.y, mapData);

            const perTileCount =
              (typeof tilePos.count === "number" ? tilePos.count : undefined) ??
              (typeof batteryConfig.count === "number"
                ? batteryConfig.count
                : 1);
            const perTileSpread =
              (typeof tilePos.spread === "number"
                ? tilePos.spread
                : undefined) ??
              (typeof batteryConfig.spread === "number"
                ? batteryConfig.spread
                : 1);

            // Helper lấy type theo index nếu có mảng types
            const resolveType = (i) => {
              if (Array.isArray(tilePos.types) && tilePos.types.length > 0) {
                return (
                  tilePos.types[i] || tilePos.types[tilePos.types.length - 1]
                );
              }
              return tilePos.type || batteryConfig.type || "green";
            };

            if (perTileCount <= 1) {
              const batteryType = resolveType(0);
              const batteryKey = `pin_${batteryType}`;
              const battery = scene.add.image(pos.x, pos.y + 10, batteryKey);
              battery.setOrigin(0.5, 1);
              battery.setScale(scale);
              loadedObjects.batteries.push(battery);
            } else {
              // Đặt nhiều batteries theo hình tròn quanh tâm tile
              const base = Math.min(
                map.tileWidth * layer.scaleX,
                map.tileHeight * layer.scaleY
              );
              const radius = base * 0.2 * perTileSpread;

              for (let i = 0; i < perTileCount; i++) {
                const angle = -Math.PI / 2 + (i * (Math.PI * 2)) / perTileCount;
                const bx = pos.x + radius * Math.cos(angle);
                const by = pos.y + radius * Math.sin(angle);

                const batteryType = resolveType(i);
                const batteryKey = `pin_${batteryType}`;

                const battery = scene.add.image(bx, by + 10, batteryKey);
                battery.setOrigin(0.5, 1);
                battery.setScale(scale);
                loadedObjects.batteries.push(battery);
              }
            }
          });
        }
      });
    }
  }

  /**
   * Lấy world center của một tile
   */
  static getTileWorldCenter(tileX, tileY, mapData) {
    const { map, layer } = mapData;
    const worldPoint = layer.tileToWorldXY(tileX, tileY);
    const centerX = worldPoint.x + (map.tileWidth * layer.scaleX) / 2;
    const centerY = worldPoint.y + (map.tileHeight * layer.scaleY) / 2;
    return { x: centerX, y: centerY };
  }

  /**
   * Tìm tile đầu tiên của một loại
   */
  static findTileByType(tileType, mapData) {
    const { map, layer } = mapData;

    // Tìm tileset theo tên
    const tileset = map.tilesets.find((ts) => ts.name === tileType);
    if (!tileset) return null;

    const tileIndex = tileset.firstgid;
    const targetTile = layer.findTile((tile) => tile.index === tileIndex);

    if (targetTile) {
      return this.getTileWorldCenter(targetTile.x, targetTile.y, mapData);
    }

    return null;
  }

  /**
   * Đặt batteries trên tất cả tile của một loại
   */
  static placeBatteriesOnTileType(
    scene,
    mapData,
    batteryConfig,
    loadedObjects
  ) {
    const { map, layer, scale } = mapData;
    const { tileType, count = 1, spread = 1 } = batteryConfig;

    // Tìm tileset
    const tileset = map.tilesets.find((ts) => ts.name === tileType);
    if (!tileset) return;

    const tileIndex = tileset.firstgid;

    // Đặt batteries trên tất cả tile của loại này
    layer.forEachTile((tile) => {
      if (tile.index === tileIndex) {
        const centerPos = this.getTileWorldCenter(tile.x, tile.y, mapData);

        if (count <= 1) {
          // Xác định loại battery (từ config hoặc mặc định)
          const batteryType = batteryConfig.type || "green";
          const batteryKey = `pin_${batteryType}`;

          const battery = scene.add.image(
            centerPos.x,
            centerPos.y + 10,
            batteryKey
          );
          battery.setOrigin(0.5, 1);
          battery.setScale(scale);
          loadedObjects.batteries.push(battery);
        } else {
          // Đặt nhiều batteries theo hình tròn
          const base = Math.min(
            map.tileWidth * layer.scaleX,
            map.tileHeight * layer.scaleY
          );
          const radius = base * 0.2 * spread;

          for (let i = 0; i < count; i++) {
            const angle = -Math.PI / 2 + (i * (Math.PI * 2)) / count;
            const bx = centerPos.x + radius * Math.cos(angle);
            const by = centerPos.y + radius * Math.sin(angle);

            // Xác định loại battery cho multiple batteries
            const batteryType = batteryConfig.type || "green";
            const batteryKey = `pin_${batteryType}`;

            const battery = scene.add.image(bx, by + 10, batteryKey);
            battery.setOrigin(0.5, 1);
            battery.setScale(scale);
            loadedObjects.batteries.push(battery);
          }
        }
      }
    });
  }
}
