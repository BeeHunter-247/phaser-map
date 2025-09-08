/**
 * BoxManager - Quản lý boxes trên map
 */
export class BoxManager {
  constructor(scene) {
    this.scene = scene;
    this.boxes = new Map(); // Map<"x,y", {count: number, sprites: Phaser.GameObjects.Image[]}>
    this.totalBoxes = 0;
    this.collectedBoxes = 0;
    this.putBoxes = 0; // Số box đã đặt
    this.carriedBoxes = 0; // Số box robot đang mang theo
  }

  /**
   * Khởi tạo BoxManager
   * @param {Object} robotController - Robot controller instance
   * @param {Object} objectConfig - Config từ mapConfigs
   * @param {Array} loadedBoxes - Boxes đã load từ MapLoader
   */
  initialize(robotController, objectConfig, loadedBoxes = []) {
    this.robotController = robotController;
    this.boxes.clear();
    this.totalBoxes = 0;
    this.collectedBoxes = 0;
    this.carriedBoxes = 0;

    console.log(
      `📦 BoxManager initializing with ${loadedBoxes.length} loaded boxes`
    );

    // Nếu có config boxes và có sprites đã load, gán mỗi sprite vào tile gần nhất trong config
    if (
      objectConfig &&
      objectConfig.boxes &&
      loadedBoxes &&
      loadedBoxes.length > 0
    ) {
      // Chuẩn bị danh sách tâm tile theo config
      const centers = [];
      objectConfig.boxes.forEach((boxConfig) => {
        if (boxConfig.tiles) {
          boxConfig.tiles.forEach((tilePos) => {
            const key = `${tilePos.x},${tilePos.y}`;
            const center = this.robotController.getTileWorldCenter(
              tilePos.x,
              tilePos.y
            );
            if (center) centers.push({ key, x: center.x, y: center.y });
          });
        }
      });

      loadedBoxes.forEach((sprite) => {
        if (centers.length === 0) return;
        // Tìm tile center gần nhất
        let best = centers[0];
        let bestD2 =
          (sprite.x - best.x) * (sprite.x - best.x) +
          (sprite.y - best.y) * (sprite.y - best.y);
        for (let i = 1; i < centers.length; i++) {
          const c = centers[i];
          const d2 =
            (sprite.x - c.x) * (sprite.x - c.x) +
            (sprite.y - c.y) * (sprite.y - c.y);
          if (d2 < bestD2) {
            best = c;
            bestD2 = d2;
          }
        }
        this.registerBoxAtTile(best.key, sprite);
      });
    } else if (
      objectConfig &&
      objectConfig.boxes &&
      (!loadedBoxes || loadedBoxes.length === 0)
    ) {
      // Không có sprites sẵn: chỉ đăng ký theo số lượng từ config
      objectConfig.boxes.forEach((boxConfig) => {
        if (boxConfig.tiles) {
          boxConfig.tiles.forEach((tilePos) => {
            const tileKey = `${tilePos.x},${tilePos.y}`;
            const count = tilePos.count || 1;
            this.registerBoxesAtTile(tileKey, count);
          });
        }
      });
    } else if (loadedBoxes && loadedBoxes.length > 0) {
      // Không có config: fallback theo vị trí sprite
      loadedBoxes.forEach((box) => {
        const tileKey = this.getTileKeyFromPosition(box.x, box.y);
        if (tileKey) {
          this.registerBoxAtTile(tileKey, box);
        }
      });
    }

    console.log(`📦 BoxManager initialized: ${this.totalBoxes} boxes total`);
  }

  /**
   * Chuyển đổi world position thành tile key
   */
  getTileKeyFromPosition(worldX, worldY) {
    if (!this.robotController || !this.robotController.map) {
      console.error("❌ RobotController or map not available");
      return null;
    }

    const map = this.robotController.map;
    const layer = this.robotController.layer || this.scene.layer;
    // Dùng API của Phaser để quy đổi world -> tile theo layer thực tế
    const tileX = map.worldToTileX(
      worldX,
      true,
      this.scene.cameras.main,
      layer
    );
    const tileY = map.worldToTileY(
      worldY,
      true,
      this.scene.cameras.main,
      layer
    );
    return `${tileX},${tileY}`;
  }

