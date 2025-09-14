/**
 * InputManager - Quản lý input từ bàn phím (Gộp từ InputManager và GameInputHandler)
 *
 * Trách nhiệm:
 * - Xử lý keyboard input
 * - Delegate commands cho GameManager
 * - Quản lý input states
 * - Setup program controls
 */
export class InputManager {
  constructor(scene) {
    this.scene = scene;
    this.gameManager = null;
    this.isInputEnabled = true;
  }

  /**
   * Khởi tạo input manager
   * @param {GameManager} gameManager - GameManager instance
   */
  initialize(gameManager) {
    this.gameManager = gameManager;
    this.setupKeyboardInput();
    console.log("✅ InputManager: Initialized");
  }

  /**
   * Setup keyboard input
   */
  setupKeyboardInput() {
    // Arrow keys cho robot movement
    this.scene.input.keyboard.on("keydown-UP", () => {
      if (this.isInputEnabled) {
        this.gameManager.moveForward();
      }
    });

    this.scene.input.keyboard.on("keydown-LEFT", () => {
      if (this.isInputEnabled) {
        this.gameManager.turnLeft();
      }
    });

    this.scene.input.keyboard.on("keydown-RIGHT", () => {
      if (this.isInputEnabled) {
        this.gameManager.turnRight();
      }
    });

    // Space bar cho collect battery
    this.scene.input.keyboard.on("keydown-SPACE", () => {
      if (this.isInputEnabled) {
        this.gameManager.collectBattery();
      }
    });

    // Các phím chức năng
    this.scene.input.keyboard.on("keydown-L", () => {
      if (this.isInputEnabled) {
        this.gameManager.loadExampleProgram();
      }
    });

    this.scene.input.keyboard.on("keydown-P", () => {
      if (this.isInputEnabled) {
        this.gameManager.toggleProgram();
      }
    });

    this.scene.input.keyboard.on("keydown-R", () => {
      if (this.isInputEnabled) {
        this.gameManager.restart();
      }
    });

    // Phím B cho push box
    this.scene.input.keyboard.on("keydown-B", () => {
      if (this.isInputEnabled) {
        this.gameManager.pushBox();
      }
    });

    // Setup program controls (từ GameInputHandler)
    this.setupProgramControls();

    console.log("✅ InputManager: Keyboard input setup completed");
  }

  /**
   * Setup program controls (từ GameInputHandler)
   */
  setupProgramControls() {
    // Chỉ giữ lại các phím điều khiển chương trình
    this.scene.input.keyboard.on("keydown", (event) => {
      switch (event.code) {
        case "KeyP":
          if (this.scene.programMode) {
            this.scene.pauseProgram();
          } else {
            this.scene.resumeProgram();
          }
          break;

        case "KeyR":
          // Restart current scene (reload map)
          if (this.scene && this.scene.scene) {
            this.scene.scene.restart();
          }
          break;

        case "KeyL":
          // Load example program (auto-starts)
          this.scene.loadExampleProgram();
          break;
      }
    });

    // Log controls khi khởi tạo
    console.log("🎮 Robot Program Controls:");
    console.log("  L   : Load & Auto-Start Example Program");
    console.log("  P   : Pause/Resume Program");
    console.log("  R   : Restart (reload current map)");
    console.log("");
    console.log("📋 To load custom program, use:");
    console.log("  scene.loadProgram(yourProgramData, true)  // Auto-start");
    console.log("  scene.loadProgram(yourProgramData)        // Manual start");
    console.log("");
  }

  /**
   * Enable/disable input
   * @param {boolean} enabled - Có enable input không
   */
  setInputEnabled(enabled) {
    this.isInputEnabled = enabled;
    console.log(`✅ InputManager: Input ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Lấy trạng thái input
   * @returns {boolean}
   */
  isInputActive() {
    return this.isInputEnabled;
  }

  /**
   * Xử lý input cho chương trình
   * @param {string} command - Lệnh cần thực thi
   * @returns {boolean} Thành công hay không
   */
  executeCommand(command) {
    if (!this.isInputEnabled) {
      return false;
    }

    switch (command.toLowerCase()) {
      case "moveforward":
      case "forward":
        return this.gameManager.moveForward();

      case "turnleft":
      case "left":
        return this.gameManager.turnLeft();

      case "turnright":
      case "right":
        return this.gameManager.turnRight();

      case "collectbattery":
      case "collect":
        return this.gameManager.collectBattery();

      case "pushbox":
      case "push":
        return this.gameManager.pushBox();

      default:
        console.warn(`⚠️ InputManager: Unknown command: ${command}`);
        return false;
    }
  }

  /**
   * Cleanup input listeners
   */
  destroy() {
    this.scene.input.keyboard.removeAllListeners();
    console.log("✅ InputManager: Cleaned up input listeners");
  }
}
