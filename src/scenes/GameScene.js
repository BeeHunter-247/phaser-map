import Phaser from "phaser";
import { GameManager } from "../managers/GameManager.js";

/**
 * GameScene - Scene chính của game (simplified)
 *
 * Trách nhiệm:
 * - Load assets
 * - Khởi tạo GameManager
 * - Delegate tất cả logic cho GameManager
 * - Cung cấp interface đơn giản cho Phaser
 */
export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.gameManager = null;
  }

  init(data) {
    this.useBackend = data && data.useBackend ? data.useBackend : false;
    this.webviewData = data && data.webviewData ? data.webviewData : null;
  }

  preload() {
    // Load map data
    this.load.tilemapTiledJSON("mapData", "src/data/map.json");
    this.load.json("challengeData", "src/data/challenge.json");
    this.load.json("blockyData", "src/data/blockyData.json");

    // Load tile images
    this.load.image("wood", "assets/tiles/wood.png");
    this.load.image("road_h", "assets/tiles/road_h.png");
    this.load.image("road_v", "assets/tiles/road_v.png");
    this.load.image("water", "assets/tiles/water.png");
    this.load.image("grass", "assets/tiles/grass.png");
    this.load.image("crossroad", "assets/tiles/crossroad.png");

    // Load robot images
    this.load.image("robot_north", "assets/tiles/robot_north.png");
    this.load.image("robot_east", "assets/tiles/robot_east.png");
    this.load.image("robot_south", "assets/tiles/robot_south.png");
    this.load.image("robot_west", "assets/tiles/robot_west.png");

    // Load battery images
    this.load.image("pin_red", "assets/tiles/pin_red.png");
    this.load.image("pin_yellow", "assets/tiles/pin_yellow.png");
    this.load.image("pin_green", "assets/tiles/pin_green.png");

    // Load box image
    this.load.image("box", "assets/tiles/box.png");
  }

  async create() {
    try {
      console.log("🚀 GameScene: Starting game initialization...");

      // Khởi tạo GameManager
      this.gameManager = new GameManager(this);
      await this.gameManager.initialize();

      console.log("✅ GameScene: Game initialization completed successfully");
    } catch (error) {
      console.error("❌ GameScene: Failed to initialize game:", error);
      this.showError("Failed to load game data");
    }
  }

  update() {
    // Update UI nếu có GameManager
    if (this.gameManager) {
      const uiManager = this.gameManager.getManager("ui");
      if (uiManager) {
        uiManager.update();
      }
    }
  }

  // ===== DELEGATE METHODS TO GAMEMANAGER =====

  moveForward() {
    return this.gameManager ? this.gameManager.moveForward() : false;
  }

  turnLeft() {
    return this.gameManager ? this.gameManager.turnLeft() : false;
  }

  turnRight() {
    return this.gameManager ? this.gameManager.turnRight() : false;
  }

  collectBattery() {
    return this.gameManager ? this.gameManager.collectBattery() : false;
  }

  pushBox() {
    return this.gameManager ? this.gameManager.pushBox() : false;
  }

  toggleProgram() {
    if (this.gameManager) {
      this.gameManager.toggleProgram();
    }
  }

  loadExampleProgram() {
    if (this.gameManager) {
      this.gameManager.loadExampleProgram();
    }
  }

  restart() {
    if (this.gameManager) {
      this.gameManager.restart();
    } else {
      this.scene.restart();
    }
  }

  // ===== UTILITY METHODS =====

  getGameStatus() {
    return this.gameManager ? this.gameManager.getGameStatus() : null;
  }

  getGameState() {
    return this.gameManager ? this.gameManager.getGameState() : null;
  }

  getChallenge() {
    return this.gameManager ? this.gameManager.getChallenge() : null;
  }

  showError(message) {
    console.error("❌ GameScene Error:", message);
    // Có thể thêm UI error message ở đây
  }

  // ===== CLEANUP =====

  destroy() {
    if (this.gameManager) {
      // Cleanup các managers
      const managers = ["robot", "battery", "box", "input", "ui", "program"];
      managers.forEach((name) => {
        const manager = this.gameManager.getManager(name);
        if (manager && manager.destroy) {
          manager.destroy();
        }
      });
    }

    super.destroy();
    console.log("✅ GameScene: Cleaned up");
  }
}