  /**
   * Đăng ký box tại tile từ loadedBoxes
   */
  registerBoxAtTile(tileKey, boxSprite) {
    if (!this.boxes.has(tileKey)) {
      this.boxes.set(tileKey, {
        count: 0,
        sprites: [],
        types: [],
      });
    }

    const tileData = this.boxes.get(tileKey);
    tileData.count++;
    tileData.sprites.push(boxSprite);
    tileData.types.push("box");
    this.totalBoxes++;

    console.log(`📦 Registered box at ${tileKey}: count=${tileData.count}`);
    // Re-layout sprites to maintain visual grid
    this.layoutTileSpritesGrid(tileKey);
  }

  /**
   * Đăng ký boxes tại tile từ config
   */
  registerBoxesAtTile(tileKey, count) {
    if (!this.boxes.has(tileKey)) {
      this.boxes.set(tileKey, {
        count: 0,
        sprites: [],
        types: [],
      });
    }

    const tileData = this.boxes.get(tileKey);
    tileData.count += count;
    this.totalBoxes += count;

    // Không tạo sprites ở đây vì MapLoader đã tạo rồi
    // Chỉ tăng count để theo dõi logic

    console.log(
      `📦 Registered ${count} boxes at ${tileKey}: total=${tileData.count}, sprites=${tileData.sprites.length}`
    );
  }

  /**
   * Lấy thông tin boxes tại tile hiện tại của robot
   */
  getBoxesAtCurrentTile() {
    const currentTile = this.robotController.getCurrentTilePosition();
    if (!currentTile) return null;

    const tileKey = `${currentTile.x},${currentTile.y}`;
    return this.getBoxesAtTile(tileKey);
  }

  /**
   * Lấy thông tin boxes tại tile cụ thể
   */
  getBoxesAtTile(tileKey) {
    const tileData = this.boxes.get(tileKey);
    if (!tileData) return null;

    return {
      key: tileKey,
      count: tileData.count,
      sprites: tileData.sprites,
      types: tileData.types,
    };
  }

  /**
   * Kiểm tra có box tại tile hiện tại không
   */
  hasBoxAtCurrentTile() {
    const info = this.getBoxesAtCurrentTile();
    return info && info.count > 0;
  }

  /**
   * Kiểm tra có box tại tile cụ thể không
   */
  hasBoxAtTile(tileKey) {
    const info = this.getBoxesAtTile(tileKey);
    return info && info.count > 0;
  }

  /**
   * Thu thập box (take box)
   * @param {number} count - Số lượng box cần thu thập
   * @returns {boolean} Success/failure
   */
  takeBox(count = 1) {
    const currentTile = this.robotController.getCurrentTilePosition();
    if (!currentTile) {
      console.error("❌ No current tile for robot");
      return false;
    }

    const tileKey = `${currentTile.x},${currentTile.y}`;
    const tileData = this.boxes.get(tileKey);

    console.log(`📦 currentTile: ${currentTile}`);
    console.log(`📦 boxes: ${this.boxes}`);
    console.log(`📦 tileKey: ${tileKey}`);
    console.log(`📦 tileData: ${tileData}`);

    if (!tileData || tileData.count < count) {
      console.error(
        `❌ Not enough boxes at ${tileKey}. Available: ${
          tileData?.count || 0
        }, Requested: ${count}`
      );
      return false;
    }

    // Cập nhật số lượng
    tileData.count -= count;
    this.totalBoxes -= count;
    this.collectedBoxes += count;
    this.carriedBoxes += count;

    // Xóa sprites nếu có
    console.log(
      `📦 tileData.sprites.length: ${tileData.sprites.length} at ${tileKey}`
    );
    if (tileData.sprites.length > 0) {
      const spritesToRemove = tileData.sprites.splice(0, count);
      console.log(
        `📦 Removing ${spritesToRemove.length} sprites from ${tileKey}`
      );
      spritesToRemove.forEach((sprite) => {
        if (sprite && sprite.destroy) {
          sprite.destroy();
        }
      });
    } else {
      console.log(`📦 No sprites to remove at ${tileKey}`);
    }

    console.log(
      `📦 Took ${count} box(es) from ${tileKey}. Remaining: ${tileData.count}`
    );

    // Kiểm tra thắng thua
    this.checkVictoryConditions();

    // Re-layout after removal
    this.layoutTileSpritesGrid(tileKey);

    return true;
  }

