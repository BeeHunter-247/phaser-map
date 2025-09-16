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

    // Set background
    scene.cameras.main.setBackgroundColor(backgroundColor);
    scene.cameras.main.roundPixels = true;

    // Create tilemap
    let map;
    let layerName = "background";
    if (mapJsonData) {
      // Sử dụng mapJsonData từ webview (Tiled JSON)
      let parsed = mapJsonData;
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch (e) {
          console.error(
            "❌ MapLoader.loadMap: Failed to parse mapJsonData string:",
            e
          );
        }
      }

      // Lấy tên tilelayer đầu tiên từ dữ liệu nhận được
      if (parsed && Array.isArray(parsed.layers)) {
        const firstTileLayer = parsed.layers.find(
          (l) => l && l.type === "tilelayer"
        );
        if (firstTileLayer && firstTileLayer.name) {
          layerName = firstTileLayer.name;
        }
      }

      try {
        const dynamicKey = `webview_map_${Date.now()}`;
        // Một số bản build có thể không expose Phaser.Tilemaps.Formats → dùng hằng số 1
        const TILEMAP_TILED_JSON =
          (Phaser &&
            Phaser.Tilemaps &&
            Phaser.Tilemaps.Formats &&
            Phaser.Tilemaps.Formats.TILEMAP_TILED_JSON) ||
          1;
        scene.cache.tilemap.add(dynamicKey, {
          data: parsed,
          format: TILEMAP_TILED_JSON,
        });
        map = scene.make.tilemap({ key: dynamicKey });
      } catch (e) {
        console.error(
          "❌ MapLoader.loadMap: Failed to create tilemap from parsed data:",
          e
        );
      }
    } else {
      // Sử dụng file map.json mặc định (đã preload với key 'default')
      try {
        map = scene.make.tilemap({ key: "default" });
      } catch (e) {
        console.error(
          "❌ MapLoader.loadMap: No map data found for key 'default'",
          e
        );
      }
    }

    if (!map) {
      throw new Error("Tilemap not created from provided mapJson data");
    }

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
    // Nếu layerName hiện tại không tồn tại trong map, chọn layer tile đầu tiên khả dụng
    let resolvedLayerName = layerName;
    try {
      if (typeof map.getLayerIndex === "function") {
        const idx = map.getLayerIndex(resolvedLayerName);
        if (idx === -1) {
          const names =
            typeof map.getLayerNames === "function" ? map.getLayerNames() : [];
          if (Array.isArray(names) && names.length > 0) {
            resolvedLayerName = names[0];
          } else if (Array.isArray(map.layers) && map.layers.length > 0) {
            resolvedLayerName = map.layers[0].name || resolvedLayerName;
          }
          console.warn(
            `⚠️ Layer '${layerName}' not found. Using '${resolvedLayerName}' instead.`
          );
        }
      }
    } catch {}

    const layer = map.createLayer(
      resolvedLayerName,
      tilesets,
      offsetX,
      offsetY
    );
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

    console.log(`📦 MapLoader: Starting to load objects`);

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

    console.log(
      `📦 MapLoader: Final loaded objects - boxes: ${loadedObjects.boxes.length}`
    );
    return loadedObjects;
  }

  /**
   * Chuyển đổi tọa độ object từ Tiled sang world position
   */
  // static convertObjectToWorld(obj, mapData) {
  //   const { map, layer, offsetX, offsetY } = mapData;

  //   // Convert từ pixel projected sang tile coords
  //   const tileX = obj.x / map.tileWidth;
  //   const tileY = obj.y / map.tileHeight;

  //   // Sử dụng map.tileToWorldXY để tránh double offset
  //   const worldPoint = map.tileToWorldXY(tileX, tileY);

  //   // Áp dụng offset của layer
  //   const finalX = worldPoint.x + offsetX;
  //   const finalY = worldPoint.y + offsetY;

  //   return { x: finalX, y: finalY };
  // }

  /**
   * Tạo object từ Tiled object
   */
  // static createObjectFromTiled(scene, tiledObj, worldPos, scale) {
  //   let spriteKey = null;
  //   let origin = { x: 0.5, y: 1 }; // Default isometric origin

  //   // Xác định sprite key dựa trên tên object
  //   switch (tiledObj.name) {
  //     case "RobotPoint":
  //       spriteKey = "robot_east";
  //       break;
  //     case "PinPoint":
  //     case "BatteryPoint":
  //       spriteKey = "pin_green"; // Default to green pin
  //       break;
  //     case "BoxPoint":
  //       spriteKey = "box";
  //       break;
  //     default:
  //       return null; // Unknown object type
  //   }

  //   // Tạo sprite
  //   const sprite = scene.add.image(worldPos.x, worldPos.y, spriteKey);
  //   sprite.setOrigin(origin.x, origin.y);
  //   sprite.setScale(scale);

  //   return {
  //     sprite,
  //     type: tiledObj.name,
  //     originalData: tiledObj,
  //   };
  // }

  /**
   * Phân loại object vào categories
   */
  // static categorizeObject(loadedObj, tiledObj, loadedObjects) {
  //   switch (tiledObj.name) {
  //     case "RobotPoint":
  //       loadedObjects.robot = loadedObj.sprite;
  //       break;
  //     case "PinPoint":
  //     case "BatteryPoint":
  //       loadedObjects.batteries.push(loadedObj.sprite);
  //       break;
  //     case "BoxPoint":
  //       if (!loadedObjects.boxes) loadedObjects.boxes = [];
  //       loadedObjects.boxes.push(loadedObj.sprite);
  //       break;
  //     default:
  //       loadedObjects.others.push(loadedObj);
  //       break;
  //   }
  // }

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
      console.log(
        `📦 MapLoader: Loading ${objectConfig.boxes.length} box configs`
      );
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
              console.log(
                `📦 MapLoader: Created box at (${tilePos.x},${tilePos.y})`
              );
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
              console.log(
                `📦 MapLoader: Created ${count} boxes at (${tilePos.x},${tilePos.y})`
              );
            }
          });
        }
      });
    }

    console.log(
      `📦 MapLoader: Total boxes loaded: ${loadedObjects.boxes.length}`
    );
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
