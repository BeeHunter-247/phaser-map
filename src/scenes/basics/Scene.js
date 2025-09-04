import Phaser from "phaser";
import { MapLoader } from "../../utils/MapLoader.js";
import { getMapConfig, getDirectionIndex } from "../../data/mapConfigs.js";
import { ProgramExecutor } from "../../utils/ProgramExecutor.js";
import {
  createBatteryStatusText,
  updateBatteryStatusText,
  checkAndDisplayVictory,
} from "../../utils/VictoryConditions.js";

/**
 * BasicScene1 - Robot Programming Scene
 *
 * Chỉ hỗ trợ điều khiển robot thông qua chương trình Blockly JSON
 * Không có điều khiển thủ công bằng phím
 *
 * Program Controls:
 * - L: Load example program
 * - Enter: Start program execution
 * - P: Pause/Resume program
 * - R: Stop program
 *
 * To load custom program:
 * scene.loadProgram(programData)
 * scene.startProgram()
 */
export default class Scene extends Phaser.Scene {
  constructor() {
    super("Scene");
    this.robotDirection = 0; // 0: North, 1: East, 2: South, 3: West
    this.robotTileX = 0;
    this.robotTileY = 0;
    this.isMoving = false;
    this.batteries = new Map(); // Store batteries at each tile position
    this.collectedBatteries = 0;
    this.batterySprites = new Map();
    this.batteryTypes = new Map(); // Store battery types at each position
    this.collectedBatteryTypes = { red: 0, yellow: 0, green: 0 };
    this.statusText = null;

    // Program execution system
    this.programExecutor = null;
    this.programMode = false; // true = program mode, false = manual mode
  }

  /**
   * Receive params when starting the scene
   * @param {{ mapKey?: string }} data
   */
  init(data) {
    this.mapKey = data && data.mapKey ? data.mapKey : "basic1";
  }

  preload() {
    // Load selected map json by key (e.g., basic1..basic8)
    const mapJsonPath = `assets/maps/${this.mapKey}.json`;
    this.load.tilemapTiledJSON(this.mapKey, mapJsonPath);

    // Load example Blockly JSON program
    this.load.json("blockyData", "src/data/blockyData.json");

    // Load tile assets để phù hợp với tileset trong basic1.json
    this.load.image("grass", "assets/tiles/grass.png");
    this.load.image("road", "assets/tiles/road.png");
    this.load.image("ice", "assets/tiles/ice.png");

    // Load robot assets theo hướng
    this.load.image("robot_north", "assets/tiles/robot_north.png");
    this.load.image("robot_east", "assets/tiles/robot_east.png");
    this.load.image("robot_south", "assets/tiles/robot_south.png");
    this.load.image("robot_west", "assets/tiles/robot_west.png");
    this.load.image("robot_position", "assets/tiles/robot_position.png");

    // Load battery variants
    this.load.image("battery_red", "assets/tiles/battery_red.png");
    this.load.image("battery_yellow", "assets/tiles/battery_yellow.png");
    this.load.image("battery_green", "assets/tiles/battery_green.png");
    this.load.image("battery_position", "assets/tiles/battery_position.png");

    // Load other position sprites
    this.load.image("box_position", "assets/tiles/box_position.png");
  }

