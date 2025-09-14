/**
 * BoxManager - Quản lý boxes trên map
 * Sử dụng EntityManager thay vì hardcode
 */
import { VictoryConditions } from "../utils/VictoryConditions.js";
import { EntityManager } from "../models/EntityManager.js";

export class BoxManager {
  constructor(scene) {
    this.scene = scene;
    this.entityManager = null;
  }

  /**
   * Khởi tạo BoxManager
   * @param {Array} boxSprites - Array of box sprites from MapLoader
   * @param {GameState} gameState - Game state instance
   */
  initialize(boxSprites, gameState) {
    this.boxSprites = boxSprites || [];
    this.gameState = gameState;
    console.log(
      `📦 BoxManager initialized with ${this.boxSprites.length} boxes`
    );
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
   * Lấy vị trí tile phía trước robot (ô trước mặt)
   * @returns {Object} {x, y} coordinates of front tile
   */
  getFrontTilePosition() {
    if (!this.robotController) {
      console.error("❌ RobotController not initialized");
      return null;
    }
    return this.robotController.getFrontTile();
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
    if (!this.entityManager) return false;
    return this.entityManager.takeBox(count);
  }

  /**
   * Đặt box (put box)
   * @param {number} count - Số lượng box cần đặt
   * @returns {boolean} Success/failure
   */
  putBox(count = 1) {
    if (!this.entityManager) return false;
    return this.entityManager.placeBox(count);
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