  /**
   * Đặt box (put box)
   * @param {number} count - Số lượng box cần đặt
   * @returns {boolean} Success/failure
   */
  putBox(count = 1) {
    // Không cho đặt vượt quá số lượng đang mang
    if (this.carriedBoxes < count) {
      console.error(
        `❌ Cannot put ${count} box(es). Carried: ${this.carriedBoxes}`
      );
      return false;
    }
    const currentTile = this.robotController.getCurrentTilePosition();
    if (!currentTile) {
      console.error("❌ No current tile for robot");
      return false;
    }

    const tileKey = `${currentTile.x},${currentTile.y}`;

    // Khởi tạo tile nếu chưa có
    if (!this.boxes.has(tileKey)) {
      this.boxes.set(tileKey, {
        count: 0,
        sprites: [],
        types: [],
      });
    }

    const tileData = this.boxes.get(tileKey);

    // Tạo sprites cho boxes mới
    for (let i = 0; i < count; i++) {
      const boxSprite = this.createBoxSprite(
        currentTile.x,
        currentTile.y,
        i,
        tileData.count + i
      );
      if (boxSprite) {
        tileData.sprites.push(boxSprite);
        tileData.types.push("box");
      }
    }

    // Cập nhật số lượng
    tileData.count += count;
    // Chỉ tăng totalBoxes nếu không phải warehouse
    if (!this.isWarehouseTile(tileKey)) {
      this.totalBoxes += count;
    }
    this.putBoxes += count; // Tăng số box đã đặt
    this.carriedBoxes -= count; // Giảm số đang mang

    console.log(
      `📦 Put ${count} box(es) at ${tileKey}. Total: ${tileData.count}`
    );

    // Re-layout after placing
    this.layoutTileSpritesGrid(tileKey);

    return true;
  }

  /**
   * Tạo box sprite
   */
  createBoxSprite(tileX, tileY, index, totalCount) {
    try {
      const worldPos = this.robotController.getTileWorldCenter(tileX, tileY);
      if (!worldPos) return null;
      // Spawn at center; grid layout function will realign all sprites
      const BOX_Y_OFFSET = 14;
      const box = this.scene.add.image(
        worldPos.x,
        worldPos.y + BOX_Y_OFFSET,
        "box"
      );
      box.setOrigin(0.5, 1);
      // Keep scale consistent with map layer and preloaded sprites
      const layer = this.scene.layer;
      const layerScale = layer?.scaleX || 1;
      box.setScale(layerScale);
      // Depth theo y để robot nổi trên cùng tile
      box.setDepth(worldPos.y - 1);

      return box;
    } catch (error) {
      console.error("❌ Failed to create box sprite:", error);
      return null;
    }
  }

  /**
   * Grid 2.5D layout: 4 boxes per row, then wrap to next row with a slight vertical drop.
   */
  layoutTileSpritesGrid(tileKey) {
    const data = this.boxes.get(tileKey);
    if (!data || data.sprites.length === 0) return;

    const [sx, sy] = tileKey.split(",").map((v) => parseInt(v, 10));
    const center = this.robotController.getTileWorldCenter(sx, sy);
    if (!center) return;

    const layer = this.scene.layer;
    const map = this.robotController.map;
    const tileW = map.tileWidth * (layer?.scaleX || 1);
    const tileH = map.tileHeight * (layer?.scaleY || 1);

    const BOX_Y_OFFSET = 14;
    const COLS = 3; // 3 boxes per row
    // Shift start a bit toward bottom-right so boxes stay inside the tile
    // Bắt đầu hơi lệch về góc trên-bên phải của tile
    const START_X = center.x + tileW * 0.06;
    const START_Y = center.y - tileH * 0.16 + BOX_Y_OFFSET;
    const STEP_X = Math.max(8, tileW * 0.13);
    const STEP_Y = Math.max(12, tileH * 0.26);
    // Isometric feel: deeper column descent; rows also shift a bit to the right
    const COL_DROP_Y = Math.max(6, tileH * 0.14);
    const ROW_SHIFT_X = Math.max(2, tileW * 0.02);

    data.sprites.forEach((sprite, i) => {
      if (!sprite) return;
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      let x = START_X + col * STEP_X + row * ROW_SHIFT_X;
      let y = START_Y + row * STEP_Y + col * COL_DROP_Y;
      // Dịch các hàng sau (row >= 1) về góc trên-trái, tăng dần theo số hàng
      if (row >= 1) {
        const rowFactor = row; // hàng 1,2,3... dịch mạnh dần
        x -= tileW * 0.17 * rowFactor;
        y -= tileH * 0.17 * rowFactor;
      }
      sprite.setPosition(x, y);
      // Cập nhật depth theo y sau layout
      sprite.setDepth(y - BOX_Y_OFFSET - 1);
    });
  }