  create() {
    // Load map sử dụng MapLoader
    const mapData = MapLoader.loadMap(this, this.mapKey, {
      offsetX: 300,
      offsetY: 0,
      scale: 0.75,
    });

    this.map = mapData.map;
    this.layer = mapData.layer;
    this.mapData = mapData;

    // Load objects sử dụng config
    const objectConfig = getMapConfig(this.mapKey);
    const loadedObjects = MapLoader.loadObjects(this, mapData, objectConfig);

    // DEBUG: Log battery positions
    console.log("🔋 DEBUG: Loaded batteries:", loadedObjects.batteries.length);
    loadedObjects.batteries.forEach((battery, i) => {
      console.log(
        `   Battery ${i}: x=${battery.x}, y=${battery.y}, key=${battery.texture.key}`
      );
    });

    // Kiểm tra vị trí pin trong config
    if (objectConfig && objectConfig.batteries) {
      console.log(
        "🔋 DEBUG: Battery config:",
        JSON.stringify(objectConfig.batteries)
      );
    }

    // Lưu config để sử dụng cho robot direction
    this.objectConfig = objectConfig;

    // Lưu references
    this.robot = loadedObjects.robot;
    this.batterySprites = new Map();

    // Đặt pin trực tiếp từ config
    if (objectConfig && objectConfig.batteries) {
      objectConfig.batteries.forEach((batteryConfig) => {
        if (batteryConfig.tiles) {
          batteryConfig.tiles.forEach((tilePos) => {
            const tileKey = `${tilePos.x},${tilePos.y}`;
            console.log(`🔋 DEBUG: Manually registering battery at ${tileKey}`);

            // Tìm pin tương ứng trong loadedObjects.batteries
            const matchingBatteries = loadedObjects.batteries.filter(
              (battery) => {
                // Tính toán vị trí tile từ vị trí world
                const worldX = battery.x;
                const worldY = battery.y - 10; // Trừ đi offset +10 từ MapLoader
                const tilePoint = this.layer.worldToTileXY(worldX, worldY);

                if (!tilePoint) return false;

                const distance = Phaser.Math.Distance.Between(
                  tilePoint.x,
                  tilePoint.y,
                  tilePos.x,
                  tilePos.y
                );

                // Nếu khoảng cách gần đủ, coi như là pin ở tile này
                return distance < 2;
              }
            );

            if (matchingBatteries.length > 0) {
              console.log(
                `   Found ${matchingBatteries.length} batteries at ${tileKey}`
              );

              // Thêm vào tracking maps
              this.batteries.set(tileKey, matchingBatteries.length);
              this.batterySprites.set(tileKey, [...matchingBatteries]);

              // Đặt loại pin
              const batteryType = tilePos.type || batteryConfig.type || "green";
              this.batteryTypes.set(
                tileKey,
                Array(matchingBatteries.length).fill(batteryType)
              );
            } else {
              console.log(`   No matching batteries found for ${tileKey}`);

              // Tạo pin mới nếu không tìm thấy
              const worldPos = this.getTileWorldCenter(tilePos.x, tilePos.y);
              const batteryType = tilePos.type || batteryConfig.type || "green";
              const batteryKey = `battery_${batteryType}`;

              const battery = this.add.image(
                worldPos.x,
                worldPos.y + 10,
                batteryKey
              );
              battery.setOrigin(0.5, 1);
              battery.setScale(0.75);

              // Thêm vào tracking
              this.batteries.set(tileKey, 1);
              this.batterySprites.set(tileKey, [battery]);
              this.batteryTypes.set(tileKey, [batteryType]);

              console.log(
                `   Created new battery at ${tileKey}: ${batteryKey}`
              );
            }
          });
        }
      });
    }

    // Setup robot position tracking
    if (this.robot) {
      const robotTile = this.findRobotTile();
      if (robotTile) {
        this.robotTileX = robotTile.x;
        this.robotTileY = robotTile.y;

        // Lấy hướng từ config hoặc mặc định là north
        const configDirection = this.objectConfig.robot?.direction || "north";
        this.robotDirection = getDirectionIndex(configDirection);
        this.updateRobotRotation();

        // Log initial robot state
        console.log(
          `🤖 Robot initialized at tile (${this.robotTileX}, ${this.robotTileY})`
        );
        console.log(
          `   Facing: ${this.getCurrentDirection()} (from config: "${configDirection}")`
        );
        console.log(`   Robot sprite: robot_${configDirection}`);
      }
    }

    // Setup batteries tracking
    // Nếu đã đăng ký pin theo config ở trên, KHÔNG chạy lại để tránh đếm trùng
    if (!objectConfig || !objectConfig.batteries) {
      this.setupBatteryTracking(loadedObjects.batteries);
    }

    // DEBUG: In ra map per-tile sau khi đăng ký
    console.log(
      "🔍 Battery per-tile counts:",
      Array.from(this.batteries.entries())
    );

    // In-game status UI for progress/victory
    this.statusText = createBatteryStatusText(this);

    // Setup program executor
    this.programExecutor = new ProgramExecutor(this);

    // Setup input
    this.setupInput();
  }

