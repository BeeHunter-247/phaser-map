/**
 * GameInputHandler - Quản lý input và controls
 *
 * Tách từ Scene.js để tách biệt trách nhiệm
 * Xử lý tất cả keyboard input và controls
 */
export class GameInputHandler {
  constructor(scene) {
    this.scene = scene;
  }

  /**
   * Setup keyboard input controls
   */
  setupInput() {
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
            const currentMapKey = this.scene.mapKey;
            this.scene.scene.restart({ mapKey: currentMapKey });
          }
          break;

        case "KeyL":
          // Load example program (auto-starts) - chỉ khi game chưa thua và chưa thắng
          if (
            this.scene.gameState !== "lost" &&
            this.scene.gameState !== "won"
          ) {
            this.scene.loadExampleProgram();
          } else {
            console.warn(
              "⚠️ Cannot load program: Game is in lost or won state"
            );
          }
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
    console.log(
      "  scene.startProgram()                      // Start manually"
    );
  }

  /**
   * Xử lý keydown event
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyDown(event) {
    switch (event.code) {
      case "KeyP":
        if (this.scene.programMode) {
          this.scene.pauseProgram();
        } else {
          this.scene.resumeProgram();
        }
        break;

      case "KeyR":
        if (this.scene && this.scene.scene) {
          const currentMapKey = this.scene.mapKey;
          this.scene.scene.restart({ mapKey: currentMapKey });
        }
        break;

      case "KeyL":
        // Load example program - chỉ khi game chưa thua và chưa thắng
        if (this.scene.gameState !== "lost" && this.scene.gameState !== "won") {
          this.scene.loadExampleProgram();
        } else {
          console.warn("⚠️ Cannot load program: Game is in lost or won state");
        }
        break;

      default:
        // Có thể thêm các phím khác ở đây
        break;
    }
  }

  /**
   * Thêm custom key binding
   * @param {string} keyCode - Key code (e.g., "KeySpace")
   * @param {Function} callback - Function to call when key is pressed
   */
  addKeyBinding(keyCode, callback) {
    this.scene.input.keyboard.on("keydown", (event) => {
      if (event.code === keyCode) {
        callback();
      }
    });
  }

  /**
   * Xóa tất cả key bindings
   */
  clearKeyBindings() {
    this.scene.input.keyboard.removeAllListeners();
  }

  /**
   * Lấy danh sách controls hiện tại
   * @returns {Array} Array of control descriptions
   */
  getControlsList() {
    return [
      "L   : Load & Auto-Start Example Program",
      "P   : Pause/Resume Program",
      "R   : Restart (reload current map)",
    ];
  }

  /**
   * Hiển thị controls help
   */
  showControlsHelp() {
    console.log("�� Available Controls:");
    this.getControlsList().forEach((control) => {
      console.log(`  ${control}`);
    });
  }
}
