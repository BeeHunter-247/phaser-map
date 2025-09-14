/**
 * Challenge - Model cho thử thách game
 *
 * Trách nhiệm:
 * - Lưu trữ cấu hình thử thách từ challenge.json
 * - Cung cấp methods để truy xuất thông tin thử thách
 * - Validate dữ liệu thử thách
 */
export class Challenge {
  constructor(data) {
    this.robot = data.robot || {};
    this.batteries = data.batteries || [];
    this.boxes = data.boxes || [];
    this.description = data.description || "";
    this.statement = data.statement || [];
    this.statementNumber = data.statementNumber || 0;
  }

  /**
   * Lấy vị trí bắt đầu của robot
   * @returns {Object} {x, y}
   */
  getRobotPosition() {
    return this.robot.tile || { x: 0, y: 0 };
  }

  /**
   * Lấy hướng bắt đầu của robot
   * @returns {string}
   */
  getRobotDirection() {
    return this.robot.direction || "east";
  }

  /**
   * Lấy danh sách pin cần thu thập
   * @returns {Array} Mảng các pin
   */
  getRequiredBatteries() {
    return this.batteries;
  }

  /**
   * Lấy danh sách hộp
   * @returns {Array} Mảng các hộp
   */
  getBoxes() {
    return this.boxes;
  }

  /**
   * Lấy mô tả thử thách
   * @returns {string}
   */
  getDescription() {
    return this.description;
  }

  /**
   * Lấy danh sách câu lệnh được phép
   * @returns {Array} Mảng các câu lệnh
   */
  getAllowedStatements() {
    return this.statement;
  }

  /**
   * Lấy số lượng câu lệnh tối đa
   * @returns {number}
   */
  getMaxStatements() {
    return this.statementNumber;
  }

  /**
   * Tính toán số pin cần thu thập theo loại
   * @returns {Object} {red: number, yellow: number, green: number}
   */
  calculateRequiredBatteries() {
    const required = { red: 0, yellow: 0, green: 0 };

    this.batteries.forEach((batteryGroup) => {
      if (batteryGroup.tiles) {
        batteryGroup.tiles.forEach((tile) => {
          if (tile.allowedCollect === "true" || tile.allowedCollect === true) {
            const type = tile.type || "yellow";
            const count = tile.count || 1;
            required[type] += count;
          }
        });
      }
    });

    return required;
  }

  /**
   * Kiểm tra xem pin có được phép thu thập không
   * @param {number} x - Tọa độ x
   * @param {number} y - Tọa độ y
   * @returns {boolean}
   */
  isBatteryAllowed(x, y) {
    return this.batteries.some((batteryGroup) => {
      if (batteryGroup.tiles) {
        return batteryGroup.tiles.some(
          (tile) =>
            tile.x === x &&
            tile.y === y &&
            (tile.allowedCollect === "true" || tile.allowedCollect === true)
        );
      }
      return false;
    });
  }

  /**
   * Lấy thông tin pin tại vị trí cụ thể
   * @param {number} x - Tọa độ x
   * @param {number} y - Tọa độ y
   * @returns {Object|null} Thông tin pin hoặc null
   */
  getBatteryAt(x, y) {
    for (const batteryGroup of this.batteries) {
      if (batteryGroup.tiles) {
        for (const tile of batteryGroup.tiles) {
          if (tile.x === x && tile.y === y) {
            return {
              type: tile.type || "yellow",
              count: tile.count || 1,
              allowedCollect:
                tile.allowedCollect === "true" || tile.allowedCollect === true,
            };
          }
        }
      }
    }
    return null;
  }

  /**
   * Validate dữ liệu thử thách
   * @returns {boolean}
   */
  isValid() {
    return !!(this.robot && this.robot.tile && this.robot.direction);
  }

  /**
   * Lấy tóm tắt thử thách
   * @returns {Object}
   */
  getSummary() {
    const requiredBatteries = this.calculateRequiredBatteries();
    const totalBatteries = Object.values(requiredBatteries).reduce(
      (sum, count) => sum + count,
      0
    );

    return {
      description: this.description,
      robotPosition: this.getRobotPosition(),
      robotDirection: this.getRobotDirection(),
      requiredBatteries,
      totalBatteries,
      allowedStatements: this.statement,
      maxStatements: this.statementNumber,
    };
  }
}
