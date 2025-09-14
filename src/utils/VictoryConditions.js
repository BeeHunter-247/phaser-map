/**
 * VictoryConditions.js
 *
 * Hệ thống đánh giá tiêu chí thắng thua cho từng map dựa trên việc thu thập pin
 * Sử dụng challenge.json config thông qua MapModel
 */

import { sendBatteryCollectionResult } from "./WebViewMessenger.js";

/**
 * Lớp đánh giá điều kiện thắng
 */
export class VictoryConditions {
  /**
   * Tính tổng số pin cần thu thập dựa trên allowedCollect = true
   * @param {Object} scene - Scene hiện tại (chứa mapModel)
   * @returns {Object} Thông tin về số lượng pin cần thu thập
   */
  static getRequiredBatteriesByAllowedCollect(scene) {
    if (!scene || !scene.mapModel) {
      return undefined;
    }

    const byType = { red: 0, yellow: 0, green: 0 };
    let totalRequired = 0;

    // Đếm tất cả battery có allowedCollect = true
    const allBatteries = scene.mapModel.getAllBatteries();
    for (const battery of allBatteries) {
      if (battery.allowedCollect === true) {
        byType[battery.color] = (byType[battery.color] || 0) + 1;
        totalRequired++;
      }
    }

    if (totalRequired === 0) {
      return undefined;
    }

    // Lấy description từ challenge.json thông qua mapModel
    const description =
      scene.mapModel.victoryConditions?.description ||
      scene.challengeConfig?.description ||
      "Collect all allowed batteries";

    return {
      byType,
      description: description,
      totalRequired,
    };
  }

  /**
   * Tính tổng số pin cần thu thập trong một map
   * @param {Object} scene - Scene hiện tại (chứa mapModel)
   * @returns {Object} Thông tin về số lượng pin cần thu thập
   */
  static getRequiredBatteries(scene) {
    if (!scene || !scene.mapModel) {
      return undefined;
    }

    // Ưu tiên sử dụng cấu hình victory.byType nếu có
    const victory = scene.mapModel.victoryConditions;
    if (victory && Array.isArray(victory.byType) && victory.byType.length > 0) {
      const typeConfig = victory.byType[0];

      // Nếu entry đầu là dạng box (có x,y) thì không có cấu hình pin
      if (
        typeof typeConfig.x === "number" &&
        typeof typeConfig.y === "number"
      ) {
        return undefined;
      }

      const byType = { red: 0, yellow: 0, green: 0 };
      byType.red = typeConfig.red || 0;
      byType.yellow = typeConfig.yellow || 0;
      byType.green = typeConfig.green || 0;

      const totalRequired =
        (byType.red || 0) + (byType.yellow || 0) + (byType.green || 0);
      if (totalRequired === 0) {
        // Không đặt mục tiêu pin
        return undefined;
      }

      return {
        byType,
        description: victory.description || undefined,
      };
    }

    // Fallback: sử dụng logic mới đếm battery có allowedCollect = true
    const allowedCollectResult =
      this.getRequiredBatteriesByAllowedCollect(scene);
    if (allowedCollectResult) {
      return allowedCollectResult;
    }
  }

