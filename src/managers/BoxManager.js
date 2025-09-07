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

    console.log(
      `📦 BoxManager initializing with ${loadedBoxes.length} loaded boxes`
    );

    // Đăng ký boxes từ loadedBoxes (nếu có)
    if (loadedBoxes && loadedBoxes.length > 0) {
      loadedBoxes.forEach((box) => {
        const tileKey = this.getTileKeyFromPosition(box.x, box.y);
        if (tileKey) {
          this.registerBoxAtTile(tileKey, box);
        }
      });
    }

    // Đăng ký boxes từ config
    if (objectConfig && objectConfig.boxes) {
      objectConfig.boxes.forEach((boxConfig) => {
        if (boxConfig.tiles) {
          boxConfig.tiles.forEach((tilePos) => {
            const tileKey = `${tilePos.x},${tilePos.y}`;
            const count = tilePos.count || 1;
            this.registerBoxesAtTile(tileKey, count);
          });
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

    // Sử dụng layer để convert world position sang tile position
    const tileX = Math.floor(worldX / this.robotController.map.tileWidth);
    const tileY = Math.floor(worldY / this.robotController.map.tileHeight);
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

    console.log(
      `📦 Registered ${count} boxes at ${tileKey}: total=${tileData.count}`
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

    // Xóa sprites nếu có
    if (tileData.sprites.length > 0) {
      const spritesToRemove = tileData.sprites.splice(0, count);
      spritesToRemove.forEach((sprite) => {
        if (sprite && sprite.destroy) {
          sprite.destroy();
        }
      });
    }

    console.log(
      `📦 Took ${count} box(es) from ${tileKey}. Remaining: ${tileData.count}`
    );

    // Kiểm tra thắng thua
    this.checkVictoryConditions();

    return true;
  }

  /**
   * Đặt box (put box)
   * @param {number} count - Số lượng box cần đặt
   * @returns {boolean} Success/failure
   */
  putBox(count = 1) {
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
    this.totalBoxes += count;
    this.putBoxes += count; // Tăng số box đã đặt

    console.log(
      `📦 Put ${count} box(es) at ${tileKey}. Total: ${tileData.count}`
    );

    return true;
  }

  /**
   * Tạo box sprite
   */
  createBoxSprite(tileX, tileY, index, totalCount) {
    try {
      const worldPos = this.robotController.getTileWorldCenter(tileX, tileY);
      if (!worldPos) return null;

      // Tính toán vị trí cho multiple boxes
      let x = worldPos.x;
      let y = worldPos.y;

      if (totalCount > 1) {
        // Đặt boxes theo hình tròn
        const radius = 20; // Base radius
        const angle = -Math.PI / 2 + (index * (Math.PI * 2)) / totalCount;
        x = worldPos.x + radius * Math.cos(angle);
        y = worldPos.y + radius * Math.sin(angle);
      }

      const box = this.scene.add.image(x, y + 10, "box");
      box.setOrigin(0.5, 1);
      box.setScale(0.8); // Slightly smaller than batteries

      return box;
    } catch (error) {
      console.error("❌ Failed to create box sprite:", error);
      return null;
    }
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
