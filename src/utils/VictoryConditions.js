/**
 * VictoryConditions.js
 *
 * Hệ thống đánh giá tiêu chí thắng thua cho từng map dựa trên việc thu thập pin
 */

import { mapConfigs } from "../data/mapConfigs.js";
import { sendBatteryCollectionResult } from "./WebViewMessenger.js";

/**
 * Lớp đánh giá điều kiện thắng
 */
export class VictoryConditions {
  /**
   * Tính tổng số pin cần thu thập trong một map
   * @param {string} mapKey - Key của map (basic1, basic2, etc.)
   * @returns {Object} Thông tin về số lượng pin cần thu thập
   */
  static getRequiredBatteries(mapKey) {
    const config = mapConfigs[mapKey];

    // Ưu tiên sử dụng cấu hình victory mới nếu có
    if (config && config.victory) {
      const victory = config.victory;
      const byType = { red: 0, yellow: 0, green: 0 };

      // Xử lý cấu trúc byType mới: [{ red: 0, yellow: 0, green: 1 }]
      if (Array.isArray(victory.byType) && victory.byType.length > 0) {
        const typeConfig = victory.byType[0];
        // Nếu entry đầu là dạng box (có x,y) thì không có cấu hình pin
        if (
          typeof typeConfig.x === "number" &&
          typeof typeConfig.y === "number"
        ) {
          return undefined;
        }

        byType.red = typeConfig.red || 0;
        byType.yellow = typeConfig.yellow || 0;
        byType.green = typeConfig.green || 0;

        const totalRequired =
          (byType.red || 0) + (byType.yellow || 0) + (byType.green || 0);
        if (totalRequired === 0) {
          // Không đặt mục tiêu pin
          return undefined;
        }
      }

      return {
        byType,
        description: victory.description || undefined,
      };
    }
  }

  /**
   * Lấy yêu cầu về box được đặt tại các vị trí chỉ định (nếu có)
   * Dùng cùng trường victory.byType nhưng mỗi phần tử có {x,y,count}
   */
  static getRequiredBoxes(mapKey) {
    const config = mapConfigs[mapKey];
    if (!config || !config.victory) return undefined;
    const arr = Array.isArray(config.victory.byType)
      ? config.victory.byType
      : [];
    const targets = arr.filter(
      (v) => typeof v.x === "number" && typeof v.y === "number"
    );
    return targets.length > 0 ? targets : undefined;
  }

  /**
   * Kiểm tra điều kiện thắng dựa trên pin đã thu thập
   * @param {Object} scene - Scene hiện tại
   * @returns {Object} Kết quả kiểm tra { isVictory, progress, message }
   */
  static checkVictory(scene) {
    if (!scene.mapKey) {
      return {
        isVictory: false,
        progress: 0,
        message: "Đang khởi tạo...",
        details: {
          red: "Đỏ: 0/0",
          yellow: "Vàng: 0/0",
          green: "Xanh lá: 0/0",
        },
      };
    }

    // Ưu tiên kiểm tra theo box nếu cấu hình victory dùng toạ độ
    const requiredBoxes = this.getRequiredBoxes(scene.mapKey);
    if (requiredBoxes && scene.boxManager) {
      const detailsBoxes = [];
      let allMet = true;
      for (const t of requiredBoxes) {
        const key = `${t.x},${t.y}`;
        const data = scene.boxManager.getBoxesAtTile
          ? scene.boxManager.getBoxesAtTile(key)
          : null;
        const current = data ? data.count : 0;
        const need = t.count || 0;
        detailsBoxes.push(`Box (${t.x},${t.y}): ${current}/${need}`);
        if (current !== need) allMet = false;
      }
      return {
        isVictory: allMet,
        details: { boxes: detailsBoxes },
        required: { boxes: requiredBoxes },
        collected: { boxes: detailsBoxes },
      };
    }

    // Lấy thông tin pin cần thu thập
    const required = this.getRequiredBatteries(scene.mapKey);

    // Mặc định: kiểm tra theo pin
    if (!scene.batteryManager || !required) {
      return {
        isVictory: false,
        progress: 0,
        message: "Đang khởi tạo...",
        details: {},
      };
    }

    // Lấy thông tin pin đã thu thập từ BatteryManager
    const collected = scene.batteryManager
      ? scene.batteryManager.getCollectedBatteries()
      : { total: 0, byType: { red: 0, yellow: 0, green: 0 } };

    const isVictory = this.checkVictoryCondition(collected, required);

    // Không tạo message ở đây, để ProgramExecutor tự tạo message phù hợp

    // Thông tin chi tiết theo màu
    const details = {
      red: `Đỏ: ${collected.byType.red || 0}/${required.byType.red || 0}`,
      yellow: `Vàng: ${collected.byType.yellow || 0}/${
        required.byType.yellow || 0
      }`,
      green: `Xanh lá: ${collected.byType.green || 0}/${
        required.byType.green || 0
      }`,
    };

    return {
      isVictory,
      details,
      required,
      collected,
    };
  }

