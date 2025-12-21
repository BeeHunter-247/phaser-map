/**
 * BoxManager - Quản lý boxes trên map
 */
import { VictoryConditions } from "../utils/VictoryConditions.js";
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
   * @param {Object} robotManager - Robot manager instance
   * @param {Object} challengeConfig - Config từ challenge.json
   * @param {Array} loadedBoxes - Boxes đã load từ MapLoader
   */
  initialize(robotManager, challengeConfig, loadedBoxes = []) {
    this.robotManager = robotManager;
    this.boxes.clear();
    this.totalBoxes = 0;
    this.collectedBoxes = 0;
    this.carriedBoxes = 0;

    // Nếu có config boxes và có sprites đã load, gán mỗi sprite vào tile gần nhất trong config
    if (
      challengeConfig &&
      challengeConfig.boxes &&
      loadedBoxes &&
      loadedBoxes.length > 0
    ) {
      // Chuẩn bị danh sách tâm tile theo config
      const centers = [];
      challengeConfig.boxes.forEach((boxConfig) => {
        if (boxConfig.tiles) {
          boxConfig.tiles.forEach((tilePos) => {
            const key = `${tilePos.x},${tilePos.y}`;
            const center = this.robotManager.getTileWorldCenter(
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
      challengeConfig &&
      challengeConfig.boxes &&
      (!loadedBoxes || loadedBoxes.length === 0)
    ) {
      // Không có sprites sẵn: chỉ đăng ký theo số lượng từ config
      challengeConfig.boxes.forEach((boxConfig) => {
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
  }

  /**
   * Khởi tạo BoxManager với Models
   * @param {Object} robotManager - Robot manager instance
   * @param {MapModel} mapModel - Map model
   * @param {Array} loadedBoxes - Box sprites từ Scene
   */
  initializeWithModels(robotManager, mapModel, loadedBoxes) {
    this.robotManager = robotManager;
    this.mapModel = mapModel;
    this.boxes.clear();
    this.totalBoxes = 0;
    this.collectedBoxes = 0;
    this.putBoxes = 0;
    this.carriedBoxes = 0;

    // Link sprites với models
    loadedBoxes.forEach((sprite) => {
      if (sprite.model) {
        const tileKey = `${sprite.model.position.x},${sprite.model.position.y}`;
        this.registerBoxAtTile(tileKey, sprite);
      }
    });
  }

  /**
   * Chuyển đổi world position thành tile key
   */
  getTileKeyFromPosition(worldX, worldY) {
    if (!this.robotManager || !this.robotManager.map) {
      return null;
    }

    const map = this.robotManager.map;
    const layer = this.robotManager.layer || this.scene.layer;
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
  }

  /**
   * Lấy vị trí tile phía trước robot (ô trước mặt)
   * @returns {Object} {x, y} coordinates of front tile
   */
  getFrontTilePosition() {
    if (!this.robotManager) {
      return null;
    }
    return this.robotManager.getFrontTile();
  }

  /**
   * Lấy thông tin boxes tại tile hiện tại của robot
   */
  getBoxesAtCurrentTile() {
    const currentTile = this.robotManager.getCurrentTilePosition();
    if (!currentTile) return null;

    const tileKey = `${currentTile.x},${currentTile.y}`;
    return this.getBoxesAtTile(tileKey);
  }

  /**
   * Lấy thông tin boxes tại tile phía trước robot
   */
  getBoxesAtFrontTile() {
    const frontTile = this.getFrontTilePosition();
    if (!frontTile) return null;

    const tileKey = `${frontTile.x},${frontTile.y}`;
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
   * Kiểm tra có box tại tile phía trước robot không
   */
  hasBoxAtFrontTile() {
    const info = this.getBoxesAtFrontTile();
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
    // Chỉ cho phép nhặt 1 box mỗi lần
    if (count !== 1) {
      return false;
    }

    const frontTile = this.getFrontTilePosition();
    if (!frontTile) {
      return false;
    }

    // Kiểm tra ô trước mặt có hợp lệ không
    if (!this.robotManager.isWithinBounds(frontTile.x, frontTile.y)) {
      return false;
    }

    const tileKey = `${frontTile.x},${frontTile.y}`;
    const tileData = this.boxes.get(tileKey);

    if (!tileData || tileData.count < 1) {
      return false;
    }

    // Cập nhật số lượng - chỉ nhặt 1 box
    tileData.count -= 1;
    this.totalBoxes -= 1;
    this.collectedBoxes += 1;
    this.carriedBoxes += 1;

    if (tileData.sprites.length > 0) {
      const spritesToRemove = tileData.sprites.splice(0, count);
      spritesToRemove.forEach((sprite) => {
        if (sprite && sprite.destroy) {
          sprite.destroy();
        }
      });
    } else {
      console.log(`No sprites to remove at ${tileKey}`);
    }

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
    // Chỉ cho phép đặt 1 box mỗi lần
    if (count !== 1) {
      return false;
    }

    // Không cho đặt vượt quá số lượng đang mang
    if (this.carriedBoxes < 1) {
      return false;
    }

    const frontTile = this.getFrontTilePosition();
    if (!frontTile) {
      return false;
    }

    // Kiểm tra ô trước mặt có hợp lệ không
    if (!this.robotManager.isWithinBounds(frontTile.x, frontTile.y)) {
      return false;
    }

    const tileKey = `${frontTile.x},${frontTile.y}`;

    // Ràng buộc: chỉ cho phép đặt box tại các vị trí mục tiêu (nếu map định nghĩa bằng toạ độ)
    try {
      const requiredTargets = VictoryConditions.getRequiredBoxes(this.scene);
      if (Array.isArray(requiredTargets) && requiredTargets.length > 0) {
        const allowed = new Set(requiredTargets.map((t) => `${t.x},${t.y}`));
        if (!allowed.has(tileKey)) {
          return false;
        }
      }
    } catch (e) {
      // Bỏ qua nếu không có cấu hình victory phù hợp
    }

    // Khởi tạo tile nếu chưa có
    if (!this.boxes.has(tileKey)) {
      this.boxes.set(tileKey, {
        count: 0,
        sprites: [],
        types: [],
      });
    }

    const tileData = this.boxes.get(tileKey);

    // Tạo sprite cho box mới - chỉ 1 box
    const boxSprite = this.createBoxSprite(
      frontTile.x,
      frontTile.y,
      0,
      tileData.count
    );
    if (boxSprite) {
      tileData.sprites.push(boxSprite);
      tileData.types.push("box");
    }

    // Cập nhật số lượng - chỉ đặt 1 box
    tileData.count += 1;
    // Chỉ tăng totalBoxes nếu không phải warehouse
    if (!this.isWarehouseTile(tileKey)) {
      this.totalBoxes += 1;
    }
    this.putBoxes += 1; // Tăng số box đã đặt
    this.carriedBoxes -= 1; // Giảm số đang mang

    // Re-layout after placing
    this.layoutTileSpritesGrid(tileKey);

    return true;
  }

  /**
   * Tạo box sprite
   */
  createBoxSprite(tileX, tileY, index, totalCount) {
    try {
      const worldPos = this.robotManager.getTileWorldCenter(tileX, tileY);
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
    const center = this.robotManager.getTileWorldCenter(sx, sy);
    if (!center) return;

    const layer = this.scene.layer;
    const map = this.robotManager.map;
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
    const challengeConfig = this.scene.challengeConfig;
    if (!challengeConfig || !challengeConfig.boxes) {
      return false;
    }

    for (const boxConfig of challengeConfig.boxes) {
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
    // Lấy warehouse position từ challenge config
    const challengeConfig = this.scene.challengeConfig;
    if (!challengeConfig || !challengeConfig.boxes) {
      return 0;
    }

    // Tìm warehouse trong config
    for (const boxConfig of challengeConfig.boxes) {
      if (boxConfig.warehouse) {
        const warehouse = boxConfig.warehouse;
        const tileKey = `${warehouse.x},${warehouse.y}`;
        const tileData = this.boxes.get(tileKey);

        // Đếm box hiện tại tại warehouse (từ tiles, không phải warehouse config)
        const remainingBoxes = tileData ? tileData.count : 0;
        return remainingBoxes;
      }
    }

    return 0;
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
  }
}