  /**
   * Kiểm tra tile có phải warehouse không
   * @param {string} tileKey - Tile key (x,y)
   * @returns {boolean} True nếu là warehouse
   */
  isWarehouseTile(tileKey) {
    const mapConfig = this.scene.objectConfig;
    if (!mapConfig || !mapConfig.boxes) {
      return false;
    }

    for (const boxConfig of mapConfig.boxes) {
      if (boxConfig.warehouse) {
        const warehouse = boxConfig.warehouse;
        const warehouseKey = `${warehouse.x},${warehouse.y}`;
        if (tileKey === warehouseKey) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Kiểm tra số lượng box còn lại tại warehouse (nhà kho cố định)
   * @returns {number} Số lượng box còn lại tại warehouse
   */
  checkWarehouse() {
    // Lấy warehouse position từ map config
    const mapConfig = this.scene.objectConfig;
    if (!mapConfig || !mapConfig.boxes) {
      console.log(`🏭 No warehouse config found`);
      return 0;
    }

    // Tìm warehouse trong config
    for (const boxConfig of mapConfig.boxes) {
      if (boxConfig.warehouse) {
        const warehouse = boxConfig.warehouse;
        const tileKey = `${warehouse.x},${warehouse.y}`;
        const tileData = this.boxes.get(tileKey);
        console.log(`🏭 Warehouse tile data: ${tileData}`);

        // Đếm box hiện tại tại warehouse (từ tiles, không phải warehouse config)
        const remainingBoxes = tileData ? tileData.count : 0;

        console.log(
          `🏭 Warehouse (${warehouse.x}, ${warehouse.y}) has ${remainingBoxes} boxes remaining`
        );
        return remainingBoxes;
      }
    }

    console.log(`🏭 No warehouse found in config`);
    return 0;
  }

  /**
   * Kiểm tra điều kiện thắng thua
   */
  checkVictoryConditions() {
    // Có thể thêm logic kiểm tra thắng thua dựa trên boxes
    // Ví dụ: thu thập đủ số lượng boxes nhất định
    console.log(
      `📦 Box status: ${this.collectedBoxes}/${this.totalBoxes} collected`
    );
  }

  /**
   * Lấy thống kê boxes
   */
  getStats() {
    return {
      totalBoxes: this.totalBoxes,
      collectedBoxes: this.collectedBoxes,
      putBoxes: this.putBoxes,
      carriedBoxes: this.carriedBoxes,
      remainingBoxes: this.totalBoxes - this.collectedBoxes,
    };
  }

  /**
   * Reset BoxManager
   */
  reset() {
    this.boxes.clear();
    this.totalBoxes = 0;
    this.collectedBoxes = 0;
    this.putBoxes = 0;
    this.carriedBoxes = 0;
    console.log("📦 BoxManager reset");
  }

  /**
   * Debug: In thông tin tất cả boxes
   */
  debugBoxes() {
    console.log("📦 DEBUG: All boxes:");
    this.boxes.forEach((data, tileKey) => {
      console.log(`   ${tileKey}: ${data.count} boxes`);
    });
  }
}
