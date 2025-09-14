import Phaser from "phaser";
import { MapLoader } from "../utils/MapLoader.js";
import { ProgramExecutor } from "../utils/ProgramExecutor.js";
import { RobotController } from "../managers/RobotController.js";
import { BatteryManager } from "../managers/BatteryManager.js";
import { BoxManager } from "../managers/BoxManager.js";
import { GameInputHandler } from "../managers/GameInputHandler.js";
import { GameUIManager } from "../managers/GameUIManager.js";
import { EntityManager } from "../models/EntityManager.js";
import {
  createBatteryStatusText,
  updateBatteryStatusText,
  checkAndDisplayVictory,
} from "../utils/VictoryConditions.js";

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
    this.boxManager = null;
    this.inputHandler = null;
    this.uiManager = null;
    this.entityManager = null; // EntityManager để quản lý tất cả entities

    // Program execution system
    this.programExecutor = null;
    this.programMode = false; // true = program mode, false = manual mode

    // Webview data
    this.webviewData = null;
    this.mapModel = null; // Map model instance
  }

  /**
   * Receive params when starting the scene
   * @param {{ useBackend?: boolean, webviewData?: any }} data
   */
  init(data) {
    this.useBackend = data && data.useBackend ? data.useBackend : false;
    this.webviewData = data && data.webviewData ? data.webviewData : null;
  }

  preload() {
    // Load map JSON và challenge JSON
    this.load.tilemapTiledJSON("mapData", "src/data/map.json");
    this.load.json("challengeData", "src/data/challenge.json");

    // Load example Blockly JSON program
    this.load.json("blockyData", "src/data/blockyData.json");

    // Load tile assets để phù hợp với tileset trong map.json
    this.load.image("wood", "assets/tiles/wood.png");
    this.load.image("road_h", "assets/tiles/road_h.png");
    this.load.image("road_v", "assets/tiles/road_v.png");
    this.load.image("water", "assets/tiles/water.png");
    this.load.image("grass", "assets/tiles/grass.png");
    this.load.image("crossroad", "assets/tiles/crossroad.png");

    // Load robot assets theo hướng
    this.load.image("robot_north", "assets/tiles/robot_north.png");
    this.load.image("robot_east", "assets/tiles/robot_east.png");
    this.load.image("robot_south", "assets/tiles/robot_south.png");
    this.load.image("robot_west", "assets/tiles/robot_west.png");

    // Load pin/battery variants
    this.load.image("pin_red", "assets/tiles/pin_red.png");
    this.load.image("pin_yellow", "assets/tiles/pin_yellow.png");
    this.load.image("pin_green", "assets/tiles/pin_green.png");

    // Load other position sprites
    this.load.image("box", "assets/tiles/box.png");
  }

  create() {
    try {
      console.log(
        "🚀 Starting game with data from map.json and challenge.json"
      );

      // Lấy challenge data từ cache
      const challengeData = this.cache.json.get("challengeData");

      if (!challengeData) {
        throw new Error("Failed to load challenge data from cache");
      }

      console.log("✅ Challenge data loaded successfully");
      console.log("⚙️ Challenge data:", challengeData);

      // Load map sử dụng MapLoader như logic cũ
      const mapData = MapLoader.loadMap(this, "mapData", {
        offsetX: 500,
        offsetY: 0,
        scale: 1,
      });

      this.map = mapData.map;
      this.layer = mapData.layer;
      this.mapData = mapData;

      console.log("✅ Map loaded successfully using MapLoader");

      // Load objects sử dụng challenge data thay vì mapConfig
      const loadedObjects = MapLoader.loadObjects(this, mapData, challengeData);

      // DEBUG: Log loaded objects
      console.log(
        "🔋 DEBUG: Loaded batteries:",
        loadedObjects.batteries.length
      );
      loadedObjects.batteries.forEach((battery, i) => {
        console.log(
          `   Battery ${i}: x=${battery.x}, y=${battery.y}, key=${battery.texture.key}`
        );
      });

      console.log("📦 DEBUG: Loaded boxes:", loadedObjects.boxes.length);
      console.log("🤖 DEBUG: Robot loaded:", !!loadedObjects.robot);

      // Lưu config để sử dụng cho robot direction
      this.objectConfig = challengeData;

      // Lưu references
      this.robot = loadedObjects.robot;

      // Initialize EntityManager trước
      this.entityManager = new EntityManager(this);
      this.entityManager.initialize(
        challengeData,
        loadedObjects.robot,
        loadedObjects.batteries,
        loadedObjects.boxes,
        this.map,
        this.layer
      );

      // Initialize Managers với EntityManager
      this.robotController = new RobotController(this, this.map, this.layer);
      this.robotController.initialize(challengeData, loadedObjects.robot);

      this.batteryManager = new BatteryManager(this);
      this.batteryManager.initialize(this.entityManager);

      this.boxManager = new BoxManager(this);
      console.log(
        `📦 Initializing BoxManager with ${loadedObjects.boxes.length} loaded boxes`
      );
      this.boxManager.initialize(this.entityManager);

      this.inputHandler = new GameInputHandler(this);
      this.uiManager = new GameUIManager(this);
      this.uiManager.initialize();
      // Hiển thị yêu cầu chiến thắng của map
      this.uiManager.showVictoryRequirements();

      // Setup program executor
      this.programExecutor = new ProgramExecutor(this);

      // Setup input
      this.inputHandler.setupInput();

      console.log("✅ Game initialization completed successfully");
    } catch (error) {
      console.error("❌ Failed to initialize game:", error);
      // Tạo UI manager tạm thời để hiển thị lỗi
      this.uiManager = new GameUIManager(this);
      this.uiManager.initialize();
      this.uiManager.showToast("Failed to load game data", "#ff0000");
    }
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
    // Gửi thông báo thua ra webview
    try {
      import("../utils/WebViewMessenger.js").then(({ sendLoseMessage }) => {
        if (typeof sendLoseMessage === "function") {
          sendLoseMessage();
        }
      });
    } catch (e) {
      // ignore
    }
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
      // Chỉ cập nhật UI trạng thái, không kiểm tra thắng/thua
      this.uiManager.updateStatusUI();
    }

    return result;
  }

  /**
   * Đặt box tại vị trí hiện tại của robot
   * @param {number} count - Số lượng box cần đặt
   * @returns {boolean} Success/failure
   */
  putBox(count = 1) {
    const result = this.boxManager.putBox(count);

    if (result) {
      // Cập nhật UI trạng thái
      this.uiManager.updateStatusUI();
      console.log(`📦 Put ${count} box(es) successfully`);
    }

    return result;
  }

  /**
   * Lấy box tại vị trí hiện tại của robot
   * @param {number} count - Số lượng box cần lấy
   * @returns {boolean} Success/failure
   */
  takeBox(count = 1) {
    const result = this.boxManager.takeBox(count);

    if (result) {
      // Cập nhật UI trạng thái
      this.uiManager.updateStatusUI();
      console.log(`📦 Took ${count} box(es) successfully`);
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
