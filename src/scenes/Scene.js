import Phaser from "phaser";
import { MapLoader } from "../utils/MapLoader.js";
import { ProgramExecutor } from "../utils/ProgramExecutor.js";
import { RobotManager } from "../managers/RobotManager.js";
import { BatteryManager } from "../managers/BatteryManager.js";
import { BoxManager } from "../managers/BoxManager.js";
import { GameInputHandler } from "../managers/GameInputHandler.js";
import { GameUIManager } from "../managers/GameUIManager.js";
import {
  createBatteryStatusText,
  updateBatteryStatusText,
  checkAndDisplayVictory,
} from "../utils/VictoryConditions.js";
import { ConfigLoader } from "../utils/ConfigLoader.js";

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

    // Map model - chứa tất cả logic và data của map
    this.mapModel = null;
    this.challengeConfig = null; // Challenge config từ challenge.json

    // Managers
    this.robotManager = null;
    this.batteryManager = null;
    this.boxManager = null;
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
    this.mapKey = data && data.mapKey ? data.mapKey : "default";
  }

  preload() {
    // Load map json từ file map.json
    const mapJsonPath = `assets/maps/map.json`;
    this.load.tilemapTiledJSON(this.mapKey, mapJsonPath);

    // Load example Blockly JSON program
    this.load.json("blockyData", "src/data/blockyData.json");

    // Load tile assets để phù hợp với tileset trong demo1.json
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
    this.load.image("robot_position", "assets/tiles/robot_position.png");

    // Load pin/battery variants
    this.load.image("pin_red", "assets/tiles/pin_red.png");
    this.load.image("pin_yellow", "assets/tiles/pin_yellow.png");
    this.load.image("pin_green", "assets/tiles/pin_green.png");

    // Load other position sprites
    this.load.image("box", "assets/tiles/box.png");
  }

  async create() {
    try {
      // Load map model từ config
      this.mapModel = await ConfigLoader.loadMapModel(this.mapKey);
      // Lưu challenge config để sử dụng trong managers
      this.challengeConfig = await ConfigLoader.loadChallengeConfig();
      console.log(
        `🗺️ Loaded map model: ${this.mapKey}`,
        this.mapModel.getStatistics()
      );

      // Load map visual từ Tiled
      const mapData = MapLoader.loadMap(this, this.mapKey, {
        offsetX: 500,
        offsetY: 0,
        scale: 1,
      });

      this.map = mapData.map;
      this.layer = mapData.layer;
      this.mapData = mapData;

      // Load objects từ map model thay vì hardcode config
      const loadedObjects = this.loadObjectsFromMapModel(mapData);

      // Initialize Managers với map model
      this.initializeManagers(loadedObjects);

      // Start game
      this.mapModel.startGame();

      console.log("✅ Scene created successfully with map model");
    } catch (error) {
      console.error("❌ Failed to create scene:", error);
      // Fallback to old method if model loading fails
      await this.createFallback();
    }
  }

  /**
   * Load objects từ map model thay vì hardcode config
   * @param {Object} mapData - Map data từ MapLoader
   * @returns {Object} Loaded objects
   */
  loadObjectsFromMapModel(mapData) {
    const loadedObjects = {
      robot: null,
      batteries: [],
      boxes: [],
    };

    // Load robot sprite từ model
    const robotModel = this.mapModel.getFirstRobot();
    if (robotModel) {
      loadedObjects.robot = this.createRobotSprite(robotModel, mapData);
    }

    // Load battery sprites từ models
    this.mapModel.getAvailableBatteries().forEach((batteryModel) => {
      const sprite = this.createBatterySprite(batteryModel, mapData);
      if (sprite) {
        sprite.model = batteryModel; // Link sprite với model
        loadedObjects.batteries.push(sprite);
      }
    });

    // Load box sprites từ models
    this.mapModel.getAvailableBoxes().forEach((boxModel) => {
      const sprite = this.createBoxSprite(boxModel, mapData);
      if (sprite) {
        sprite.model = boxModel; // Link sprite với model
        loadedObjects.boxes.push(sprite);
      }
    });

    console.log(`🎮 Loaded objects from models:`, {
      robot: loadedObjects.robot ? 1 : 0,
      batteries: loadedObjects.batteries.length,
      boxes: loadedObjects.boxes.length,
    });

    return loadedObjects;
  }

  /**
   * Tạo robot sprite từ model
   * @param {RobotModel} robotModel - Robot model
   * @param {Object} mapData - Map data
   * @returns {Phaser.GameObjects.Image} Robot sprite
   */
  createRobotSprite(robotModel, mapData) {
    const { position, direction } = robotModel;
    const worldPos = this.getTileWorldCenterFromMapData(
      position.x,
      position.y,
      mapData
    );
    const spriteKey = robotModel.getSpriteKey();

    const robot = this.add.image(worldPos.x, worldPos.y + 30, spriteKey);
    robot.setOrigin(0.5, 1);
    robot.setScale(mapData.scale);
    robot.model = robotModel; // Link sprite với model

    return robot;
  }

  /**
   * Tạo battery sprite từ model
   * @param {BatteryModel} batteryModel - Battery model
   * @param {Object} mapData - Map data
   * @returns {Phaser.GameObjects.Image} Battery sprite
   */
  createBatterySprite(batteryModel, mapData) {
    const { position } = batteryModel;
    const worldPos = this.getTileWorldCenterFromMapData(
      position.x,
      position.y,
      mapData
    );
    const spriteKey = batteryModel.getSpriteKey();

    // Tính vị trí visual nếu có nhiều batteries cùng tile
    const visualPos = batteryModel.calculateVisualPosition(
      this.map.tileWidth * mapData.scale,
      this.map.tileHeight * mapData.scale,
      worldPos.x,
      worldPos.y
    );

    const battery = this.add.image(visualPos.x, visualPos.y + 10, spriteKey);
    battery.setOrigin(0.5, 1);
    battery.setScale(mapData.scale);
    battery.setDepth(battery.y + 50); // Depth cao hơn robot

    return battery;
  }

  /**
   * Tạo box sprite từ model
   * @param {BoxModel} boxModel - Box model
   * @param {Object} mapData - Map data
   * @returns {Phaser.GameObjects.Image} Box sprite
   */
  createBoxSprite(boxModel, mapData) {
    const { position } = boxModel;
    const worldPos = this.getTileWorldCenterFromMapData(
      position.x,
      position.y,
      mapData
    );
    const spriteKey = boxModel.getSpriteKey();

    // Tính vị trí visual nếu có nhiều boxes cùng tile
    const visualPos = boxModel.calculateVisualPosition(
      this.map.tileWidth * mapData.scale,
      this.map.tileHeight * mapData.scale,
      worldPos.x,
      worldPos.y
    );

    const box = this.add.image(visualPos.x, visualPos.y + 10, spriteKey);
    box.setOrigin(0.5, 1);
    box.setScale(mapData.scale);

    return box;
  }

  /**
   * Lấy world center của tile từ map data
   * @param {number} tileX - Tile X
   * @param {number} tileY - Tile Y
   * @param {Object} mapData - Map data
   * @returns {Object} {x, y} world coordinates
   */
  getTileWorldCenterFromMapData(tileX, tileY, mapData) {
    const worldPoint = mapData.layer.tileToWorldXY(tileX, tileY);
    const centerX = worldPoint.x + (mapData.map.tileWidth * mapData.scale) / 2;
    const centerY = worldPoint.y + (mapData.map.tileHeight * mapData.scale) / 2;
    return { x: centerX, y: centerY };
  }

  /**
   * Initialize managers với loaded objects
   * @param {Object} loadedObjects - Loaded objects
   */
  initializeManagers(loadedObjects) {
    // Lưu robot reference
    this.robot = loadedObjects.robot;

    // Initialize RobotManager với model
    this.robotManager = new RobotManager(
      this,
      this.robot,
      this.map,
      this.layer
    );
    // Pass map model thay vì object config
    this.robotManager.initializeWithModel(this.mapModel);

    // Initialize BatteryManager với models
    this.batteryManager = new BatteryManager(this);
    this.batteryManager.initializeWithModels(
      this.robotManager,
      this.mapModel,
      loadedObjects.batteries
    );

    // Initialize BoxManager với models
    this.boxManager = new BoxManager(this);
    this.boxManager.initializeWithModels(
      this.robotManager,
      this.mapModel,
      loadedObjects.boxes
    );

    // Initialize UI và input handlers
    this.inputHandler = new GameInputHandler(this);
    this.uiManager = new GameUIManager(this);
    this.uiManager.initialize();
    this.uiManager.showVictoryRequirements();

    // Setup program executor
    this.programExecutor = new ProgramExecutor(this);

    // Setup input
    this.inputHandler.setupInput();
  }

  /**
   * Fallback method nếu model loading thất bại
   */
  async createFallback() {
    console.warn("⚠️ Using fallback creation method");

    // Load map sử dụng MapLoader (old method)
    const mapData = MapLoader.loadMap(this, this.mapKey, {
      offsetX: 500,
      offsetY: 0,
      scale: 1,
    });

    this.map = mapData.map;
    this.layer = mapData.layer;
    this.mapData = mapData;

    // Load challenge config thay vì objectConfig
    try {
      const challengeConfig = await ConfigLoader.loadChallengeConfig();
      this.challengeConfig = challengeConfig;

      const loadedObjects = MapLoader.loadObjects(
        this,
        mapData,
        challengeConfig
      );

      this.robot = loadedObjects.robot;

      // Initialize Managers với challenge config
      this.robotManager = new RobotManager(
        this,
        this.robot,
        this.map,
        this.layer
      );
      this.robotManager.initialize(challengeConfig);

      this.batteryManager = new BatteryManager(this);
      this.batteryManager.initialize(
        this.robotManager,
        challengeConfig,
        loadedObjects.batteries
      );

      this.boxManager = new BoxManager(this);
      this.boxManager.initialize(
        this.robotManager,
        challengeConfig,
        loadedObjects.boxes
      );

      this.inputHandler = new GameInputHandler(this);
      this.uiManager = new GameUIManager(this);
      this.uiManager.initialize();
      this.uiManager.showVictoryRequirements();

      this.programExecutor = new ProgramExecutor(this);
      this.inputHandler.setupInput();
    } catch (error) {
      console.error("❌ Failed to load challenge config in fallback:", error);
      // Nếu không load được challenge config, tạo empty config
      this.challengeConfig = { boxes: [], batteries: [], robot: {} };
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
    return this.robotManager.moveForward();
  }

  /**
   * Quay trái 90 độ
   * @returns {boolean} Success/failure
   */
  turnLeft() {
    return this.robotManager.turnLeft();
  }

  /**
   * Quay phải 90 độ
   * @returns {boolean} Success/failure
   */
  turnRight() {
    return this.robotManager.turnRight();
  }

  /**
   * Quay lại sau lưng 180 độ
   * @returns {boolean} Success/failure
   */
  turnBack() {
    return this.robotManager.turnBack();
  }

  /**
   * Lấy vị trí tile hiện tại của robot
   * @returns {Object} {x, y} tile coordinates
   */
  getCurrentTilePosition() {
    return this.robotManager.getCurrentTilePosition();
  }

  /**
   * Lấy key của tile hiện tại (dùng cho battery tracking)
   * @returns {string} Tile key format: "x,y"
   */
  getCurrentTileKey() {
    return this.robotManager.getCurrentTileKey();
  }

  /**
   * Lấy world center của tile
   * @param {number} tileX
   * @param {number} tileY
   * @returns {Object} {x, y} world coordinates
   */
  getTileWorldCenter(tileX, tileY) {
    return this.robotManager.getTileWorldCenter(tileX, tileY);
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
    if (this.mapModel && this.robotManager) {
      const robotPos = this.robotManager.getCurrentTilePosition();
      return {
        key: `${robotPos.x},${robotPos.y}`,
        models: this.mapModel.getBatteriesAtPosition(robotPos.x, robotPos.y),
        sprites: this.batteryManager
          ? this.batteryManager.getBatteriesAtCurrentTile().sprites || []
          : [],
        types: this.mapModel
          .getBatteriesAtPosition(robotPos.x, robotPos.y)
          .map((b) => b.color),
        count: this.mapModel.getBatteriesAtPosition(robotPos.x, robotPos.y)
          .length,
      };
    }

    // Fallback to old method
    return this.batteryManager
      ? this.batteryManager.getBatteriesAtCurrentTile()
      : { key: "", sprites: [], types: [], count: 0 };
  }

  /**
   * Thu thập 1 pin tại vị trí hiện tại của robot (ưu tiên theo màu nếu truyền vào)
   * @param {string} [preferredColor] - "red" | "yellow" | "green"
   * @returns {number} 1 nếu thu thập thành công, 0 nếu không có pin phù hợp
   */
  collectBattery(preferredColor) {
    if (this.mapModel && this.robotManager) {
      const robotPos = this.robotManager.getCurrentTilePosition();
      const robotModel = this.mapModel.getFirstRobot();
      const batteriesAtPos = this.mapModel.getBatteriesAtPosition(
        robotPos.x,
        robotPos.y
      );

      // Tìm battery phù hợp với màu yêu cầu
      let targetBattery = null;
      if (preferredColor) {
        targetBattery = batteriesAtPos.find(
          (b) => b.color === preferredColor && b.isAvailable()
        );
      } else {
        targetBattery = batteriesAtPos.find((b) => b.isAvailable());
      }

      if (!targetBattery) {
        this.lose(
          `Không có pin ${preferredColor || "phù hợp"} tại ô (${robotPos.x}, ${
            robotPos.y
          })`
        );
        return 0;
      }

      // Thu thập battery
      const success = targetBattery.collect(robotModel.id);
      if (success) {
        // Cập nhật robot inventory
        robotModel.addBattery(targetBattery.color);

        // Ẩn sprite tương ứng
        if (this.batteryManager) {
          this.batteryManager.hideBatterySprite(targetBattery);
        }

        // Cập nhật UI
        if (this.uiManager) {
          this.uiManager.updateStatusUI();
        }

        console.log(
          `🔋 Collected ${targetBattery.color} battery at (${robotPos.x}, ${robotPos.y})`
        );
        return 1;
      }

      return 0;
    }

    // Fallback to old method
    const result = this.batteryManager
      ? this.batteryManager.collectBattery(preferredColor)
      : 0;
    if (result > 0 && this.uiManager) {
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
