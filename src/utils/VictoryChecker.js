/**
 * VictoryChecker - Kiểm tra điều kiện thắng thua
 *
 * Trách nhiệm:
 * - Kiểm tra điều kiện thắng
 * - Tính toán yêu cầu pin
 * - Validate game state
 */
export class VictoryChecker {
  /**
   * Kiểm tra điều kiện thắng
   * @param {GameState} gameState - Trạng thái game hiện tại
   * @param {Challenge} challenge - Dữ liệu thử thách
   * @returns {boolean} Có thắng hay không
   */
  static checkVictory(gameState, challenge) {
    if (!gameState || !challenge) {
      console.warn("⚠️ VictoryChecker: Missing gameState or challenge");
      return false;
    }

    // Kiểm tra đã thắng chưa
    if (gameState.isGameWon) {
      return true;
    }

    // Kiểm tra đã thua chưa
    if (gameState.isGameLost) {
      return false;
    }

    // Kiểm tra điều kiện pin
    const requiredBatteries = challenge.calculateRequiredBatteries();
    const collectedBatteries = gameState.getCollectedBatteries();

    const isVictory = this.checkBatteryRequirements(
      collectedBatteries,
      requiredBatteries
    );

    if (isVictory) {
      console.log("🎉 VictoryChecker: Victory conditions met!");
      console.log("Required:", requiredBatteries);
      console.log("Collected:", collectedBatteries);
    }

    return isVictory;
  }

  /**
   * Kiểm tra yêu cầu pin
   * @param {Object} collected - Pin đã thu thập {red, yellow, green}
   * @param {Object} required - Pin cần thiết {red, yellow, green}
   * @returns {boolean}
   */
  static checkBatteryRequirements(collected, required) {
    const batteryTypes = ["red", "yellow", "green"];

    for (const type of batteryTypes) {
      const collectedCount = collected[type] || 0;
      const requiredCount = required[type] || 0;

      if (collectedCount < requiredCount) {
        return false;
      }
    }

    return true;
  }

  /**
   * Tính toán số pin còn thiếu
   * @param {Object} collected - Pin đã thu thập
   * @param {Object} required - Pin cần thiết
   * @returns {Object} Pin còn thiếu theo loại
   */
  static calculateMissingBatteries(collected, required) {
    const missing = {};
    const batteryTypes = ["red", "yellow", "green"];

    for (const type of batteryTypes) {
      const collectedCount = collected[type] || 0;
      const requiredCount = required[type] || 0;
      missing[type] = Math.max(0, requiredCount - collectedCount);
    }

    return missing;
  }

  /**
   * Tính toán tiến độ hoàn thành
   * @param {Object} collected - Pin đã thu thập
   * @param {Object} required - Pin cần thiết
   * @returns {number} Phần trăm hoàn thành (0-100)
   */
  static calculateProgress(collected, required) {
    const batteryTypes = ["red", "yellow", "green"];
    let totalRequired = 0;
    let totalCollected = 0;

    for (const type of batteryTypes) {
      const requiredCount = required[type] || 0;
      const collectedCount = collected[type] || 0;

      totalRequired += requiredCount;
      totalCollected += Math.min(collectedCount, requiredCount);
    }

    if (totalRequired === 0) {
      return 100;
    }

    return Math.round((totalCollected / totalRequired) * 100);
  }

  /**
   * Lấy mô tả trạng thái thắng thua
   * @param {GameState} gameState - Trạng thái game
   * @param {Challenge} challenge - Dữ liệu thử thách
   * @returns {Object} Thông tin trạng thái
   */
  static getGameStatus(gameState, challenge) {
    const required = challenge.calculateRequiredBatteries();
    const collected = gameState.getCollectedBatteries();
    const missing = this.calculateMissingBatteries(collected, required);
    const progress = this.calculateProgress(collected, required);

    return {
      isWon: gameState.isGameWon,
      isLost: gameState.isGameLost,
      isEnded: gameState.isGameEnded(),
      progress,
      required,
      collected,
      missing,
      robotPosition: gameState.robotPosition,
      robotDirection: gameState.robotDirection,
    };
  }

  /**
   * Validate game state
   * @param {GameState} gameState - Trạng thái game
   * @returns {boolean} Có hợp lệ không
   */
  static validateGameState(gameState) {
    if (!gameState) {
      return false;
    }

    // Kiểm tra robot position
    if (
      !gameState.robotPosition ||
      typeof gameState.robotPosition.x !== "number" ||
      typeof gameState.robotPosition.y !== "number"
    ) {
      return false;
    }

    // Kiểm tra robot direction
    const validDirections = ["north", "east", "south", "west"];
    if (!validDirections.includes(gameState.robotDirection)) {
      return false;
    }

    // Kiểm tra collected batteries
    const batteryTypes = ["red", "yellow", "green"];
    for (const type of batteryTypes) {
      if (
        typeof gameState.collectedBatteries[type] !== "number" ||
        gameState.collectedBatteries[type] < 0
      ) {
        return false;
      }
    }

    return true;
  }
}
