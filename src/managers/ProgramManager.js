/**
 * ProgramManager - Quản lý chương trình và execution
 *
 * Trách nhiệm:
 * - Quản lý chương trình robot
 * - Thực thi các lệnh
 * - Quản lý program state
 * - Load example programs
 */
export class ProgramManager {
  constructor(scene) {
    this.scene = scene;
    this.gameState = null;
    this.inputManager = null;
    this.isExecuting = false;
    this.executionTimer = null;
  }

  /**
   * Khởi tạo Program Manager
   * @param {GameState} gameState - Trạng thái game
   */
  initialize(gameState) {
    this.gameState = gameState;
    console.log("✅ ProgramManager: Initialized");
  }

  /**
   * Set input manager reference
   * @param {InputManager} inputManager - Input manager instance
   */
  setInputManager(inputManager) {
    this.inputManager = inputManager;
  }

  /**
   * Toggle chế độ chương trình
   */
  toggleProgram() {
    if (this.gameState.isProgramRunning) {
      this.stopProgram();
    } else {
      this.startProgram();
    }
  }

  /**
   * Bắt đầu chạy chương trình
   */
  startProgram() {
    if (
      !this.gameState.currentProgram ||
      this.gameState.currentProgram.length === 0
    ) {
      console.warn("⚠️ ProgramManager: No program to execute");
      return;
    }

    this.gameState.startProgram(this.gameState.currentProgram);
    this.isExecuting = true;

    // Disable manual input
    if (this.inputManager) {
      this.inputManager.setInputEnabled(false);
    }

    console.log("✅ ProgramManager: Program started");
    this.executeNextCommand();
  }

  /**
   * Dừng chương trình
   */
  stopProgram() {
    this.gameState.stopProgram();
    this.isExecuting = false;

    // Clear execution timer
    if (this.executionTimer) {
      this.scene.time.removeEvent(this.executionTimer);
      this.executionTimer = null;
    }

    // Enable manual input
    if (this.inputManager) {
      this.inputManager.setInputEnabled(true);
    }

    console.log("✅ ProgramManager: Program stopped");
  }

  /**
   * Thực thi lệnh tiếp theo
   */
  executeNextCommand() {
    if (!this.isExecuting || this.gameState.isGameEnded()) {
      this.stopProgram();
      return;
    }

    const command = this.gameState.getNextCommand();
    if (!command) {
      this.stopProgram();
      return;
    }

    console.log(`🤖 ProgramManager: Executing command: ${command}`);

    // Thực thi lệnh
    const success = this.inputManager.executeCommand(command);

    if (!success) {
      console.warn(`⚠️ ProgramManager: Command failed: ${command}`);
    }

    // Schedule next command sau 500ms
    this.executionTimer = this.scene.time.delayedCall(500, () => {
      this.executeNextCommand();
    });
  }

  /**
   * Load chương trình mẫu
   */
  loadExampleProgram() {
    const exampleProgram = [
      "moveforward",
      "moveforward",
      "turnright",
      "moveforward",
      "collectbattery",
      "turnleft",
      "moveforward",
      "moveforward",
    ];

    this.gameState.currentProgram = exampleProgram;
    console.log("✅ ProgramManager: Example program loaded");
  }

  /**
   * Set chương trình mới
   * @param {Array} program - Mảng các lệnh
   */
  setProgram(program) {
    if (!Array.isArray(program)) {
      console.warn("⚠️ ProgramManager: Program must be an array");
      return;
    }

    this.gameState.currentProgram = [...program];
    console.log(
      `✅ ProgramManager: Program set with ${program.length} commands`
    );
  }

  /**
   * Lấy chương trình hiện tại
   * @returns {Array}
   */
  getCurrentProgram() {
    return this.gameState.currentProgram || [];
  }

  /**
   * Lấy trạng thái execution
   * @returns {boolean}
   */
  isExecutingProgram() {
    return this.isExecuting && this.gameState.isProgramRunning;
  }

  /**
   * Lấy số lệnh đã thực thi
   * @returns {number}
   */
  getExecutedSteps() {
    return this.gameState.programStep;
  }

  /**
   * Lấy tổng số lệnh
   * @returns {number}
   */
  getTotalSteps() {
    return this.gameState.currentProgram
      ? this.gameState.currentProgram.length
      : 0;
  }

  /**
   * Reset chương trình
   */
  resetProgram() {
    this.stopProgram();
    this.gameState.currentProgram = null;
    this.gameState.programStep = 0;
    console.log("✅ ProgramManager: Program reset");
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopProgram();
    console.log("✅ ProgramManager: Cleaned up");
  }
}
