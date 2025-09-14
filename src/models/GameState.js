/**
 * GameState - Quản lý trạng thái tổng thể của game
 *
 * Trách nhiệm:
 * - Lưu trữ vị trí robot hiện tại
 * - Theo dõi pin đã thu thập
 * - Quản lý trạng thái chương trình
 * - Cung cấp methods để update state
 */
export class GameState {
  constructor() {
    this.robotPosition = { x: 0, y: 0 };
    this.robotDirection = "east";
    this.collectedBatteries = { red: 0, yellow: 0, green: 0 };
    this.isProgramRunning = false;
    this.isGameWon = false;
    this.isGameLost = false;
    this.currentProgram = null;
    this.programStep = 0;
  }

  /**
   * Cập nhật vị trí robot
   * @param {number} x - Tọa độ x
   * @param {number} y - Tọa độ y
   */
  updateRobotPosition(x, y) {
    this.robotPosition = { x, y };
  }

  /**
   * Cập nhật hướng robot
   * @param {string} direction - Hướng mới
   */
  updateRobotDirection(direction) {
    this.robotDirection = direction;
  }

  /**
   * Thêm pin đã thu thập
   * @param {string} type - Loại pin (red, yellow, green)
   */
  addBattery(type) {
    if (this.collectedBatteries.hasOwnProperty(type)) {
      this.collectedBatteries[type]++;
    }
  }

  /**
   * Lấy tổng số pin đã thu thập
   * @returns {Object} Object chứa số lượng pin theo loại
   */
  getCollectedBatteries() {
    return { ...this.collectedBatteries };
  }

  /**
   * Reset trạng thái game
   */
  reset() {
    this.robotPosition = { x: 0, y: 0 };
    this.robotDirection = "east";
    this.collectedBatteries = { red: 0, yellow: 0, green: 0 };
    this.isProgramRunning = false;
    this.isGameWon = false;
    this.isGameLost = false;
    this.currentProgram = null;
    this.programStep = 0;
  }

  /**
   * Kiểm tra game đã kết thúc chưa
   * @returns {boolean}
   */
  isGameEnded() {
    return this.isGameWon || this.isGameLost;
  }

  /**
   * Đánh dấu game thắng
   */
  setGameWon() {
    this.isGameWon = true;
    this.isProgramRunning = false;
  }

  /**
   * Đánh dấu game thua
   */
  setGameLost() {
    this.isGameLost = true;
    this.isProgramRunning = false;
  }

  /**
   * Bắt đầu chạy chương trình
   * @param {Array} program - Mảng các lệnh
   */
  startProgram(program) {
    this.currentProgram = program;
    this.programStep = 0;
    this.isProgramRunning = true;
  }

  /**
   * Dừng chương trình
   */
  stopProgram() {
    this.isProgramRunning = false;
    this.currentProgram = null;
    this.programStep = 0;
  }

  /**
   * Lấy lệnh tiếp theo trong chương trình
   * @returns {string|null} Lệnh tiếp theo hoặc null nếu hết
   */
  getNextCommand() {
    if (!this.isProgramRunning || !this.currentProgram) {
      return null;
    }

    if (this.programStep >= this.currentProgram.length) {
      this.stopProgram();
      return null;
    }

    const command = this.currentProgram[this.programStep];
    this.programStep++;
    return command;
  }
}
