import Phaser from "phaser";
import { MapLoader } from "../../utils/MapLoader.js";
import { getMapConfig, getDirectionIndex } from "../../data/mapConfigs.js";
import { ProgramExecutor } from "../../utils/ProgramExecutor.js";
import { RobotController } from "../../managers/RobotController.js";
import { BatteryManager } from "../../managers/BatteryManager.js";
import { GameInputHandler } from "../../managers/GameInputHandler.js";
import { GameUIManager } from "../../managers/GameUIManager.js";
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

    // Managers
    this.robotController = null;
    this.batteryManager = null;
    this.inputHandler = null;
    this.uiManager = null;

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

    // Initialize Managers
    this.robotController = new RobotController(
      this,
      this.robot,
      this.map,
      this.layer
    );
    this.robotController.initialize(objectConfig);

    this.batteryManager = new BatteryManager(this);
    this.batteryManager.initialize(
      this.robotController,
      objectConfig,
      loadedObjects.batteries
    );

    this.inputHandler = new GameInputHandler(this);
    this.uiManager = new GameUIManager(this);
    this.uiManager.initialize();

    // Setup program executor
    this.programExecutor = new ProgramExecutor(this);

    // Setup input
    this.inputHandler.setupInput();
  }

  // ========================================
  // ROBOT MOVEMENT DELEGATION
  // ========================================

  /**
   * Di chuyển thẳng theo hướng hiện tại của robot
   * @returns {boolean} Success/failure
   */
  moveForward() {
    return this.robotController.moveForward();
  }

  /**
   * Quay trái 90 độ
   * @returns {boolean} Success/failure
   */
  turnLeft() {
    return this.robotController.turnLeft();
  }

  /**
   * Quay phải 90 độ
   * @returns {boolean} Success/failure
   */
  turnRight() {
    return this.robotController.turnRight();
  }

  /**
   * Quay lại sau lưng 180 độ
   * @returns {boolean} Success/failure
   */
  turnBack() {
    return this.robotController.turnBack();
  }

  /**
   * Lấy vị trí tile hiện tại của robot
   * @returns {Object} {x, y} tile coordinates
   */
  getCurrentTilePosition() {
    return this.robotController.getCurrentTilePosition();
  }

  /**
   * Lấy key của tile hiện tại (dùng cho battery tracking)
   * @returns {string} Tile key format: "x,y"
   */
  getCurrentTileKey() {
    return this.robotController.getCurrentTileKey();
  }

  /**
   * Lấy world center của tile
   * @param {number} tileX
   * @param {number} tileY
   * @returns {Object} {x, y} world coordinates
   */
  getTileWorldCenter(tileX, tileY) {
    return this.robotController.getTileWorldCenter(tileX, tileY);
  }

  // ========================================
  // UI DELEGATION
  // ========================================

  /**
   * Hiển thị toast ngắn gọn ở giữa trên màn hình
   */
  showToast(message, background = "#333333") {
    this.uiManager.showToast(message, background);
  }

  /**
   * Hiển thị banner chiến thắng ngắn gọn
   */
  showBanner(message, background = "#006600") {
    this.uiManager.showBanner(message, background);
  }

  /**
   * Thua cuộc với lý do cụ thể
   */
  lose(reason) {
    this.uiManager.showLoseMessage(reason);
    if (this.programExecutor) {
      this.programExecutor.stopProgram();
    }
  }

  // ========================================
  // BATTERY DELEGATION
  // ========================================

  /**
   * Helpers về pin tại ô hiện tại
   */
  getBatteriesAtCurrentTile() {
    return this.batteryManager.getBatteriesAtCurrentTile();
  }

  /**
   * Thu thập 1 pin tại vị trí hiện tại của robot (ưu tiên theo màu nếu truyền vào)
   * @param {string} [preferredColor] - "red" | "yellow" | "green"
   * @returns {number} 1 nếu thu thập thành công, 0 nếu không có pin phù hợp
   */
  collectBattery(preferredColor) {
    const result = this.batteryManager.collectBattery(preferredColor);

    if (result > 0) {
      // Cập nhật UI trạng thái và kiểm tra thắng/thua
      this.uiManager.updateStatusUI();
      const victoryResult = checkAndDisplayVictory(this);
      if (victoryResult.isVictory) {
        this.uiManager.showVictoryMessage(victoryResult.message);
      } else {
        this.uiManager.showProgressMessage(victoryResult.progress);
      }
    }

    return result;
  }

  // ========================================
  // PROGRAM EXECUTION SYSTEM
  // ========================================

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
        { type: "collect", color: "green", count: 3 },
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

  update() {
    // Update logic if needed
  }
}
