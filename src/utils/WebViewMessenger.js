/**
 * WebViewMessenger.js
 *
 * Hệ thống giao tiếp giữa game Phaser và webview bên ngoài
 * Sử dụng window.parent.postMessage để gửi thông báo
 */

/**
 * Kiểm tra xem game có đang chạy trong iframe không
 * @returns {boolean} True nếu game đang chạy trong iframe
 */
export function isRunningInIframe() {
  try {
    return window.self !== window.parent;
  } catch (e) {
    return true; // Nếu có lỗi cross-origin, có thể đang trong iframe
  }
}

/**
 * Gửi thông báo đến trang web chứa iframe
 * @param {string} type - Loại thông báo
 * @param {Object} data - Dữ liệu kèm theo
 */
export function sendMessageToParent(type, data = {}) {
  if (isRunningInIframe()) {
    try {
      const message = {
        source: "phaser-robot-game",
        type: type,
        data: data,
        timestamp: Date.now(),
      };

      window.parent.postMessage(message, "*");
      console.log(`📤 Sent message to parent: ${type}`, data);
      return true;
    } catch (e) {
      console.error("❌ Error sending message to parent:", e);
      return false;
    }
  } else {
    console.log(`📝 Would send message (not in iframe): ${type}`, data);
    return false;
  }
}

/**
 * Gửi thông báo thắng đến trang web chứa iframe
 * @param {Object} victoryData - Dữ liệu về kết quả thắng
 */
export function sendVictoryMessage(victoryData) {
  return sendMessageToParent("VICTORY", victoryData);
}

/**
 * Gửi thông báo tiến độ đến trang web chứa iframe
 * @param {Object} progressData - Dữ liệu về tiến độ
 */
export function sendProgressMessage(progressData) {
  return sendMessageToParent("PROGRESS", progressData);
}

/**
 * Gửi thông báo lỗi đến trang web chứa iframe
 * @param {Object} errorData - Dữ liệu về lỗi
 */
export function sendErrorMessage(errorData) {
  return sendMessageToParent("ERROR", errorData);
}

/**
 * Thiết lập lắng nghe thông điệp từ trang web chứa iframe
 * @param {Function} callback - Hàm xử lý thông điệp nhận được
 */
export function setupMessageListener(callback) {
  window.addEventListener("message", (event) => {
    // Kiểm tra nguồn thông điệp để đảm bảo an toàn
    // Trong môi trường thực tế, nên kiểm tra origin
    try {
      const message = event.data;

      // Kiểm tra xem thông điệp có đúng định dạng không
      if (message && message.source === "parent-website") {
        console.log(`📥 Received message from parent:`, message);

        // Gọi callback để xử lý thông điệp
        if (typeof callback === "function") {
          callback(message);
        }
      }
    } catch (e) {
      console.error("❌ Error processing message from parent:", e);
    }
  });
}

/**
 * Gửi thông báo sẵn sàng đến trang web chứa iframe
 */
export function sendReadyMessage() {
  return sendMessageToParent("READY", {
    gameVersion: "1.0.0",
    features: ["robot-programming", "battery-collection"],
  });
}

/**
 * Gửi thông báo kết quả thu thập pin
 * @param {Object} scene - Scene hiện tại
 * @param {Object} victoryResult - Kết quả kiểm tra thắng thua
 */
export function sendBatteryCollectionResult(scene, victoryResult) {
  const messageType = victoryResult.isVictory ? "VICTORY" : "PROGRESS";

  const messageData = {
    mapKey: scene.mapKey,
    isVictory: victoryResult.isVictory,
    progress: victoryResult.progress,
    message: victoryResult.message,
    collected: {
      total: victoryResult.collected.total,
      byType: victoryResult.collected.byType,
    },
    required: {
      total: victoryResult.required.total,
      byType: victoryResult.required.byType,
    },
  };

  return sendMessageToParent(messageType, messageData);
}

/**
 * Khởi tạo hệ thống giao tiếp với webview
 * @param {Object} game - Đối tượng game Phaser
 */
export function initWebViewCommunication(game) {
  // Gửi thông báo sẵn sàng khi game khởi tạo xong
  sendReadyMessage();

  // Thiết lập lắng nghe thông điệp từ trang web chứa iframe
  setupMessageListener((message) => {
    // Xử lý các loại thông điệp từ trang web chứa
    switch (message.type) {
      case "LOAD_MAP":
        // Xử lý yêu cầu tải map
        if (message.data && message.data.mapKey) {
          const scene = game.scene.getScene("Scene");
          if (scene) {
            // Khởi động lại scene với mapKey mới
            scene.scene.restart({ mapKey: message.data.mapKey });
          }
        }
        break;

      case "RUN_PROGRAM":
        // Xử lý yêu cầu chạy chương trình
        if (message.data && message.data.program) {
          const scene = game.scene.getScene("Scene");
          if (scene) {
            scene.loadProgram(message.data.program, true);
          }
        }
        break;

      case "GET_STATUS":
        // Gửi trạng thái hiện tại
        const scene = game.scene.getScene("Scene");
        if (scene) {
          const status = {
            mapKey: scene.mapKey,
            collectedBatteries: scene.collectedBatteries || 0,
            collectedBatteryTypes: scene.collectedBatteryTypes || {
              red: 0,
              yellow: 0,
              green: 0,
            },
          };
          sendMessageToParent("STATUS", status);
        }
        break;
    }
  });

  // Thêm API toàn cục cho webview gọi trực tiếp (tùy chọn)
  window.RobotGameAPI = {
    loadMap: (mapKey) => {
      const scene = game.scene.getScene("Scene");
      if (scene) {
        scene.scene.restart({ mapKey });
        return true;
      }
      return false;
    },

    runProgram: (program) => {
      const scene = game.scene.getScene("Scene");
      if (scene) {
        return scene.loadProgram(program, true);
      }
      return false;
    },

    getStatus: () => {
      const scene = game.scene.getScene("Scene");
      if (scene) {
        return {
          mapKey: scene.mapKey,
          collectedBatteries: scene.collectedBatteries || 0,
          collectedBatteryTypes: scene.collectedBatteryTypes || {
            red: 0,
            yellow: 0,
            green: 0,
          },
        };
      }
      return null;
    },
  };
}
