/**
 * ProgramExecutor - Thực thi chương trình robot từ Blockly JSON
 */
export class ProgramExecutor {
  constructor(scene) {
    this.scene = scene;
    this.program = null;
    this.currentStep = 0;
    this.isRunning = false;
    this.isPaused = false;
    this.executionSpeed = 1000; // ms between commands
    this.timer = null;
  }

  /**
   * Load và validate chương trình từ JSON
   * @param {Object} programData - Blockly JSON program
   * @returns {boolean} Success/failure
   */
  loadProgram(programData) {
    try {
      // Validate program structure
      if (
        !programData.version ||
        !programData.actions ||
        !Array.isArray(programData.actions)
      ) {
        throw new Error("Invalid program structure");
      }

      // Parse và validate actions
      const parsedActions = this.parseActions(programData.actions);

      this.program = {
        version: programData.version,
        programName: programData.programName || "unnamed",
        actions: parsedActions,
      };

      console.log(`📋 Program loaded: ${this.program.programName}`);
      console.log(`   Version: ${this.program.version}`);
      console.log(`   Actions: ${this.program.actions.length}`);

      return true;
    } catch (error) {
      console.error("❌ Failed to load program:", error.message);
      return false;
    }
  }

  /**
   * Parse và validate actions
   * @param {Array} actions - Raw actions from JSON
   * @returns {Array} Parsed actions
   */
  parseActions(actions) {
    const parsedActions = [];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const parsedAction = this.parseAction(action, i);
      if (parsedAction) {
        parsedActions.push(parsedAction);
      }
    }

