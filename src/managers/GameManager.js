import { GameState } from "../models/GameState.js";
import { Challenge } from "../models/Challenge.js";
import { MapLoader } from "../utils/MapLoader.js";
import { VictoryChecker } from "../utils/VictoryChecker.js";
import { RobotManager } from "./RobotManager.js";
import { BatteryManager } from "./BatteryManager.js";
import { BoxManager } from "./BoxManager.js";
import { InputManager } from "./InputManager.js";
import { UIManager } from "./UIManager.js";
import { ProgramManager } from "./ProgramManager.js";

/**
 * GameManager - Quản lý tổng thể game
 *
 * Trách nhiệm:
 * - Khởi tạo và quản lý tất cả managers
 * - Điều phối giữa các components
 * - Xử lý game flow chính
 * - Cung cấp interface đơn giản cho Scene
 */
export class GameManager {
  constructor(scene) {
    this.scene = scene;
    this.gameState = new GameState();
    this.challenge = null;
    this.managers = new Map();

    // Map và layer references
    this.map = null;
    this.layer = null;
    this.mapData = null;
  }

  /**
   * Khởi tạo game
   */
  async initialize() {
    try {
      console.log("🚀 GameManager: Starting initialization...");

      // 1. Load và parse data
      await this.loadGameData();

      // 2. Initialize map
      this.initializeMap();

      // 3. Initialize managers
      this.initializeManagers();

      // 4. Setup UI
      this.setupUI();

      console.log("✅ GameManager: Initialization completed successfully");
    } catch (error) {
      console.error("❌ GameManager: Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * Load dữ liệu game từ cache
   */
  async loadGameData() {
    const challengeData = this.scene.cache.json.get("challengeData");
    if (!challengeData) {
      throw new Error("Failed to load challenge data from cache");
    }

    this.challenge = new Challenge(challengeData);
    console.log(
      "✅ GameManager: Challenge data loaded:",
      this.challenge.getSummary()
    );
  }

  /**
   * Khởi tạo map
   */
  initializeMap() {
    const mapData = MapLoader.loadMap(this.scene, "mapData", {
      offsetX: 500,
      offsetY: 0,
      scale: 1,
    });

    this.map = mapData.map;
    this.layer = mapData.layer;
    this.mapData = mapData;

    console.log("✅ GameManager: Map loaded successfully");
  }

  /**
   * Khởi tạo tất cả managers
   */
  initializeManagers() {
    // Load objects từ map và challenge
    const loadedObjects = MapLoader.loadObjects(
      this.scene,
      this.mapData,
      this.challenge
    );

    // Initialize robot position trong gameState
    const robotPos = this.challenge.getRobotPosition();
    this.gameState.updateRobotPosition(robotPos.x, robotPos.y);
    this.gameState.updateRobotDirection(this.challenge.getRobotDirection());

    // Initialize managers
    this.managers.set(
      "robot",
      new RobotManager(this.scene, this.map, this.layer)
    );
    this.managers.set("battery", new BatteryManager(this.scene));
    this.managers.set("box", new BoxManager(this.scene));
    this.managers.set("input", new InputManager(this.scene));
    this.managers.set("ui", new UIManager(this.scene));
    this.managers.set("program", new ProgramManager(this.scene));

    // Initialize từng manager
    this.managers
      .get("robot")
      .initialize(this.challenge, loadedObjects.robot, this.gameState);
    this.managers
      .get("battery")
      .initialize(loadedObjects.batteries, this.gameState);
    this.managers.get("box").initialize(loadedObjects.boxes, this.gameState);
    this.managers.get("input").initialize(this);
    this.managers.get("ui").initialize(this.gameState, this.challenge);
    this.managers.get("program").initialize(this.gameState);

    console.log("✅ GameManager: All managers initialized");
  }

  /**
   * Setup UI
   */
  setupUI() {
    this.managers.get("ui").showVictoryRequirements();
    this.managers.get("ui").updateBatteryStatus();
  }

  // ===== DELEGATE METHODS =====

  /**
   * Robot di chuyển tiến
   * @returns {boolean} Thành công hay không
   */
  moveForward() {
    const result = this.managers.get("robot").moveForward();
    if (result) {
      this.checkVictory();
    }
    return result;
  }

  /**
   * Robot rẽ trái
   * @returns {boolean} Thành công hay không
   */
  turnLeft() {
    return this.managers.get("robot").turnLeft();
  }

  /**
   * Robot rẽ phải
   * @returns {boolean} Thành công hay không
   */
  turnRight() {
    return this.managers.get("robot").turnRight();
  }

  /**
   * Robot thu thập pin
   * @returns {boolean} Thành công hay không
   */
  collectBattery() {
    const result = this.managers.get("battery").collectBattery();
    if (result) {
      this.checkVictory();
    }
    return result;
  }

  /**
   * Robot đẩy hộp
   * @returns {boolean} Thành công hay không
   */
  pushBox() {
    return this.managers.get("box").pushBox();
  }

  /**
   * Toggle chế độ chương trình
   */
  toggleProgram() {
    this.managers.get("program").toggleProgram();
  }

  /**
   * Load chương trình mẫu
   */
  loadExampleProgram() {
    this.managers.get("program").loadExampleProgram();
  }

  /**
   * Restart game
   */
  restart() {
    this.gameState.reset();
    this.scene.scene.restart();
  }

  /**
   * Kiểm tra điều kiện thắng
   */
  checkVictory() {
    if (VictoryChecker.checkVictory(this.gameState, this.challenge)) {
      this.gameState.setGameWon();
      this.managers.get("ui").showVictoryMessage();
      this.managers.get("program").stopProgram();
    }
  }

  /**
   * Lấy trạng thái game hiện tại
   * @returns {Object}
   */
  getGameStatus() {
    return {
      robotPosition: this.gameState.robotPosition,
      robotDirection: this.gameState.robotDirection,
      collectedBatteries: this.gameState.getCollectedBatteries(),
      isProgramRunning: this.gameState.isProgramRunning,
      isGameWon: this.gameState.isGameWon,
      isGameLost: this.gameState.isGameLost,
    };
  }

  /**
   * Lấy manager theo tên
   * @param {string} name - Tên manager
   * @returns {Object|null}
   */
  getManager(name) {
    return this.managers.get(name) || null;
  }

  /**
   * Lấy game state
   * @returns {GameState}
   */
  getGameState() {
    return this.gameState;
  }

  /**
   * Lấy challenge
   * @returns {Challenge}
   */
  getChallenge() {
    return this.challenge;
  }
}
