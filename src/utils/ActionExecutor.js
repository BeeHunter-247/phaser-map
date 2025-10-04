/**
 * ActionExecutor - Thực thi actions từ robot vật lý một cách im lặng
 *
 * Nhận list actions từ FE/MB, thực thi logic game mà không cập nhật UI,
 * sau đó trả về kết quả thắng/thua
 */
import { checkAndDisplayVictory } from "./VictoryConditions.js";

export class ActionExecutor {
  constructor(scene) {
    this.scene = scene;
    this.robotModel = null;
    this.batteryManager = null;
    this.boxManager = null;
    this.mapModel = null;
    this.usedStatements = new Set(); // Track statements used in physical robot actions
  }

  /**
   * Khởi tạo ActionExecutor với các manager hiện có
   * @param {RobotModel} robotModel - Robot model
   * @param {BatteryManager} batteryManager - Battery manager
   * @param {BoxManager} boxManager - Box manager
   * @param {MapModel} mapModel - Map model
   */
  initialize(robotModel, batteryManager, boxManager, mapModel) {
    this.robotModel = robotModel;
    this.batteryManager = batteryManager;
    this.boxManager = boxManager;
    this.mapModel = mapModel;

    console.log("🤖 ActionExecutor initialized");
  }

  /**
   * Thực thi list actions từ robot vật lý
   * @param {Array} actions - List actions từ robot
   * @returns {Object} Kết quả thắng/thua
   */
  async executeActions(actions) {
    if (!Array.isArray(actions) || actions.length === 0) {
      return {
        isVictory: false,
        message: "No actions provided",
        step: 0,
        totalSteps: 0,
      };
    }

    // Reset used statements for new execution
    this.usedStatements.clear();

    console.log(`🤖 Executing ${actions.length} actions from physical robot`);

    const startTime = Date.now();

    try {
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        console.log(
          `🤖 Step ${i + 1}/${actions.length}: ${action.type}${
            action.count ? ` (${action.count})` : ""
          }${action.color ? ` (${action.color})` : ""}`
        );

        const success = await this.executeAction(action);

        if (!success) {
          return {
            isVictory: false,
            message: `Action failed at step ${i + 1}: ${action.type}`,
            step: i + 1,
            totalSteps: actions.length,
            failedAction: action,
            executionTime: Date.now() - startTime,
          };
        }

        // Delay nhỏ giữa các action để tránh spam
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Kiểm tra kết quả cuối cùng
      const result = this.checkFinalResult();
      result.executionTime = Date.now() - startTime;
      result.totalSteps = actions.length;

      return result;
    } catch (error) {
      console.error("❌ ActionExecutor error:", error);
      return {
        isVictory: false,
        message: `Execution error: ${error.message}`,
        step: 0,
        totalSteps: actions.length,
        error: error,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Thực thi một action cụ thể
   * @param {Object} action - Action object
   * @returns {boolean} Success/failure
   */
  async executeAction(action) {
    if (!action || !action.type) {
      console.warn("⚠️ Invalid action:", action);
      return false;
    }

    // Track statement usage for victory conditions
    this.usedStatements.add(action.type);

    try {
      switch (action.type) {
        case "forward":
          return this.moveForward(action.count || 1);

        case "turnLeft":
          return this.turnLeft();

        case "turnRight":
          return this.turnRight();

        case "turnBack":
          return this.turnBack();

        case "collect":
          return this.collectBattery(action.color, action.count || 1);

        case "putBox":
          return this.putBox(action.count || 1);

        case "takeBox":
          return this.takeBox(action.count || 1);

        default:
          console.warn(`⚠️ Unknown action type: ${action.type}`);
          return false;
      }
    } catch (error) {
      console.error(`❌ Error executing action ${action.type}:`, error);
      return false;
    }
  }

  /**
   * Di chuyển tiến
   * @param {number} count - Số bước di chuyển
   * @returns {boolean} Success/failure
   */
  moveForward(count) {
    if (!this.robotModel) {
      console.error("❌ Robot model not initialized");
      return false;
    }

    for (let i = 0; i < count; i++) {
      const result = this.robotModel.moveForward();
      if (!result.success) {
        console.error(
          `❌ Move forward failed at step ${i + 1}: ${result.error}`
        );
        return false;
      }
    }
    return true;
  }

  /**
   * Quay trái
   * @returns {boolean} Success/failure
   */
  turnLeft() {
    if (!this.robotModel) {
      console.error("❌ Robot model not initialized");
      return false;
    }

    this.robotModel.turnLeft();
    return true;
  }

  /**
   * Quay phải
   * @returns {boolean} Success/failure
   */
  turnRight() {
    if (!this.robotModel) {
      console.error("❌ Robot model not initialized");
      return false;
    }

    this.robotModel.turnRight();
    return true;
  }

  /**
   * Quay lại
   * @returns {boolean} Success/failure
   */
  turnBack() {
    if (!this.robotModel) {
      console.error("❌ Robot model not initialized");
      return false;
    }

    this.robotModel.turnBack();
    return true;
  }

  /**
   * Nhặt pin
   * @param {string} color - Màu pin
   * @param {number} count - Số lượng pin
   * @returns {boolean} Success/failure
   */
  collectBattery(color, count) {
    if (!this.robotModel || !this.mapModel) {
      console.error("❌ Robot model or map model not initialized");
      return false;
    }

    for (let i = 0; i < count; i++) {
      const robotPos = this.robotModel.position;
      const batteriesAtPos = this.mapModel.getBatteriesAtPosition(
        robotPos.x,
        robotPos.y
      );

      let targetBattery = null;
      if (color) {
        targetBattery = batteriesAtPos.find(
          (b) => b.color === color && b.isAvailable()
        );
      } else {
        targetBattery = batteriesAtPos.find((b) => b.isAvailable());
      }

      if (!targetBattery) {
        console.error(
          `❌ No battery found for collect: ${color || "any"} at (${
            robotPos.x
          }, ${robotPos.y})`
        );
        return false;
      }

      // Thu thập ở chế độ im lặng để không ẩn sprite
      const result =
        typeof targetBattery.collectSilently === "function"
          ? targetBattery.collectSilently(this.robotModel.id)
          : targetBattery.collect(this.robotModel.id);
      if (!result.success) {
        console.error(`❌ Collect failed: ${result.message}`);
        return false;
      }

      this.robotModel.addBattery(targetBattery.color);
      console.log(
        `🔋 Collected ${targetBattery.color} battery at (${robotPos.x}, ${robotPos.y})`
      );
    }
    return true;
  }

  /**
   * Đặt box
   * @param {number} count - Số lượng box
   * @returns {boolean} Success/failure
   */
  putBox(count) {
    // Chỉ cho phép đặt 1 box mỗi lần
    if (count !== 1) {
      console.error(`❌ Can only put 1 box at a time, requested: ${count}`);
      return false;
    }

    if (!this.robotModel || !this.boxManager) {
      console.error("❌ Robot model or box manager not initialized");
      return false;
    }

    if (this.boxManager.carriedBoxes < 1) {
      console.error(
        `❌ Not enough boxes to put: 1 (carried: ${this.boxManager.carriedBoxes})`
      );
      return false;
    }

    const frontTile = this.robotModel.getFrontPosition();
    const tileKey = `${frontTile.x},${frontTile.y}`;

    // Kiểm tra có trong bounds không
    if (!this.robotModel.isWithinBounds(frontTile.x, frontTile.y)) {
      console.error(
        `❌ Front tile (${frontTile.x}, ${frontTile.y}) is out of bounds`
      );
      return false;
    }

    if (!this.boxManager.boxes.has(tileKey)) {
      this.boxManager.boxes.set(tileKey, { count: 0, sprites: [], types: [] });
    }

    const tileData = this.boxManager.boxes.get(tileKey);
    tileData.count += 1; // Chỉ đặt 1 box
    this.boxManager.putBoxes += 1;
    this.boxManager.carriedBoxes -= 1;

    console.log(`📦 Put 1 box at (${frontTile.x}, ${frontTile.y})`);
    return true;
  }

  /**
   * Lấy box
   * @param {number} count - Số lượng box
   * @returns {boolean} Success/failure
   */
  takeBox(count) {
    // Chỉ cho phép nhặt 1 box mỗi lần
    if (count !== 1) {
      console.error(`❌ Can only take 1 box at a time, requested: ${count}`);
      return false;
    }

    if (!this.robotModel || !this.boxManager) {
      console.error("❌ Robot model or box manager not initialized");
      return false;
    }

    const frontTile = this.robotModel.getFrontPosition();
    const tileKey = `${frontTile.x},${frontTile.y}`;

    // Kiểm tra có trong bounds không
    if (!this.robotModel.isWithinBounds(frontTile.x, frontTile.y)) {
      console.error(
        `❌ Front tile (${frontTile.x}, ${frontTile.y}) is out of bounds`
      );
      return false;
    }

    const tileData = this.boxManager.boxes.get(tileKey);

    if (!tileData || tileData.count < 1) {
      console.error(
        `❌ Not enough boxes to take: 1 (available: ${
          tileData?.count || 0
        }) at (${frontTile.x}, ${frontTile.y})`
      );
      return false;
    }

    tileData.count -= 1; // Chỉ nhặt 1 box
    this.boxManager.totalBoxes -= 1;
    this.boxManager.collectedBoxes += 1;
    this.boxManager.carriedBoxes += 1;

    console.log(`📦 Took 1 box from (${frontTile.x}, ${frontTile.y})`);
    return true;
  }

  /**
   * Kiểm tra kết quả cuối cùng
   * @returns {Object} Kết quả thắng/thua
   */
  checkFinalResult() {
    if (!this.scene) {
      return {
        isVictory: false,
        message: "Scene not available for victory check",
      };
    }

    // Sync used statements to ProgramExecutor for victory conditions
    if (this.scene.programExecutor && this.usedStatements.size > 0) {
      // Merge physical robot statements with existing ones
      this.usedStatements.forEach((statement) => {
        this.scene.programExecutor.usedStatements.add(statement);
      });
      console.log(
        `🤖 Synced ${this.usedStatements.size} statements to ProgramExecutor:`,
        Array.from(this.usedStatements)
      );
    }

    const victoryResult = checkAndDisplayVictory(this.scene);

    return {
      isVictory: victoryResult.isVictory,
      message: victoryResult.isVictory
        ? "Physical robot completed successfully!"
        : "Physical robot failed to meet victory conditions",
      details: victoryResult,
      robotPosition: this.robotModel ? this.robotModel.position : null,
      robotDirection: this.robotModel
        ? this.robotModel.getDirectionName()
        : null,
      robotInventory: this.robotModel ? this.robotModel.inventory : null,
    };
  }

  /**
   * Reset ActionExecutor
   */
  reset() {
    this.robotModel = null;
    this.batteryManager = null;
    this.boxManager = null;
    this.mapModel = null;
    this.usedStatements.clear();
    console.log("🤖 ActionExecutor reset");
  }
}