  /**
   * Lấy yêu cầu về box được đặt tại các vị trí chỉ định (nếu có)
   * Dùng cùng trường victory.byType nhưng mỗi phần tử có {x,y,count}
   */
  static getRequiredBoxes(scene) {
    if (!scene || !scene.mapModel) return undefined;

    const victory = scene.mapModel.victoryConditions;
    if (!victory) return undefined;

    const arr = Array.isArray(victory.byType) ? victory.byType : [];
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
    if (!scene || !scene.mapModel) {
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
    const requiredBoxes = this.getRequiredBoxes(scene);
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
    const required = this.getRequiredBatteries(scene);

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
   * @param {Object} scene - Scene hiện tại (chứa mapModel)
   * @returns {Object} Thông tin tổng quan
   */
  static getMapSummary(scene) {
    if (!scene || !scene.mapModel) return null;

    const mapModel = scene.mapModel;
    const required = this.getRequiredBatteries(scene);

    // Lấy thông tin robot từ mapModel
    const robotPos = { x: 0, y: 0 };
    const robotDirection = "north";

    // Tìm robot đầu tiên trong mapModel
    for (const robot of mapModel.robots.values()) {
      robotPos.x = robot.tileX || 0;
      robotPos.y = robot.tileY || 0;
      robotDirection = robot.direction || "north";
      break;
    }

    // Tạo mảng vị trí pin từ mapModel
    const batteryPositions = [];
    for (const battery of mapModel.batteries.values()) {
      batteryPositions.push({
        position: { x: battery.tileX, y: battery.tileY },
        count: battery.count || 1,
        type: battery.type || "green",
        types: battery.types,
      });
    }

    return {
      mapKey: mapModel.mapKey,
      robotPosition: robotPos,
      robotDirection,
      batteryPositions,
      requiredBatteries: required,
    };
  }

  /**
   * Lấy thông tin tổng quan cho tất cả các map
   * @param {Object} scene - Scene hiện tại (chứa mapModel)
   * @returns {Object} Thông tin tổng quan cho mỗi map
   */
  static getAllMapsSummary(scene) {
    const summary = {};

    if (scene && scene.mapModel) {
      summary[scene.mapModel.mapKey] = this.getMapSummary(scene);
    }

    return summary;
  }
}

/**
 * Kiểm tra statement requirements từ challenge.json
 * @param {Object} scene - Scene hiện tại
 * @returns {Object} Kết quả kiểm tra statement
 */
function checkStatementRequirements(scene) {
  if (!scene || !scene.mapModel) {
    return {
      isValid: false,
      message: "Scene hoặc mapModel không tồn tại",
      usedStatements: [],
      requiredStatements: [],
    };
  }

  // Lấy required statements từ challenge.json
  const requiredStatements =
    scene.mapModel.victoryConditions?.statement ||
    scene.challengeConfig?.statement ||
    [];

  if (!Array.isArray(requiredStatements) || requiredStatements.length === 0) {
    // Không có yêu cầu statement nào
    return {
      isValid: true,
      message: "Không có yêu cầu statement",
      usedStatements: [],
      requiredStatements: [],
    };
  }

  // Lấy used statements từ program executor
  const usedStatements = getUsedStatementsFromProgram(scene);

  // Kiểm tra xem có đủ statement không
  const missingStatements = requiredStatements.filter(
    (required) => !usedStatements.includes(required)
  );

  const isValid = missingStatements.length === 0;

  return {
    isValid: isValid,
    message: isValid
      ? "Đã sử dụng đủ statement theo yêu cầu"
      : `Thiếu statements: ${missingStatements.join(", ")}`,
    usedStatements: usedStatements,
    requiredStatements: requiredStatements,
    missingStatements: missingStatements,
  };
}

/**
 * Lấy danh sách statements đã sử dụng từ program
 * @param {Object} scene - Scene hiện tại
 * @returns {Array<string>} Danh sách statements đã sử dụng
 */
function getUsedStatementsFromProgram(scene) {
  // Kiểm tra program executor nếu có
  if (scene.programExecutor && scene.programExecutor.usedStatements) {
    // Sử dụng usedStatements Set từ ProgramExecutor
    return Array.from(scene.programExecutor.usedStatements);
  }

  // Fallback: kiểm tra program actions nếu không có usedStatements
  const usedStatements = [];
  if (scene.programExecutor && scene.programExecutor.program) {
    const program = scene.programExecutor.program;

    // Kiểm tra actions đã thực thi
    if (program.actions && Array.isArray(program.actions)) {
      for (const action of program.actions) {
        if (action.type) {
          // Thêm statement type vào danh sách
          if (!usedStatements.includes(action.type)) {
            usedStatements.push(action.type);
          }
        }
      }
    }
  }

  return usedStatements;
}

/**
 * Hàm kiểm tra và hiển thị trạng thái thắng/thua
 * @param {Object} scene - Scene hiện tại
 * @returns {Object} Kết quả kiểm tra
 */
export function checkAndDisplayVictory(scene) {
  const result = VictoryConditions.checkVictory(scene);

  // Kiểm tra statement requirements từ challenge.json
  const statementCheck = checkStatementRequirements(scene);

  // Kết hợp kết quả battery collection và statement requirements
  const finalResult = {
    ...result,
    statementCheck: statementCheck,
    isVictory: result.isVictory && statementCheck.isValid,
  };

  // Hiển thị thông tin trong console
  if (finalResult.isVictory) {
    console.log(
      `🏆 Chiến thắng! Đã thu thập đủ pin và sử dụng đủ statement theo yêu cầu`
    );
  } else {
    if (!result.isVictory) {
      console.log(`📊 Chưa thu thập đủ pin theo yêu cầu`);
    }
    if (!statementCheck.isValid) {
      console.log(
        `❌ Chưa sử dụng đủ statement theo yêu cầu: ${statementCheck.message}`
      );
    }
  }

  // Kiểm tra details có tồn tại không trước khi log
  if (result.details) {
    console.log(`   ${result.details.red}`);
    console.log(`   ${result.details.yellow}`);
    console.log(`   ${result.details.green}`);
  }

  // Hiển thị thông tin statement
  if (
    statementCheck.usedStatements &&
    statementCheck.usedStatements.length > 0
  ) {
    console.log(
      `   📝 Đã sử dụng statements: ${statementCheck.usedStatements.join(", ")}`
    );
  }
  if (
    statementCheck.requiredStatements &&
    statementCheck.requiredStatements.length > 0
  ) {
    console.log(
      `   📋 Yêu cầu statements: ${statementCheck.requiredStatements.join(
        ", "
      )}`
    );
  }

  // Gửi kết quả đến webview bên ngoài (chỉ thắng/thua)
  sendBatteryCollectionResult(scene, finalResult);

  return finalResult;
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
  const mapKey = scene.mapModel ? scene.mapModel.mapKey : "Unknown";
  let content = `Map: ${mapKey}\n`;
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
