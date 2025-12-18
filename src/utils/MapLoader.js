import Phaser from "phaser";

/**
 * MapLoader - Utility class để load map và objects tái sử dụng
 */
export class MapLoader {
  /**
   * Load tilemap với cấu hình chuẩn
   * @param {Phaser.Scene} scene - Scene hiện tại
   * @param {Object} config - Cấu hình load map
   * @param {Object} mapJsonData - Map JSON data từ webview
   * @returns {Object} Map data với map, layer, scale
   */
  static loadMap(scene, config = {}, mapJsonData = null) {
    const {
      offsetX = 300,
      offsetY = 0,
      scale = 1,
      backgroundColor = 0xf3f5f2,
    } = config;

    const cam = scene.cameras.main;
    cam.setBackgroundColor(backgroundColor);
    cam.roundPixels = true;

    // 1) Tạo map
    let map;

    if (mapJsonData) {
      // JSON từ WebView
      const tiledJson =
        typeof mapJsonData === "string" ? JSON.parse(mapJsonData) : mapJsonData;

      // Bảo vệ: phải có ít nhất 1 tilelayer
      const firstTL = tiledJson.layers?.find((l) => l.type === "tilelayer");
      if (!firstTL) throw new Error("Tiled JSON không có tilelayer.");

      // *** QUAN TRỌNG: add với { data, format } ***
      const key = "webview-map";
      scene.cache.tilemap.add(key, {
        data: tiledJson,
        format: Phaser.Tilemaps.Formats.TILED_JSON,
      });
      map = scene.make.tilemap({ key });
    } else {
      map = scene.make.tilemap({ key: "default" });
    }

    const tilesets = map.tilesets.map((ts) =>
      map.addTilesetImage(ts.name, ts.name)
    );

    let layerName = "Tile Layer 1";
    if (map.getLayerIndex(layerName) === -1) {
      // nếu không có, dùng layer[0]
      layerName = map.layers[0]?.name ?? 0;
    }

    let layer = null;
    try {
      layer = map.createLayer(layerName, tilesets, offsetX + 150, offsetY);
    } catch {
      // fallback lần cuối theo index 0
      layer = map.createLayer(0, tilesets, offsetX + 150, offsetY);
    }

    if (!layer)
      throw new Error("Không tạo được Tilemap Layer (map.layers rỗng).");

    if (scale !== 1) layer.setScale(scale);
    if (layer.setPipelineData) layer.setPipelineData("roundPixels", true);

    return { map, layer, scale, offsetX, offsetY };
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
          robotPos.y + 30,
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
              // Depth cao hơn robot khi cùng tile
              battery.setDepth(battery.y + 50);
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
                // Depth cao hơn robot khi cùng tile
                battery.setDepth(battery.y + 50);
                loadedObjects.batteries.push(battery);
              }
            }
          });
        }
      });
    }

    // Load boxes từ config
    if (objectConfig.boxes) {
      objectConfig.boxes.forEach((boxConfig) => {
        if (boxConfig.tiles) {
          boxConfig.tiles.forEach((tilePos) => {
            const pos = this.getTileWorldCenter(tilePos.x, tilePos.y, mapData);
            const count = tilePos.count || 1;
            const spread = tilePos.spread || 1;

            if (count <= 1) {
              const box = scene.add.image(pos.x, pos.y + 10, "box");
              box.setOrigin(0.5, 1);
              box.setScale(scale);
              loadedObjects.boxes.push(box);
            } else {
              // Đặt nhiều boxes theo hình tròn quanh tâm tile
              const base = Math.min(
                map.tileWidth * layer.scaleX,
                map.tileHeight * layer.scaleY
              );
              const radius = base * 0.2 * spread;

              for (let i = 0; i < count; i++) {
                const angle = -Math.PI / 2 + (i * (Math.PI * 2)) / count;
                const bx = pos.x + radius * Math.cos(angle);
                const by = pos.y + radius * Math.sin(angle);

                const box = scene.add.image(bx, by + 10, "box");
                box.setOrigin(0.5, 1);
                box.setScale(scale);
                loadedObjects.boxes.push(box);
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
