/**
 * VictoryConditions.js
 *
 * Hệ thống đánh giá tiêu chí thắng thua cho từng map dựa trên việc thu thập pin
 */

import { sendBatteryCollectionResult } from "./WebViewMessenger.js";

/**
 * Lớp đánh giá điều kiện thắng
 */
export class VictoryConditions {
  /**
   * Kiểm tra điều kiện thắng dựa trên pin được phép collect
   * @param {Object} scene - Scene hiện tại
   * @returns {Object} Kết quả kiểm tra { isVictory, progress, message }
   */
  static checkVictoryByAllowedBatteries(scene) {
    if (!scene.entityManager) {
      return {
        isVictory: false,
        progress: 0,
        message: "Đang khởi tạo...",
        details: {},
      };
    }

    const totalAllowed = scene.entityManager.getTotalAllowedBatteries();
    const totalCollected = scene.entityManager.totalCollectedBatteries;
    const allowedByType = scene.entityManager.getAllowedBatteriesByType();
    const collectedByType = scene.entityManager.collectedBatteries;

    const isVictory = totalCollected >= totalAllowed;

    // Thông tin chi tiết theo màu
    const details = {
      red: `Đỏ: ${collectedByType.red || 0}/${allowedByType.red || 0}`,
      yellow: `Vàng: ${collectedByType.yellow || 0}/${
        allowedByType.yellow || 0
      }`,
      green: `Xanh lá: ${collectedByType.green || 0}/${
        allowedByType.green || 0
      }`,
    };

    return {
      isVictory,
      progress: totalAllowed > 0 ? (totalCollected / totalAllowed) * 100 : 0,
      message: isVictory
        ? "Chiến thắng!"
        : `Đang chơi... (${totalCollected}/${totalAllowed})`,
      details,
      totalAllowed,
      totalCollected,
      allowedByType,
      collectedByType,
    };
  }

  /**
   * Kiểm tra điều kiện thắng dựa trên pin đã thu thập (legacy method)
   * @param {Object} scene - Scene hiện tại
   * @returns {Object} Kết quả kiểm tra { isVictory, progress, message }
   */
  static checkVictory(scene) {
    // Sử dụng challenge data từ JSON thay vì mapKey
    const challengeData = scene.cache.json.get("challengeData");
    if (!challengeData) {
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

    // Mặc định: kiểm tra theo pin từ challenge data
    if (!scene.batteryManager) {
      return {
        isVictory: false,
        progress: 0,
        message: "Đang khởi tạo...",
        details: {},
      };
    }

    // Tính toán required batteries từ challenge data
    const required =
      this.calculateRequiredBatteriesFromChallenge(challengeData);

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
   * Tính toán required batteries từ challenge data
   * @param {Object} challengeData - Challenge data từ JSON
   * @returns {Object} Required batteries by type
   */
  static calculateRequiredBatteriesFromChallenge(challengeData) {
    const byType = { red: 0, yellow: 0, green: 0 };

    if (challengeData.batteries && Array.isArray(challengeData.batteries)) {
      challengeData.batteries.forEach((batteryGroup) => {
        if (batteryGroup.tiles && Array.isArray(batteryGroup.tiles)) {
          batteryGroup.tiles.forEach((tile) => {
            const count = tile.count || 1;
            const type = tile.type || "green";
            const allowed = tile.allowedCollect !== false;

            if (allowed && byType.hasOwnProperty(type)) {
              byType[type] += count;
            }
          });
        }
      });
    }

    return { byType };
  }
}

/**
 * Hàm kiểm tra và hiển thị trạng thái thắng/thua
 * @param {Object} scene - Scene hiện tại
 * @returns {Object} Kết quả kiểm tra
 */
export function checkAndDisplayVictory(scene) {
  // Ưu tiên sử dụng method mới dựa trên allowed batteries
  const result = scene.entityManager
    ? VictoryConditions.checkVictoryByAllowedBatteries(scene)
    : VictoryConditions.checkVictory(scene);

  // Hiển thị thông tin trong console
  if (result.isVictory) {
    console.log(`🏆 Chiến thắng! Đã thu thập đủ pin được phép collect`);
  } else {
    console.log(`📊 Chưa thu thập đủ pin được phép collect`);
  }

  // Kiểm tra details có tồn tại không trước khi log
  if (result.details) {
    console.log(`   ${result.details.red}`);
    console.log(`   ${result.details.yellow}`);
    console.log(`   ${result.details.green}`);
  }

  // Gửi kết quả đến webview bên ngoài (chỉ thắng/thua)
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
  let content = `Challenge Mode\n`;
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