    return parsedActions;
  }

  /**
   * Parse một action cụ thể
   * @param {Object} action - Raw action
   * @param {number} index - Action index
   * @returns {Object|null} Parsed action or null if invalid
   */
  parseAction(action, index) {
    if (!action.type) {
      console.warn(`⚠️ Action ${index}: Missing type`);
      return null;
    }

    switch (action.type) {
      case "forward":
        return {
          type: "forward",
          count: parseInt(action.count) || 1,
          original: action,
        };

      case "turnRight":
        return {
          type: "turnRight",
          original: action,
        };

      case "turnLeft":
        return {
          type: "turnLeft",
          original: action,
        };

      case "turnBack":
        return {
          type: "turnBack",
          original: action,
        };

      case "collect":
        return {
          type: "collect",
          count: parseInt(action.count) || 1,
          colors: action.color ? [action.color] : ["green"],
          original: action,
        };

      default:
        console.warn(`⚠️ Action ${index}: Unknown type "${action.type}"`);
        return null;
    }
  }

  /**
   * Bắt đầu thực thi chương trình
   */
  startProgram() {
    if (!this.program) {
      console.error("❌ No program loaded");
      return false;
    }

    if (this.isRunning) {
      console.warn("⚠️ Program already running");
      return false;
    }

    this.currentStep = 0;
    this.isRunning = true;
    this.isPaused = false;

    console.log(`🚀 Starting program: ${this.program.programName}`);
    this.executeNextCommand();

    return true;
  }

  /**
   * Dừng chương trình
   */
  stopProgram() {
    this.isRunning = false;
    this.isPaused = false;
    this.currentStep = 0;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    console.log("⏹️ Program stopped");
  }

  /**
   * Tạm dừng chương trình
   */
  pauseProgram() {
    if (!this.isRunning) return;

    this.isPaused = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    console.log("⏸️ Program paused");
  }

  /**
   * Tiếp tục chương trình
   */
  resumeProgram() {
    if (!this.isRunning || !this.isPaused) return;

    this.isPaused = false;
    console.log("▶️ Program resumed");
    this.executeNextCommand();
  }

  /**
   * Thực thi lệnh tiếp theo
   */
  executeNextCommand() {
    if (!this.isRunning || this.isPaused) {
      console.log(
        `⏸️ Program paused or stopped. Current step: ${this.currentStep}`
      );
      return;
    }

    if (this.currentStep >= this.program.actions.length) {
      console.log("✅ Program completed!");
      this.stopProgram();
      return;
    }

    const action = this.program.actions[this.currentStep];
    console.log(
      `🎯 Executing step ${this.currentStep + 1}/${
        this.program.actions.length
      }: ${action.type}${action.count ? ` (count: ${action.count})` : ""}`
    );

    // Thực thi lệnh
    const success = this.executeCommand(action);

    if (success) {
      // Chỉ tăng step và tiếp tục cho các lệnh sync
      // Các lệnh async (như forward) sẽ tự gọi executeNextCommand()
      if (action.type !== "forward") {
        this.currentStep++;
        // Tiếp tục với lệnh tiếp theo sau delay
        this.timer = setTimeout(() => {
          this.executeNextCommand();
        }, this.executionSpeed);
      }
      // Lệnh forward sẽ tự xử lý việc chuyển sang lệnh tiếp theo
    } else {
      console.error(`❌ Command failed at step ${this.currentStep + 1}`);
      this.stopProgram();
    }
  }

  /**
   * Thực thi một lệnh cụ thể
   * @param {Object} action - Action to execute
   * @returns {boolean} Success/failure
   */
  executeCommand(action) {
    try {
      switch (action.type) {
        case "forward":
          return this.executeForward(action.count);

        case "turnRight":
          return this.scene.turnRight();

        case "turnLeft":
          return this.scene.turnLeft();

        case "turnBack":
          return this.scene.turnBack();

        case "collect":
          return this.executeCollect(action.count, action.colors);

        default:
          console.error(`❌ Unknown command: ${action.type}`);
          return false;
      }
    } catch (error) {
      console.error(`❌ Error executing command:`, error);
      return false;
    }
  }

  /**
   * Thực thi lệnh forward với count
   * @param {number} count - Số bước đi
   * @returns {boolean} Success/failure
   */
  executeForward(count) {
    console.log(`🚶 Moving forward ${count} step(s)`);

    // Thực hiện từng bước một cách tuần tự
    this.executeForwardStep(count, 0);
    return true; // Không gọi executeNextCommand() ở đây, để executeForwardStep xử lý
  }

  /**
   * Thực thi một bước forward
   * @param {number} totalCount - Tổng số bước
   * @param {number} currentStep - Bước hiện tại
   */
  executeForwardStep(totalCount, currentStep) {
    if (currentStep >= totalCount) {
      // Hoàn thành tất cả bước, tăng step và tiếp tục với lệnh tiếp theo
      this.currentStep++;
      this.executeNextCommand();
      return;
    }

    const success = this.scene.moveForward();
    if (!success) {
      console.error(
        `❌ Failed to move forward at step ${currentStep + 1}/${totalCount}`
      );
      this.stopProgram();
      return;
    }

    // Chờ animation hoàn thành rồi thực hiện bước tiếp theo
    setTimeout(() => {
      this.executeForwardStep(totalCount, currentStep + 1);
    }, 400); // Chờ animation hoàn thành
  }

  /**
   * Thực thi lệnh collect với count và colors
   * @param {number} count - Số lần collect
   * @param {Array} colors - Màu sắc battery
   * @returns {boolean} Success/failure
   */
  executeCollect(count, colors) {
    console.log(`🔋 Collecting ${count} battery(ies) with colors:`, colors);

    // Pre-check: đủ số lượng theo màu yêu cầu?
    const {
      key,
      sprites,
      types,
      count: perTileCount,
    } = this.scene.getBatteriesAtCurrentTile();
    if (perTileCount === 0) {
      this.scene.lose("Không có pin tại ô hiện tại");
      return false;
    }

    console.log(
      `🔍 Collect pre-check at tile ${key}: available=${perTileCount}, requested=${count}`
    );

    // Quy tắc: số lượng phải khớp CHÍNH XÁC với số pin trong ô
    if (perTileCount !== count) {
      this.scene.lose(
        `Có ${perTileCount} pin tại ô, nhưng yêu cầu thu thập ${count} (phải khớp chính xác)`
      );
      return false;
    }

    // Chuẩn hóa colors
    const normalizedColors =
      Array.isArray(colors) && colors.length > 0 ? colors : ["green"];

    // Đếm theo màu hiện có
    const available = { red: 0, yellow: 0, green: 0 };
    types.forEach((t) => (available[t] = (available[t] || 0) + 1));

    // Kiểm tra theo màu yêu cầu nếu có
    let requiredByColor = { red: 0, yellow: 0, green: 0 };
    for (let i = 0; i < count; i++) {
      const c =
        normalizedColors[i] ||
        normalizedColors[normalizedColors.length - 1] ||
        "green";
      requiredByColor[c] = (requiredByColor[c] || 0) + 1;
    }
    for (const c of Object.keys(requiredByColor)) {
      if ((available[c] || 0) < requiredByColor[c]) {
        this.scene.lose(
          `Không đủ pin màu ${c}. Cần ${requiredByColor[c]}, có ${
            available[c] || 0
          }`
        );
        return false;
      }
    }

    // Thực hiện nhặt
    for (let i = 0; i < count; i++) {
      const color =
        normalizedColors[i] ||
        normalizedColors[normalizedColors.length - 1] ||
        "green";
      console.log(`   Collecting ${color} battery (${i + 1}/${count})`);
      const ok = this.scene.collectBattery(color);
      if (!ok) return false;
    }

    return true;
  }

  /**
   * Lấy trạng thái hiện tại
   * @returns {Object} Current state
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentStep: this.currentStep,
      totalSteps: this.program ? this.program.actions.length : 0,
      programName: this.program ? this.program.programName : null,
    };
  }
}
