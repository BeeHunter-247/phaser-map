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
import { ActionExecutor } from "../utils/ActionExecutor.js";

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

    // Physical robot system
    this.actionExecutor = null;
    this.physicalRobotMode = false; // true = physical robot mode, false = code execution mode

    // Game state tracking
    this.gameState = "ready"; // "ready", "playing", "lost", "won"
  }

  /**
   * Receive params when starting the scene
   * @param {{ mapJson?: Object, challengeJson?: Object }} data
   */
  init(data) {
    this.mapJson = data && data.mapJson ? data.mapJson : null;
    this.challengeJson = data && data.challengeJson ? data.challengeJson : null;

    // Reset game state when restarting
    this.gameState = "ready";
  }

  preload() {
    // Load tile assets
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

  async create() {
    try {
      // Chỉ hoạt động với data từ webview
      if (!this.challengeJson || !this.mapJson) {
        throw new Error(
          "Scene requires mapJson and challengeJson from webview"
        );
      }

      // Load map model từ webview data
      this.mapModel = await this.loadMapModelFromWebview();
      this.challengeConfig = this.challengeJson;

      console.log(`🗺️ Loaded map model`, this.mapModel.getStatistics());

      // Load map visual từ Tiled
      const mapData = MapLoader.loadMap(
        this,
        {
          offsetX: 500,
          offsetY: 0,
          scale: 1,
        },
        this.mapJson
      );

      this.map = mapData.map;
      this.layer = mapData.layer;
      this.mapData = mapData;

      // Load objects từ map model thay vì hardcode config
      const loadedObjects = this.loadObjectsFromMapModel(mapData);

      // Initialize Managers với map model
      this.initializeManagers(loadedObjects);

      // Initialize ActionExecutor for physical robot mode
      this.initializeActionExecutor();

      // Start game
      this.mapModel.startGame();
      this.gameState = "ready"; // Reset game state when creating new scene

      console.log("✅ Scene created successfully with webview data");
    } catch (error) {
      console.error("❌ Failed to create scene:", error);
      this.showLoadingScreen("Loading data");
    }
  }

  /**
   * Load map model từ webview data
   * @returns {Promise<MapModel>} Map model instance
   */
  async loadMapModelFromWebview() {
    try {
      // Sử dụng ConfigLoader để tạo map model từ webview data
      return await ConfigLoader.loadMapModel(this.mapJson, this.challengeJson);
    } catch (error) {
      console.error("❌ Failed to load map model from webview:", error);
      throw error;
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
   * Show loading screen khi chưa có dữ liệu từ webview
   * @param {string} message - Loading message
   */
  showLoadingScreen(message = "Loading data") {
    console.log("🔄 Showing loading screen:", message);

    // Set background màu trắng
    this.cameras.main.setBackgroundColor("#F3F5F2");

    // Tạo container cho loading content
    const loadingContainer = this.add.container(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2
    );

    // Tạo robot sprite ở giữa màn hình
    const robot = this.add.image(0, -50, "robot_east");
    robot.setOrigin(0.5, 0.5);
    robot.setScale(1);
    loadingContainer.add(robot);

    // Tạo animation robot chạy
    this.tweens.add({
      targets: robot,
      x: 50,
      duration: 1000,
      ease: "Power2",
      yoyo: true,
      repeat: -1,
    });

    // Tạo loading text
    const loadingText = this.add.text(0, 50, message, {
      fontSize: "20px",
      color: "#333333",
      align: "center",
      fontFamily: "Arial, sans-serif",
    });
    loadingText.setOrigin(0.5);
    loadingContainer.add(loadingText);

    // Tạo dots animation
    const dotsText = this.add.text(0, 80, "...", {
      fontSize: "24px",
      color: "#666666",
      align: "center",
    });
    dotsText.setOrigin(0.5);
    loadingContainer.add(dotsText);

    // Animation cho dots
    this.tweens.add({
      targets: dotsText,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    // Lưu reference để có thể xóa sau
    this.loadingScreen = loadingContainer;

    // Gửi loading status ra webview nếu có thể
    try {
      import("../utils/WebViewMessenger.js").then(({ sendLoadingStatus }) => {
        if (typeof sendLoadingStatus === "function") {
          sendLoadingStatus({
            type: "SCENE_LOADING",
            message: message,
            details: {
              hasMapJson: !!this.mapJson,
              hasChallengeJson: !!this.challengeJson,
            },
          });
        }
      });
    } catch (e) {
      // ignore webview communication errors
    }
  }

  /**
   * Hide loading screen
   */
  hideLoadingScreen() {
    if (this.loadingScreen) {
      this.loadingScreen.destroy();
      this.loadingScreen = null;
    }
  }

  /**
   * Show error message khi không thể load scene (fallback)
   * @param {string} message - Error message
   */
  showErrorMessage(message) {
    console.error("❌ Scene Error:", message);

    // Thay vì hiển thị error message, hiển thị loading screen đẹp hơn
    this.showLoadingScreen("Loading data");

    // Gửi error message ra webview nếu có thể
    try {
      import("../utils/WebViewMessenger.js").then(({ sendErrorMessage }) => {
        if (typeof sendErrorMessage === "function") {
          sendErrorMessage({
            type: "SCENE_INIT_ERROR",
            message: message,
            details: {
              hasMapJson: !!this.mapJson,
              hasChallengeJson: !!this.challengeJson,
            },
          });
        }
      });
    } catch (e) {
      // ignore webview communication errors
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

  // (Removed) showBanner: No longer used; FE/MB handle messages via webview

  /**
   * Thua cuộc với lý do cụ thể
   */
  lose(reason) {
    this.gameState = "lost";
    // Skip showing in-Phaser lose banner; handled by FE/MB via webview message
    // Gửi thông báo thua ra webview
    try {
      import("../utils/WebViewMessenger.js").then(({ sendLoseMessage }) => {
        if (typeof sendLoseMessage === "function") {
          const loseData = {
            reason: "Game Over",
            message: reason || "Mission failed!",
            details: {},
          };
          sendLoseMessage(loseData);
        }
      });
    } catch (e) {
      // ignore
    }
    if (this.programExecutor) {
      this.programExecutor.stopProgram();
    }
  }

  /**
   * Chiến thắng với lý do cụ thể
   */
  win(reason) {
    this.gameState = "won";
    // Skip showing in-Phaser win banner; handled by FE/MB via webview message
    // Gửi thông báo thắng ra webview
    try {
      import("../utils/WebViewMessenger.js").then(({ sendVictoryMessage }) => {
        if (typeof sendVictoryMessage === "function") {
          const victoryData = {
            reason: reason || "VICTORY",
            message: typeof reason === "string" ? reason : "Victory!",
            details: {},
          };
          sendVictoryMessage(victoryData);
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
      const result = targetBattery.collect(robotModel.id);
      if (result.success) {
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
      } else if (result.gameOver) {
        // Nếu thu thập battery không được phép, game over
        this.lose(result.message);
        return 0;
      } else {
        // Lỗi khác
        this.lose(result.message);
        return 0;
      }
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

    // Kiểm tra trạng thái game trước khi load program
    if (this.gameState === "lost" || this.gameState === "won") {
      console.warn("⚠️ Cannot load program: Game is in lost or won state");
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

    // Kiểm tra trạng thái game trước khi bắt đầu
    if (this.gameState === "lost" || this.gameState === "won") {
      console.warn("⚠️ Cannot start program: Game is in lost or won state");
      return false;
    }

    const success = this.programExecutor.startProgram();
    if (success) {
      this.programMode = true;
      this.gameState = "playing";
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
   * Load chương trình từ webview hoặc tạo demo program
   * @param {Object} programData - Program data từ webview
   */
  loadExampleProgram(programData = null) {
    // Kiểm tra trạng thái game trước khi load program
    if (this.gameState === "lost" || this.gameState === "won") {
      console.warn("⚠️ Cannot load program: Game is in lost or won state");
      return false;
    }

    // Sử dụng program từ webview hoặc tạo demo program
    const exampleProgram = programData || {
      version: "1.0.0",
      programName: "user_program",
      actions: [
        {
          type: "repeat",
          count: 4,
          body: [
            { type: "forward", count: 1 },
            {
              type: "if",
              cond: {
                type: "and",
                conditions: [
                  {
                    type: "variableComparison",
                    variable: "batteryCount",
                    operator: "==",
                    value: 2,
                  },
                  {
                    type: "condition",
                    function: "isGreen",
                    check: true,
                  },
                ],
              },
              then: [{ type: "collect", color: "green", count: 2 }],
            },
          ],
        },
      ],
    };

    console.log("📋 Loading program...");
    const success = this.loadProgram(exampleProgram);

    if (success) {
      console.log("✅ Program loaded! Starting execution automatically...");
      if (!programData) {
        console.log("🎯 Demo program will:");
        console.log("   1. Turn right");
        console.log("   2. Move forward 2 steps");
        console.log("   3. Collect 1 green battery");
      }

      // Tự động bắt đầu thực thi chương trình
      setTimeout(() => {
        this.startProgram();
      }, 500); // Delay 0.5 giây để user có thể đọc thông tin
    }

    return success;
  }

  /**
   * Khởi tạo ActionExecutor cho physical robot mode
   */
  initializeActionExecutor() {
    try {
      this.actionExecutor = new ActionExecutor(this);

      if (
        this.mapModel &&
        this.robotManager &&
        this.batteryManager &&
        this.boxManager
      ) {
        this.actionExecutor.initialize(
          this.mapModel.getFirstRobot(),
          this.batteryManager,
          this.boxManager,
          this.mapModel
        );
        console.log("🤖 ActionExecutor initialized successfully");
      } else {
        console.warn(
          "⚠️ ActionExecutor initialized but some managers not ready"
        );
      }
    } catch (error) {
      console.error("❌ Failed to initialize ActionExecutor:", error);
    }
  }

  /**
   * Thực thi actions từ robot vật lý
   * @param {Array} actions - List actions từ robot
   * @returns {Promise<Object>} Kết quả thắng/thua
   */
  async executePhysicalRobotActions(actions) {
    if (!this.actionExecutor) {
      console.error("❌ ActionExecutor not initialized");
      return {
        isVictory: false,
        message: "ActionExecutor not initialized",
        error: "ActionExecutor not available",
      };
    }

    if (!Array.isArray(actions) || actions.length === 0) {
      console.error("❌ No actions provided");
      return {
        isVictory: false,
        message: "No actions provided",
        error: "Invalid actions array",
      };
    }

    console.log(
      `🤖 Starting physical robot execution with ${actions.length} actions`
    );

    try {
      // Set physical robot mode
      this.physicalRobotMode = true;
      this.gameState = "playing";

      const result = await this.actionExecutor.executeActions(actions);

      // Update game state based on result
      if (result.isVictory) {
        this.gameState = "won";
        console.log("🏆 Physical robot completed successfully!");
      } else {
        this.gameState = "lost";
        console.log("❌ Physical robot failed to complete challenge");
      }

      return result;
    } catch (error) {
      console.error("❌ Physical robot execution failed:", error);
      this.gameState = "lost";

      return {
        isVictory: false,
        message: `Execution failed: ${error.message}`,
        error: error,
        step: 0,
        totalSteps: actions.length,
      };
    } finally {
      this.physicalRobotMode = false;
    }
  }

  /**
   * Kiểm tra có đang ở physical robot mode không
   * @returns {boolean}
   */
  isPhysicalRobotMode() {
    return this.physicalRobotMode;
  }

  /**
   * Lấy trạng thái ActionExecutor
   * @returns {Object|null}
   */
  getActionExecutorStatus() {
    if (!this.actionExecutor) {
      return null;
    }

    return {
      initialized: !!(
        this.actionExecutor.robotModel &&
        this.actionExecutor.batteryManager &&
        this.actionExecutor.boxManager
      ),
      robotModel: !!this.actionExecutor.robotModel,
      batteryManager: !!this.actionExecutor.batteryManager,
      boxManager: !!this.actionExecutor.boxManager,
      mapModel: !!this.actionExecutor.mapModel,
    };
  }

  update() {
    // Update logic if needed
  }
}