  /**
   * Tìm tile hiện tại của robot
   */
  findRobotTile() {
    if (!this.robot) return null;

    const robotX = this.robot.x;
    const robotY = this.robot.y;

    // Convert world position back to tile position
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const worldCenter = this.getTileWorldCenter(x, y);
        const distance = Phaser.Math.Distance.Between(
          robotX,
          robotY,
          worldCenter.x,
          worldCenter.y
        );

        if (distance < 20) {
          // Threshold cho khoảng cách
          return { x, y };
        }
      }
    }

    return null;
  }

  /**
   * Setup battery tracking system
   */
  setupBatteryTracking(batterySprites) {
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
              return (
                spriteTile &&
                spriteTile.x === tilePos.x &&
                spriteTile.y === tilePos.y
              );
            });

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
   */
  findTileForSprite(sprite) {
    // Sprites được đặt với y + 10, trừ đi 10 để quy đổi đúng về tile
    const adjustY = (sprite?.y ?? 0) - 10;
    const worldX = sprite?.x ?? 0;
    const tilePoint = this.layer.worldToTileXY(worldX, adjustY);

    if (!tilePoint) return null;

    const tileX = Math.max(0, Math.min(this.map.width - 1, tilePoint.x));
    const tileY = Math.max(0, Math.min(this.map.height - 1, tilePoint.y));

    return { x: tileX, y: tileY };
  }

  /**
   * Lấy world center của tile
   */
  getTileWorldCenter(tileX, tileY) {
    const worldPoint = this.layer.tileToWorldXY(tileX, tileY);
    const cx = worldPoint.x + (this.map.tileWidth * this.layer.scaleX) / 2;
    const cy = worldPoint.y + (this.map.tileHeight * this.layer.scaleY) / 2;
    return { x: cx, y: cy };
  }

  /**
   * ========================================
   * NEW MOVEMENT SYSTEM
   * ========================================
   */

  /**
   * Xác định hướng hiện tại của robot
   * @returns {string} Direction name: 'north', 'east', 'south', 'west'
   */
  getCurrentDirection() {
    const directions = ["north", "east", "south", "west"];
    return directions[this.robotDirection];
  }

  /**
   * Lấy tọa độ tile phía trước robot theo hướng hiện tại
   * @returns {Object} {x, y} coordinates of front tile
   */
  getFrontTile() {
    let frontX = this.robotTileX;
    let frontY = this.robotTileY;

    switch (this.robotDirection) {
      case 0:
        frontY -= 1;
        break; // North
      case 1:
        frontX += 1;
        break; // East
      case 2:
        frontY += 1;
        break; // South
      case 3:
        frontX -= 1;
        break; // West
    }

    return { x: frontX, y: frontY };
  }

  /**
   * Kiểm tra vị trí có nằm trong biên của bản đồ không
   * @param {number} tileX
   * @param {number} tileY
   * @returns {boolean}
   */
  isWithinBounds(tileX, tileY) {
    return (
      tileX >= 0 &&
      tileX < this.map.width &&
      tileY >= 0 &&
      tileY < this.map.height
    );
  }

  /**
   * Kiểm tra tile có thể di chuyển được không
   * @param {number} tileX
   * @param {number} tileY
   * @returns {boolean}
   */
  isValidTile(tileX, tileY) {
    // Kiểm tra biên
    if (
      tileX < 0 ||
      tileX >= this.map.width ||
      tileY < 0 ||
      tileY >= this.map.height
    ) {
      return false;
    }

    const tile = this.layer.getTileAt(tileX, tileY);
    if (!tile) return false;

    // Robot có thể di chuyển trên Road (index 3), Robot tile (index 4), và Battery tile (index 2)
    return (tile.index >= 1 && tile.index <= 4) || tile.index === 6;
  }

  /**
   * Di chuyển thẳng theo hướng hiện tại của robot
   * @returns {boolean} Success/failure
   */
  moveForward() {
    if (this.isMoving) {
      console.log("Robot is already moving!");
      return false;
    }

    const frontTile = this.getFrontTile();

    // Thua khi đi ra ngoài biên
    if (!this.isWithinBounds(frontTile.x, frontTile.y)) {
      this.lose(`Đi ra ngoài bản đồ tại (${frontTile.x}, ${frontTile.y})`);
      return false;
    }

    const targetTile = this.layer.getTileAt(frontTile.x, frontTile.y);
    if (!targetTile) {
      this.lose(`Ô không hợp lệ tại (${frontTile.x}, ${frontTile.y})`);
      return false;
    }

    // Luật thua mới: chạm vào ô trống (index 0) => thua
    if (targetTile.index === 0) {
      this.lose(
        `Rơi vào ô trống (index 0) tại (${frontTile.x}, ${frontTile.y})`
      );
      return false;
    }

    // Luật thua cũ: chạm vào tile index 2 hoặc 5 => thua (nếu có)
    if (targetTile.index === 2 || targetTile.index === 5) {
      this.lose(
        `Rơi vào ô cấm (index ${targetTile.index}) tại (${frontTile.x}, ${frontTile.y})`
      );
      return false;
    }

    console.log(
      `Moving ${this.getCurrentDirection()} to tile (${frontTile.x}, ${
        frontTile.y
      })`
    );

    this.isMoving = true;
    const targetPos = this.getTileWorldCenter(frontTile.x, frontTile.y);

    // Cập nhật vị trí tile
    this.robotTileX = frontTile.x;
    this.robotTileY = frontTile.y;

    // Tween di chuyển (cộng thêm 10 vào Y để phù hợp với MapLoader)
    this.tweens.add({
      targets: this.robot,
      x: targetPos.x,
      y: targetPos.y + 10,
      duration: 300,
      ease: "Power2",
      onComplete: () => {
        this.isMoving = false;
        console.log(`Arrived at tile (${this.robotTileX}, ${this.robotTileY})`);
      },
    });

    return true;
  }

  /**
   * Quay trái 90 độ
   */
  turnLeft() {
    if (this.isMoving) {
      console.log("Cannot turn while moving!");
      return false;
    }

    const oldDirection = this.getCurrentDirection();
    this.robotDirection = (this.robotDirection - 1 + 4) % 4;
    this.updateRobotRotation();

    console.log(`Turned left: ${oldDirection} → ${this.getCurrentDirection()}`);
    console.log(
      `   Robot sprite changed to: robot_${this.getCurrentDirection().toLowerCase()}`
    );
    return true;
  }

  /**
   * Quay phải 90 độ
   */
  turnRight() {
    if (this.isMoving) {
      console.log("Cannot turn while moving!");
      return false;
    }

    const oldDirection = this.getCurrentDirection();
    this.robotDirection = (this.robotDirection + 1) % 4;
    this.updateRobotRotation();

    console.log(
      `Turned right: ${oldDirection} → ${this.getCurrentDirection()}`
    );
    console.log(
      `   Robot sprite changed to: robot_${this.getCurrentDirection().toLowerCase()}`
    );
    return true;
  }

  /**
   * Quay lại sau lưng 180 độ
   */
  turnAround() {
    if (this.isMoving) {
      console.log("Cannot turn while moving!");
      return false;
    }

    const oldDirection = this.getCurrentDirection();
    this.robotDirection = (this.robotDirection + 2) % 4;
    this.updateRobotRotation();

    console.log(
      `Turned around: ${oldDirection} → ${this.getCurrentDirection()}`
    );
    console.log(
      `   Robot sprite changed to: robot_${this.getCurrentDirection().toLowerCase()}`
    );
    return true;
  }

  /**
   * Cập nhật rotation sprite của robot
   */
  updateRobotRotation() {
    if (!this.robot) return;

    // Thay đổi sprite theo hướng thay vì xoay
    const directionSprites = [
      "robot_north",
      "robot_east",
      "robot_south",
      "robot_west",
    ];
    const spriteKey = directionSprites[this.robotDirection];

    // Lưu vị trí và scale hiện tại
    const currentX = this.robot.x;
    const currentY = this.robot.y;
    const currentScale = this.robot.scaleX;

    // Thay đổi texture
    this.robot.setTexture(spriteKey);

    // Khôi phục vị trí và scale với độ cao điều chỉnh (giống MapLoader)
    // Robot đã có độ cao đúng từ MapLoader (y + 10), chỉ cần giữ nguyên
    this.robot.setPosition(currentX, currentY);
    this.robot.setScale(currentScale);
    this.robot.setOrigin(0.5, 1); // Đặt anchor point ở giữa dưới
  }

  /**
   * Hiển thị toast ngắn gọn ở giữa trên màn hình
   */
  showToast(message, background = "#333333") {
    const x = this.cameras.main.width / 2;
    const y = 40;
    const text = this.add.text(x, y, message, {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#ffffff",
      backgroundColor: background,
      padding: { x: 12, y: 6 },
    });
    text.setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: text,
      alpha: { from: 1, to: 0 },
      duration: 1200,
      delay: 600,
      onComplete: () => text.destroy(),
    });
  }

  /**
   * Hiển thị banner chiến thắng ngắn gọn
   */
  showBanner(message, background = "#006600") {
    const x = this.cameras.main.width / 2;
    const y = this.cameras.main.height / 2 - 120;
    const text = this.add.text(x, y, message, {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#ffffff",
      backgroundColor: background,
      padding: { x: 16, y: 10 },
    });
    text.setOrigin(0.5, 0.5);
    this.tweens.add({
      targets: text,
      alpha: { from: 1, to: 0 },
      duration: 1500,
      delay: 800,
      onComplete: () => text.destroy(),
    });
  }

  /**
   * Thua cuộc với lý do cụ thể
   */
  lose(reason) {
    console.warn(`💥 THUA CUỘC: ${reason}`);
    this.showBanner(reason, "#8B0000");
    if (this.programExecutor) {
      this.programExecutor.stopProgram();
    }
  }

  /**
   * Helpers về pin tại ô hiện tại
   */
  getCurrentTileKey() {
    return `${this.robotTileX},${this.robotTileY}`;
  }

  getBatteriesAtCurrentTile() {
    const key = this.getCurrentTileKey();
    const sprites = this.batterySprites.get(key) || [];
    const types = this.batteryTypes.get(key) || [];

    // Tìm count từ config cho tile hiện tại
    let count = 0;
    if (this.objectConfig && this.objectConfig.batteries) {
      for (const batteryConfig of this.objectConfig.batteries) {
        if (batteryConfig.tiles) {
          for (const tileConfig of batteryConfig.tiles) {
            if (
              tileConfig.x === this.robotTileX &&
              tileConfig.y === this.robotTileY
            ) {
              count = tileConfig.count || 1;
              break;
            }
          }
        }
        if (count > 0) break;
      }
    }

    // Fallback: dùng số sprites thực tế
    if (count === 0) {
      count = sprites.length;
    }

    console.log(`🔍 getBatteriesAtCurrentTile() at ${key}:`);
    console.log(`   sprites.length: ${sprites.length}`);
    console.log(`   config count: ${count}`);

    return { key, sprites, types, count };
  }

  /**
   * Thu thập 1 pin tại vị trí hiện tại của robot (ưu tiên theo màu nếu truyền vào)
   * @param {string} [preferredColor] - "red" | "yellow" | "green"
   * @returns {number} 1 nếu thu thập thành công, 0 nếu không có pin phù hợp
   */
  collectBattery(preferredColor) {
    const tileKey = `${this.robotTileX},${this.robotTileY}`;
    console.log(
      `🔋 DEBUG: Collecting at tile (${this.robotTileX},${this.robotTileY})`
    );
    console.log(`   Battery map:`, Array.from(this.batterySprites.entries()));
    console.log(`   Looking for key: "${tileKey}"`);

    // Ưu tiên dựa theo sprites thực tế thay vì counter
    const sprites = this.batterySprites.get(tileKey) || [];
    if (sprites.length === 0) {
      this.lose(`Không có pin tại ô (${this.robotTileX}, ${this.robotTileY})`);
      return 0;
    }
    const currentCount = this.batteries.get(tileKey) || sprites.length;

    // Tìm sprite phù hợp màu nếu có yêu cầu
    let indexToRemove = -1;
    let collectedType = null;
    if (preferredColor) {
      indexToRemove = sprites.findIndex((s) =>
        s?.texture?.key?.includes(preferredColor)
      );
      collectedType = preferredColor;
      if (indexToRemove === -1) {
        this.lose(
          `Sai màu pin. Cần nhặt màu ${preferredColor} tại ô (${this.robotTileX}, ${this.robotTileY})`
        );
        return 0;
      }
    }

    // Nếu không chỉ định màu hoặc không tìm thấy đúng màu, lấy cái đầu tiên
    if (indexToRemove === -1) {
      indexToRemove = 0;
      const firstSprite = sprites[0];
      if (firstSprite?.texture?.key?.includes("red")) collectedType = "red";
      else if (firstSprite?.texture?.key?.includes("yellow"))
        collectedType = "yellow";
      else collectedType = "green";
    }

    const [sprite] = sprites.splice(indexToRemove, 1);
    if (sprite && sprite.active) sprite.destroy();

    // Cập nhật maps đếm và loại
    this.batterySprites.set(tileKey, sprites);
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
      `🔋 Collected 1 ${collectedType} battery at (${this.robotTileX}, ${this.robotTileY})`
    );
    console.log(`   Remaining at tile: ${this.batteries.get(tileKey)}`);
    console.log(`   Total inventory:`, this.collectedBatteryTypes);
    console.log(`   Total batteries: ${this.collectedBatteries}`);

    // Cập nhật UI trạng thái và kiểm tra thắng/thua
    if (this.statusText) {
      updateBatteryStatusText(this, this.statusText);
    }
    const result = checkAndDisplayVictory(this);
    if (result.isVictory) {
      this.showBanner(result.message, "#006600");
    } else {
      this.showToast(`Tiến độ: ${Math.round(result.progress * 100)}%`);
    }

    return 1;
  }

  /**
   * ========================================
   * PROGRAM EXECUTION SYSTEM
   * ========================================
   */

  /**
   * Load chương trình từ Blockly JSON
   * @param {Object} programData - Blockly JSON program
   * @param {boolean} autoStart - Tự động bắt đầu thực thi (default: false)
   * @returns {boolean} Success/failure
   */
  loadProgram(programData, autoStart = false) {
    if (!this.programExecutor) {
      console.error("❌ ProgramExecutor not initialized");
      return false;
    }

    const success = this.programExecutor.loadProgram(programData);
    if (success) {
      this.programMode = true;
      console.log("📋 Program loaded successfully");

      if (autoStart) {
        console.log("🚀 Auto-starting program execution...");
        setTimeout(() => {
          this.startProgram();
        }, 500);
      }
    }
    return success;
  }

  /**
   * Bắt đầu thực thi chương trình
   * @returns {boolean} Success/failure
   */
  startProgram() {
    if (!this.programExecutor) {
      console.error("❌ ProgramExecutor not initialized");
      return false;
    }

    const success = this.programExecutor.startProgram();
    if (success) {
      this.programMode = true;
      console.log("🚀 Program execution started");
    }
    return success;
  }

  /**
   * Dừng chương trình
   */
  stopProgram() {
    if (this.programExecutor) {
      this.programExecutor.stopProgram();
      this.programMode = false;
      console.log("⏹️ Program execution stopped");
    }
  }

  /**
   * Tạm dừng chương trình
   */
  pauseProgram() {
    if (this.programExecutor) {
      this.programExecutor.pauseProgram();
    }
  }

  /**
   * Tiếp tục chương trình
   */
  resumeProgram() {
    if (this.programExecutor) {
      this.programExecutor.resumeProgram();
    }
  }

  /**
   * Lấy trạng thái chương trình
   * @returns {Object} Program status
   */
  getProgramStatus() {
    return this.programExecutor ? this.programExecutor.getStatus() : null;
  }

  /**
   * Load chương trình mẫu để test
   */
  loadExampleProgram() {
    // Lấy program từ cache JSON đã preload
    const exampleProgram = this.cache.json.get("blockyData") || {
      version: "1.0.0",
      programName: "battery_collection_demo",
      actions: [
        { type: "turnRight" },
        { type: "forward", count: "3" },
        { type: "collectOnce", color: "green", count: 3 },
      ],
    };

    console.log("📋 Loading example program from blockyData.json...");
    const success = this.loadProgram(exampleProgram);

    if (success) {
      console.log(
        "✅ Example program loaded! Starting execution automatically..."
      );
      console.log("🎯 This program will:");
      console.log("   1. Turn right");
      console.log("   2. Move forward 3 steps");
      console.log("   3. Collect 3 green batteries");

      // Tự động bắt đầu thực thi chương trình
      setTimeout(() => {
        this.startProgram();
      }, 500); // Delay 0.5 giây để user có thể đọc thông tin
    }

    return success;
  }

  /**
   * ========================================
   * PROGRAM CONTROL SYSTEM
   * ========================================
   */
  setupInput() {
    // Chỉ giữ lại các phím điều khiển chương trình
    this.input.keyboard.on("keydown", (event) => {
      switch (event.code) {
        case "KeyP":
          if (this.programMode) {
            this.pauseProgram();
          } else {
            this.resumeProgram();
          }
          break;

        case "KeyR":
          this.stopProgram();
          break;

        case "KeyL":
          // Load example program (auto-starts)
          this.loadExampleProgram();
          break;
      }
    });

    // Log controls khi khởi tạo
    console.log("🎮 Robot Program Controls:");
    console.log("  L   : Load & Auto-Start Example Program");
    console.log("  P   : Pause/Resume Program");
    console.log("  R   : Stop Program");
    console.log("");
    console.log("📋 To load custom program, use:");
    console.log("  scene.loadProgram(yourProgramData, true)  // Auto-start");
    console.log("  scene.loadProgram(yourProgramData)        // Manual start");
    console.log(
      "  scene.startProgram()                      // Start manually"
    );
  }

  update() {
    // Update logic if needed
  }
}
