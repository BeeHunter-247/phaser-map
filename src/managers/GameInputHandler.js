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
            // Dừng chương trình đang chạy trước khi restart
            if (typeof this.scene.stopProgram === "function") {
              try {
                this.scene.stopProgram();
              } catch (_) {}
            }
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
    this.getControlsList().forEach((control) => {
      console.log(`  ${control}`);
    });
  }
}