  /**
   * Kiểm tra điều kiện thắng: đủ cả tổng số và từng màu
   * @param {Object} collected - Pin đã thu thập
   * @param {Object} required - Pin cần thiết
   * @returns {boolean} Có thắng không
   */
  static checkVictoryCondition(collected, required) {
    // Chỉ kiểm tra từng loại pin (bỏ kiểm tra total)
    const colors = ["red", "yellow", "green"];
    for (const color of colors) {
      const collectedCount = collected.byType[color] || 0;
      const requiredCount = required.byType[color] || 0;

      if (collectedCount !== requiredCount) {
        return false;
      }
    }

    return true;
  }

  /**
   * Tạo thông tin tổng quan về map
   * @param {string} mapKey - Key của map (basic1, basic2, etc.)
   * @returns {Object} Thông tin tổng quan
   */
  static getMapSummary(mapKey) {
    const config = mapConfigs[mapKey];
    if (!config) return null;

    const required = this.getRequiredBatteries(mapKey);

    // Lấy thông tin robot
    const robot = config.robot || {};
    const robotPos = robot.tile || { x: 0, y: 0 };
    const robotDirection = robot.direction || "north";

    // Tạo mảng vị trí pin
    const batteryPositions = [];
    if (config.batteries) {
      config.batteries.forEach((batteryConfig) => {
        if (batteryConfig.tiles) {
          batteryConfig.tiles.forEach((tileConfig) => {
            batteryPositions.push({
              position: { x: tileConfig.x, y: tileConfig.y },
              count: tileConfig.count || 1,
              type: tileConfig.type || batteryConfig.type || "green",
              types: tileConfig.types,
            });
          });
        }
      });
    }

    return {
      mapKey,
      robotPosition: robotPos,
      robotDirection,
      batteryPositions,
      requiredBatteries: required,
    };
  }

  /**
   * Lấy thông tin tổng quan cho tất cả các map
   * @returns {Object} Thông tin tổng quan cho mỗi map
   */
  static getAllMapsSummary() {
    const summary = {};

    Object.keys(mapConfigs).forEach((mapKey) => {
      summary[mapKey] = this.getMapSummary(mapKey);
    });

    return summary;
  }
}

/**
 * Hàm kiểm tra và hiển thị trạng thái thắng/thua
 * @param {Object} scene - Scene hiện tại
 * @returns {Object} Kết quả kiểm tra
 */
export function checkAndDisplayVictory(scene) {
  const result = VictoryConditions.checkVictory(scene);

  // Hiển thị thông tin trong console
  if (result.isVictory) {
    console.log(`🏆 Chiến thắng! Đã thu thập đủ pin theo yêu cầu`);
  } else {
    console.log(`📊 Chưa thu thập đủ pin theo yêu cầu`);
  }

  // Kiểm tra details có tồn tại không trước khi log
  if (result.details) {
    console.log(`   ${result.details.red}`);
    console.log(`   ${result.details.yellow}`);
    console.log(`   ${result.details.green}`);
  }

  // Gửi kết quả đến webview bên ngoài
  sendBatteryCollectionResult(scene, result);

  return result;
}

/**
 * Hàm tạo text hiển thị trạng thái thu thập pin
 * @param {Object} scene - Scene hiện tại
 * @returns {Phaser.GameObjects.Text} Text object
 */
export function createBatteryStatusText(scene) {
  // Tạo text ở góc trên bên phải
  const statusText = scene.add.text(
    scene.cameras.main.width - 10,
    10,
    "Đang tải...",
    {
      fontFamily: "Arial",
      fontSize: "16px",
      fill: "#ffffff",
      backgroundColor: "#333333",
      padding: { x: 10, y: 5 },
    }
  );

  // Căn phải
  statusText.setOrigin(1, 0);

  // Cập nhật text
  updateBatteryStatusText(scene, statusText);

  return statusText;
}

/**
 * Cập nhật text hiển thị trạng thái thu thập pin
 * @param {Object} scene - Scene hiện tại
 * @param {Phaser.GameObjects.Text} statusText - Text object
 */
export function updateBatteryStatusText(scene, statusText) {
  const result = VictoryConditions.checkVictory(scene);

  // Tạo nội dung text
  let content = `Map: ${scene.mapKey}\n`;
  if (result.isVictory) {
    content += `Chiến thắng!\n`;
  } else {
    content += `Đang chơi...\n`;
  }

  // Hiển thị chi tiết theo loại mục tiêu
  // Kiểm tra details có tồn tại không
  if (result.details) {
    if (result.details.red || result.details.yellow || result.details.green) {
      // Trường hợp theo pin
      if (result.details.red) content += `${result.details.red}\n`;
      if (result.details.yellow) content += `${result.details.yellow}\n`;
      if (result.details.green) content += `${result.details.green}`;
    } else if (Array.isArray(result.details.boxes)) {
      // Trường hợp theo box
      content += result.details.boxes.join("\n");
    } else {
      content += "Đang tải...";
    }
  } else {
    content += "Đang tải...";
  }

  // Thêm thông tin box nếu có BoxManager
  if (scene.boxManager) {
    const boxStats = scene.boxManager.getStats();
    content += `\n📦 Đã lấy: ${boxStats.collectedBoxes} | Đã đặt: ${boxStats.putBoxes}`;
  }

  // Cập nhật text
  statusText.setText(content);

  // Đổi màu nếu thắng
  if (result.isVictory) {
    statusText.setStyle({
      backgroundColor: "#006600",
      fill: "#ffffff",
    });
  } else {
    statusText.setStyle({
      backgroundColor: "#333333",
      fill: "#ffffff",
    });
  }
}
