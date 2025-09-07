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
        byType.red = typeConfig.red || 0;
        byType.yellow = typeConfig.yellow || 0;
        byType.green = typeConfig.green || 0;
      }
      
      return { 
        total: victory.total || 0, 
        byType 
      };
    }
  }

  /**
   * Kiểm tra điều kiện thắng dựa trên pin đã thu thập
   * @param {Object} scene - Scene hiện tại
   * @returns {Object} Kết quả kiểm tra { isVictory, progress, message }
   */
  static checkVictory(scene) {
    // Nếu không có mapKey hoặc không có batteryManager
    if (!scene.mapKey || !scene.batteryManager) {
      return {
        isVictory: false,
        isDefeat: false,  // Thêm lại
        progress: 0,
        message: "Đang khởi tạo...",
        details: {
          red: "Đỏ: 0/0",
          yellow: "Vàng: 0/0", 
          green: "Xanh lá: 0/0"
        }
      };
    }
  
    // Lấy thông tin pin cần thu thập
    const required = this.getRequiredBatteries(scene.mapKey);
  
    // Lấy thông tin pin đã thu thập từ BatteryManager
    const collected = scene.batteryManager ? scene.batteryManager.getCollectedBatteries() : { total: 0, byType: { red: 0, yellow: 0, green: 0 } };
  
    // Tính tỷ lệ hoàn thành
    const progress = required.total > 0 ? Math.min(1, collected.total / required.total) : 1;
  
    // KIỂM TRA ĐIỀU KIỆN THUA: Thu thập quá số lượng yêu cầu
    const isDefeat = this.checkDefeatCondition(collected, required);
  
    // Kiểm tra đã thu thập đủ pin chưa (chỉ khi chưa thua)
    const isVictory = !isDefeat && collected.total >= required.total;
  
    // Tạo thông báo
    let message;
    if (isDefeat) {
      message = this.getDefeatMessage(collected, required);
    } else if (isVictory) {
      message = `Chiến thắng! Đã thu thập đủ ${collected.total}/${required.total} pin`;
    } else {
      message = `Đã thu thập ${collected.total}/${required.total} pin (${Math.round(progress * 100)}%)`;
    }
  
    // Thông tin chi tiết theo màu
    const details = {
      red: `Đỏ: ${collected.byType.red || 0}/${required.byType.red || 0}`,
      yellow: `Vàng: ${collected.byType.yellow || 0}/${required.byType.yellow || 0}`,
      green: `Xanh lá: ${collected.byType.green || 0}/${required.byType.green || 0}`,
    };
  
    return {
      isVictory,
      isDefeat,  // Thêm lại
      progress,
      message,
      details,
      required,
      collected,
    };
  }
  static checkDefeatCondition(collected, required) {
    // Kiểm tra tổng số pin
    if (collected.total > required.total) {
      return true;
    }
  
    // Kiểm tra từng loại pin
    const colors = ['red', 'yellow', 'green'];
    for (const color of colors) {
      const collectedCount = collected.byType[color] || 0;
      const requiredCount = required.byType[color] || 0;
      
      if (collectedCount != requiredCount) {
        return true;
      }
    }
  
    return false;
  }
  
  /**
   * Tạo thông báo thua cuộc
   * @param {Object} collected - Pin đã thu thập
   * @param {Object} required - Pin cần thiết
   * @returns {string} Thông báo thua
   */
  static getDefeatMessage(collected, required) {
    // Kiểm tra tổng số pin
    if (collected.total > required.total) {
      return `Thua! Thu thập quá nhiều pin: ${collected.total}/${required.total}`;
    }
  
    // Kiểm tra từng loại pin
    const colors = ['red', 'yellow', 'green'];
    for (const color of colors) {
      const collectedCount = collected.byType[color] || 0;
      const requiredCount = required.byType[color] || 0;
      
      if (collectedCount > requiredCount) {
        const colorName = color === 'red' ? 'đỏ' : color === 'yellow' ? 'vàng' : 'xanh lá';
        return `Thua! Thu thập quá nhiều pin ${colorName}: ${collectedCount}/${requiredCount}`;
      }
    }
  
    return "Thua cuộc!";
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
    console.log(`🏆 ${result.message}`);
  } else {
    console.log(`📊 ${result.message}`);
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
  content += `${result.message}\n`;
  
  // Kiểm tra details có tồn tại không
  if (result.details) {
    content += `${result.details.red}\n`;
    content += `${result.details.yellow}\n`;
    content += `${result.details.green}`;
  } else {
    content += "Đang tải...";
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
