/**
 * WebViewMessenger.js
 *
 * Hệ thống giao tiếp giữa game Phaser và webview bên ngoài
 * Sử dụng PhaserChannel để giao tiếp với Flutter WebView
 */

import { getPhaserChannel } from './PhaserChannel.js';

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
  const channel = getPhaserChannel();
  
  if (isRunningInIframe()) {
    try {
      // Use PhaserChannel for structured communication
      switch (type) {
        case 'VICTORY':
          channel.sendVictory(data);
          break;
        case 'LOSE':
          channel.sendDefeat(data);
          break;
        case 'PROGRESS':
          channel.sendProgress(data);
          break;
        case 'ERROR':
          channel.sendError(data);
          break;
        case 'READY':
          channel.sendReady(data);
          break;
        default:
          channel.sendEvent(type.toLowerCase(), data);
      }
      
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
export function sendVictoryMessage() {
  return sendMessageToParent("VICTORY", { isVictory: true });
}

/**
 * Gửi thông báo tiến độ đến trang web chứa iframe
 * @param {Object} progressData - Dữ liệu về tiến độ
 */
export function sendProgressMessage(progressData) {
  return sendMessageToParent("PROGRESS", progressData);
}

/**
 * Gửi thông báo thua đến trang web chứa iframe
 * @param {Object} loseData - Dữ liệu về thua cuộc
 */
export function sendLoseMessage() {
  return sendMessageToParent("LOSE", { isVictory: false });
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
  const channel = getPhaserChannel();
  
  // Register event handlers for different message types
  channel.on('start_map', (data) => {
    console.log(`📥 Received START_MAP event:`, data);
    if (typeof callback === "function") {
      callback({ type: 'START_MAP', data });
    }
  });
  
  channel.on('load_map', (data) => {
    console.log(`📥 Received LOAD_MAP event:`, data);
    if (typeof callback === "function") {
      callback({ type: 'LOAD_MAP', data });
    }
  });
  
  channel.on('run_program', (data) => {
    console.log(`📥 Received RUN_PROGRAM event:`, data);
    if (typeof callback === "function") {
      callback({ type: 'RUN_PROGRAM', data });
    }
  });
  
  channel.on('get_status', (data) => {
    console.log(`📥 Received GET_STATUS event:`, data);
    if (typeof callback === "function") {
      callback({ type: 'GET_STATUS', data });
    }
  });
  
  // Legacy message listener for backward compatibility
  window.addEventListener("message", (event) => {
    try {
      const message = event.data;

      // Kiểm tra xem thông điệp có đúng định dạng không
      if (message && message.source === "parent-website") {
        console.log(`📥 Received legacy message from parent:`, message);

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
  const messageType = victoryResult.isVictory ? "VICTORY" : "LOSE";
  
  // Sử dụng cùng cấu trúc dữ liệu như PhaserChannel
  const statusData = {
    isVictory: victoryResult.isVictory,
    mapKey: scene.mapKey,
    collectedBatteries: scene.collectedBatteries || 0,
    collectedBatteryTypes: scene.collectedBatteryTypes || { red: 0, yellow: 0, green: 0 },
    requiredBatteries: victoryResult.required || { red: 0, yellow: 0, green: 0 },
    details: victoryResult.details || {},
    robotPosition: scene.robot ? { x: scene.robot.x, y: scene.robot.y } : null,
    isPaused: scene.scene ? scene.scene.isPaused() : false,
    score: scene.collectedBatteries || 0,
    timestamp: Date.now()
  };

  return sendMessageToParent(messageType, statusData);
}

/**
 * Khởi tạo hệ thống giao tiếp với webview
 * @param {Object} game - Đối tượng game Phaser
 */
export function initWebViewCommunication(game) {
  // Initialize PhaserChannel with game instance
  const channel = getPhaserChannel({ debug: true });
  
  // Store game reference globally for channel methods
  window.game = game;

  // Gửi thông báo sẵn sàng khi game khởi tạo xong
  sendReadyMessage();

  // Thiết lập lắng nghe thông điệp từ trang web chứa iframe
  setupMessageListener((message) => {
    // Xử lý các loại thông điệp từ trang web chứa
    switch (message.type) {
      case "START_MAP": {
        // Bắt đầu trực tiếp Scene với mapKey (bỏ qua menu)
        const mapKey = message.data && message.data.mapKey;
        if (mapKey) {
          console.log(`▶️ START_MAP: ${mapKey}`);
          game.scene.start("Scene", { mapKey });
        }
        break;
      }
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

  // Expose PhaserChannel globally for advanced usage
  window.PhaserChannel = channel;
}
