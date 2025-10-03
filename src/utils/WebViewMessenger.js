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
  const message = {
    source: "phaser-robot-game",
    type,
    data,
    timestamp: Date.now(),
  };

  let sent = false;

  // 1) Nếu có Flutter JS channel (webview_flutter)
  if (window.PhaserChannel?.postMessage) {
    window.PhaserChannel.postMessage(JSON.stringify(message));
    sent = true;
  }

  // 2) Emit event qua PhaserChannel để Flutter có thể lắng nghe bằng .on()
  if (window.PhaserChannel?.emit) {
    window.PhaserChannel.emit(type, message.data);
    sent = true;
  }

  // 3) Nếu đang ở trong iframe → gửi cho trang web parent
  if (isRunningInIframe && isRunningInIframe()) {
    window.parent.postMessage(message, "*"); // TODO: đặt origin cụ thể
    sent = true;
  }

  if (!sent) {
    console.log("📝 Would send (no bridge/iframe):", message);
  }

  return sent;
}

/**
 * Gửi thông báo thắng đến trang web chứa iframe
 * @param {Object} [victoryData] - Dữ liệu về kết quả thắng (ví dụ: { score })
 */
export function sendVictoryMessage(victoryData = {}) {
  return sendMessageToParent("VICTORY", { isVictory: true, ...victoryData });
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
 * @param {string} loseData.reason - Lý do thua (ví dụ: "OUT_OF_BATTERY", "COLLISION", "OUT_OF_BOUNDS", "TIMEOUT")
 * @param {string} [loseData.message] - Thông báo chi tiết về lý do thua
 * @param {Object} [loseData.details] - Thông tin bổ sung về lý do thua
 */
export function sendLoseMessage(loseData = {}) {
  return sendMessageToParent("LOSE", {
    isVictory: false,
    reason: loseData.reason || "UNKNOWN",
    message: loseData.message || "Game over",
    details: loseData.details || {},
  });
}

/**
 * Gửi danh sách actions đã compile từ chương trình Blockly (headless)
 * @param {Object} payload
 * @param {Array}  payload.actions - Danh sách primitive actions
 * @param {Object} [payload.result] - Kết quả tóm tắt (isVictory, message, etc.)
 */
export function sendCompiledActions(payload) {
  const data = {
    actions: Array.isArray(payload?.actions) ? payload.actions : [],
    result: payload?.result || null,
  };
  try {
    const preview = data.actions.slice(0, 10);
    console.log(
      `📤 PROGRAM_COMPILED_ACTIONS → sending ${data.actions.length} action(s)`,
      preview
    );
    console.log("📤 Actions detail (full):", data.actions);
    if (data.result) {
      console.log("📤 Headless result:", data.result);
    }
  } catch (_) {}
  return sendMessageToParent("PROGRAM_COMPILED_ACTIONS", data);
}

/**
 * Chuyển danh sách action dạng string sang format program chuẩn
 * Ví dụ input: ["forward","turnRight","collectYellow","collectYellow","victory"]
 * Output actions:
 *   [ { type: "forward", count: 1 },
 *     { type: "turnRight" },
 *     { type: "collect", color: "yellow", count: 2 } ]
 * Bỏ qua các token không hỗ trợ như "victory", "defeat".
 *
 * @param {Array<string>} strActions - Danh sách action dạng string
 * @param {Object} [meta] - Thông tin phụ (version, programName, ...)
 * @returns {Object} program JSON chuẩn
 */
function normalizeStringActionsToProgram(strActions, meta = {}) {
  const actions = Array.isArray(strActions) ? strActions : [];

  const result = [];
  let pending = null; // { type, count, color? }

  const flush = () => {
    if (!pending) return;
    // Sao chép để tránh bị mutate ngoài ý muốn
    const entry = { type: pending.type };
    if (typeof pending.count === "number") entry.count = pending.count;
    if (typeof pending.color === "string") entry.color = pending.color;
    result.push(entry);
    pending = null;
  };

  const toCollectColor = (token) => {
    if (token === "collectYellow") return "yellow";
    if (token === "collectGreen") return "green";
    if (token === "collectRed") return "red";
    return null;
  };

  for (const token of actions) {
    if (token === "forward") {
      if (pending && pending.type === "forward") {
        pending.count += 1;
      } else {
        flush();
        pending = { type: "forward", count: 1 };
      }
      continue;
    }

    if (token === "turnLeft" || token === "turnRight" || token === "turnBack") {
      flush();
      result.push({ type: token });
      continue;
    }

    const color = toCollectColor(token);
    if (color) {
      if (pending && pending.type === "collect" && pending.color === color) {
        pending.count += 1;
      } else {
        flush();
        pending = { type: "collect", color, count: 1 };
      }
      continue;
    }

    // Bỏ qua các token không hỗ trợ hoặc đánh dấu kết thúc như "victory"/"defeat"
    if (token === "victory" || token === "defeat") {
      // ignore
      continue;
    }

    // Token lạ: bỏ qua
    // console.warn("Unknown action token:", token);
  }

  // Đẩy phần pending cuối cùng nếu có
  flush();

  return {
    version: meta.version || "1.0.0",
    programName: meta.programName || "headless_from_actions",
    actions: result,
  };
}

/**
 * Gửi thông báo lỗi đến trang web chứa iframe
 * @param {Object} errorData - Dữ liệu về lỗi
 */
export function sendErrorMessage(errorData) {
  return sendMessageToParent("ERROR", errorData);
}

/**
 * Lắng nghe thông điệp từ parent (postMessage) và từ PhaserChannel (emit)
 * @param {Function} callback - Hàm xử lý thông điệp nhận được
 * @param {Object} [options]
 * @param {string[]} [options.allowedOrigins=[]] - Whitelist origin cho postMessage
 * @param {string[]} [options.channelEvents=["*"]] - Các sự kiện muốn nghe từ PhaserChannel (mặc định wildcard)
 * @param {number}   [options.waitMs=5000] - Thời gian chờ PhaserChannel sẵn sàng
 * @param {number}   [options.pollMs=100]  - Tần suất kiểm tra PhaserChannel
 * @returns {Function} cleanup - gọi để gỡ tất cả listener
 */
export function setupMessageListener(callback, options = {}) {
  const {
    allowedOrigins = [],
    channelEvents = ["*"],
    waitMs = 5000,
    pollMs = 100,
  } = options;

  // --- 1) Listener cho postMessage từ parent website ---
  const messageHandler = (event) => {
    try {
      // Bảo mật origin (nếu cấu hình)
      if (Array.isArray(allowedOrigins) && allowedOrigins.length > 0) {
        if (!allowedOrigins.includes(event.origin)) return; // Bỏ qua nguồn lạ
      }

      const message = event.data;
      // Chỉ nhận đúng schema mong muốn từ parent website
      if (message && message.source === "parent-website") {
        // Chuẩn hoá payload cho đồng nhất
        const normalized = {
          source: "parent-website",
          type: message.type,
          data: message.data,
          timestamp:
            typeof message.timestamp === "number"
              ? message.timestamp
              : Date.now(),
          _raw: message,
        };
        if (typeof callback === "function") callback(normalized);
      }
    } catch (e) {
      console.error("❌ Error processing message from parent:", e);
    }
  };
  window.addEventListener("message", messageHandler);

  // --- 2) Listener cho sự kiện đi vào từ PhaserChannel ---
  const offFns = [];
  let pollId = null;
  let timeoutId = null;

  const attachPhaserChannelListeners = (pc) => {
    try {
      if (!pc) return;
      // Ưu tiên API dạng .on(type, handler)
      if (typeof pc.on === "function") {
        channelEvents.forEach((evt) => {
          const off = pc.on(evt, (payload) => {
            // payload kỳ vọng dạng { source, type, data, timestamp } do bên emit truyền vào
            const normalized = {
              source: "phaser-channel",
              type: payload?.type ?? evt,
              data: payload?.data ?? payload,
              timestamp:
                typeof payload?.timestamp === "number"
                  ? payload.timestamp
                  : Date.now(),
              _raw: payload,
            };
            if (typeof callback === "function") callback(normalized);
          });
          // Nếu .on trả về hàm off thì lưu lại, nếu không thì tạo off rỗng
          offFns.push(typeof off === "function" ? off : () => {});
        });
        return true;
      }

      // Trường hợp không có .on/.emit (kênh tự triển khai khác) thì bạn có thể
      // bổ sung nhánh này để thích ứng, ví dụ: pc.addEventListener(...)
      // Ở đây mình chỉ hỗ trợ chuẩn .on/.emit để tối giản như yêu cầu “chỉ sửa trong setupMessageListener”.
      console.warn(
        "[setupMessageListener] PhaserChannel không có .on(); bỏ qua."
      );
      return false;
    } catch (e) {
      console.error("❌ Error attaching PhaserChannel listeners:", e);
      return false;
    }
  };

  // Gắn ngay nếu đã có sẵn
  if (window.PhaserChannel) {
    attachPhaserChannelListeners(window.PhaserChannel);
  } else {
    // Poll chờ PhaserChannel xuất hiện (khi bundle khởi tạo xong)
    pollId = setInterval(() => {
      if (window.PhaserChannel) {
        clearInterval(pollId);
        pollId = null;
        attachPhaserChannelListeners(window.PhaserChannel);
      }
    }, pollMs);

    timeoutId = setTimeout(() => {
      if (pollId) clearInterval(pollId);
      pollId = null;
      timeoutId = null;
      // Không có PhaserChannel trong khoảng waitMs – không sao, vẫn chỉ nghe postMessage
      // console.debug("[setupMessageListener] Hết thời gian chờ PhaserChannel.");
    }, waitMs);
  }

  // --- Cleanup ---
  return function cleanup() {
    window.removeEventListener("message", messageHandler);
    offFns.forEach((off) => {
      try {
        off();
      } catch {}
    });
    if (pollId) clearInterval(pollId);
    if (timeoutId) clearTimeout(timeoutId);
  };
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
  if (victoryResult.isVictory) {
    const payload = {};
    if (typeof victoryResult.starScore === "number") {
      payload.score = victoryResult.starScore;
    }
    return sendVictoryMessage(payload);
  } else {
    // Truyền chi tiết lý do thua từ victoryResult
    const loseData = {
      reason: victoryResult.reason || "GAME_OVER",
      message: victoryResult.message || "Game over",
      details: victoryResult.details || {},
    };
    return sendLoseMessage(loseData);
  }
}

/**
 * Xử lý việc load mapJson và challengeJson từ webview
 * @param {Object} game - Đối tượng game Phaser
 * @param {Object} mapJson - Dữ liệu map JSON
 * @param {Object} challengeJson - Dữ liệu challenge JSON
 * @returns {boolean} Success/failure
 */
export function loadMapAndChallenge(game, mapJson, challengeJson) {
  try {
    if (!mapJson || !challengeJson) {
      console.error(
        "❌ loadMapAndChallenge: mapJson and challengeJson are required"
      );
      return false;
    }

    console.log("📥 Loading mapJson and challengeJson from webview");

    const scene = game.scene.getScene("Scene");
    if (scene) {
      // Khởi động lại scene với mapJson và challengeJson mới
      scene.scene.restart({ mapJson, challengeJson });
    } else {
      // Nếu scene chưa tồn tại, tạo mới
      game.scene.start("Scene", { mapJson, challengeJson });
    }

    return true;
  } catch (error) {
    console.error("❌ Error loading mapJson and challengeJson:", error);
    sendErrorMessage({
      type: "LOAD_ERROR",
      message: error.message,
    });
    return false;
  }
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
      case "START_MAP": {
        // Bắt đầu trực tiếp Scene với mapJson và challengeJson
        const mapJson = message.data && message.data.mapJson;
        const challengeJson = message.data && message.data.challengeJson;
        if (mapJson && challengeJson) {
          console.log(`▶️ START_MAP with mapJson and challengeJson`);
          game.scene.start("Scene", { mapJson, challengeJson });
        } else if (mapJson) {
          console.log(`▶️ START_MAP with mapJson only`);
          game.scene.start("Scene", { mapJson });
        } else {
          console.warn("⚠️ START_MAP: Missing mapJson or challengeJson");
        }
        break;
      }
      case "LOAD_MAP":
        // Xử lý yêu cầu tải map (deprecated - sử dụng LOAD_MAP_AND_CHALLENGE)
        console.warn(
          "⚠️ LOAD_MAP is deprecated. Use LOAD_MAP_AND_CHALLENGE instead."
        );
        break;

      case "LOAD_MAP_AND_CHALLENGE":
        // Xử lý yêu cầu tải mapJson và challengeJson
        const mapJsonData = message.data && message.data.mapJson;
        const challengeJsonData = message.data && message.data.challengeJson;

        if (mapJsonData && challengeJsonData) {
          console.log(
            `📥 LOAD_MAP_AND_CHALLENGE: Received mapJson and challengeJson`
          );

          const scene = game.scene.getScene("Scene");
          if (scene) {
            // Khởi động lại scene với mapJson và challengeJson mới
            scene.scene.restart({
              mapJson: mapJsonData,
              challengeJson: challengeJsonData,
            });
          } else {
            // Nếu scene chưa tồn tại, tạo mới
            game.scene.start("Scene", {
              mapJson: mapJsonData,
              challengeJson: challengeJsonData,
            });
          }
        } else {
          console.warn(
            "⚠️ LOAD_MAP_AND_CHALLENGE: Missing mapJson or challengeJson"
          );
          sendErrorMessage({
            type: "MISSING_DATA",
            message: "mapJson and challengeJson are required",
          });
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

      case "RUN_PROGRAM_HEADLESS": {
        // Thực thi ngầm: compile → simulate → trả actions + kết quả, KHÔNG cập nhật UI
        const scene = game.scene.getScene("Scene");
        let program = message.data && message.data.program;
        // Hỗ trợ schema mới: truyền trực tiếp actions dạng string
        if (!program && Array.isArray(message?.data?.actions)) {
          program = normalizeStringActionsToProgram(message.data.actions, message.data);
        }
        // Hỗ trợ trường hợp program.actions vẫn là mảng string
        if (
          program &&
          Array.isArray(program.actions) &&
          program.actions.length > 0 &&
          typeof program.actions[0] === "string"
        ) {
          program = normalizeStringActionsToProgram(program.actions, program);
        }
        if (scene && program) {
          try {
            const ok = scene.loadProgram(program, false);
            if (!ok) {
              sendErrorMessage({
                type: "PROGRAM_LOAD_FAILED",
                message: "Invalid program",
              });
              break;
            }

            // Chạy headless để lấy primitive actions và kết quả
            const result =
              scene.programExecutor?.compileProgramToPrimitiveActions?.();

            try {
              const count = Array.isArray(result?.actions)
                ? result.actions.length
                : 0;
              console.log(
                `✅ RUN_PROGRAM_HEADLESS compiled ${count} primitive action(s)`
              );
              console.log("✅ Actions detail (full):", result?.actions || []);
            } catch (_) {}

            if (result && Array.isArray(result.actions)) {
              sendCompiledActions(result);
            } else {
              sendErrorMessage({
                type: "HEADLESS_EXECUTION_FAILED",
                message: "Compilation produced no actions",
              });
            }
          } catch (e) {
            console.error("❌ RUN_PROGRAM_HEADLESS error:", e);
            sendErrorMessage({
              type: "HEADLESS_EXECUTION_ERROR",
              message: e?.message || String(e),
            });
          }
        }
        break;
      }

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

      case "RESTART_SCENE":
        // Khởi động lại scene hiện tại với dữ liệu đang có
        {
          const current = game.scene.getScene("Scene");
          if (current) {
            const payload = {
              mapJson: current.mapJson || null,
              challengeJson: current.challengeJson || null,
            };
            current.scene.restart(payload);
          } else {
            // Nếu scene chưa chạy, chỉ cần start (sẽ hiện loading UI nếu thiếu data)
            game.scene.start("Scene", {});
          }
        }
        break;

      case "EXECUTE_PHYSICAL_ROBOT_ACTIONS":
        // Xử lý thực thi actions từ robot vật lý
        {
          const scene = game.scene.getScene("Scene");
          if (scene && message.data && message.data.actions) {
            console.log(
              `🤖 Received ${message.data.actions.length} actions from physical robot`
            );

            scene
              .executePhysicalRobotActions(message.data.actions)
              .then((result) => {
                console.log("🤖 Physical robot execution completed:", result);

                // Gửi kết quả về frontend
                if (result.isVictory) {
                  sendVictoryMessage({
                    reason: "PHYSICAL_ROBOT_SUCCESS",
                    message: result.message,
                    details: result.details,
                    executionTime: result.executionTime,
                    totalSteps: result.totalSteps,
                    robotPosition: result.robotPosition,
                    robotDirection: result.robotDirection,
                  });
                } else {
                  sendLoseMessage({
                    reason: "PHYSICAL_ROBOT_FAILED",
                    message: result.message,
                    details: result.details,
                    executionTime: result.executionTime,
                    totalSteps: result.totalSteps,
                    failedStep: result.step,
                    failedAction: result.failedAction,
                    error: result.error,
                  });
                }
              })
              .catch((error) => {
                console.error("❌ Physical robot execution error:", error);
                sendLoseMessage({
                  reason: "PHYSICAL_ROBOT_ERROR",
                  message: `Execution error: ${error.message}`,
                  error: error,
                });
              });
          } else {
            console.error("❌ Invalid physical robot actions data");
            sendErrorMessage({
              type: "INVALID_DATA",
              message: "Invalid actions data for physical robot execution",
            });
          }
        }
        break;

      case "GET_PHYSICAL_ROBOT_STATUS":
        // Lấy trạng thái ActionExecutor
        {
          const scene = game.scene.getScene("Scene");
          if (scene) {
            const status = {
              isPhysicalRobotMode: scene.isPhysicalRobotMode(),
              actionExecutorStatus: scene.getActionExecutorStatus(),
              gameState: scene.gameState,
            };
            sendMessageToParent("PHYSICAL_ROBOT_STATUS", status);
          }
        }
        break;
    }
  });

  // Thêm API toàn cục cho webview gọi trực tiếp (tùy chọn)
  window.RobotGameAPI = {
    loadMapAndChallenge: (mapJson, challengeJson) => {
      return loadMapAndChallenge(game, mapJson, challengeJson);
    },

    runProgram: (program) => {
      const scene = game.scene.getScene("Scene");
      if (scene) {
        // Kiểm tra trạng thái game trước khi chạy program
        if (scene.gameState === "lost" || scene.gameState === "won") {
          console.warn("⚠️ Cannot run program: Game is in lost or won state");
          return false;
        }
        return scene.loadProgram(program, true);
      }
      return false;
    },

    getStatus: () => {
      const scene = game.scene.getScene("Scene");
      if (scene) {
        return {
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

    restart: () => {
      const scene = game.scene.getScene("Scene");
      if (scene) {
        scene.scene.restart({
          mapJson: scene.mapJson || null,
          challengeJson: scene.challengeJson || null,
        });
        return true;
      }
      game.scene.start("Scene", {});
      return true;
    },

    // Physical Robot API
    executePhysicalRobotActions: async (actions) => {
      const scene = game.scene.getScene("Scene");
      if (scene) {
        try {
          const result = await scene.executePhysicalRobotActions(actions);
          return result;
        } catch (error) {
          console.error("❌ Physical robot execution failed:", error);
          return {
            isVictory: false,
            message: `Execution failed: ${error.message}`,
            error: error,
          };
        }
      }
      return {
        isVictory: false,
        message: "Scene not available",
        error: "Scene not initialized",
      };
    },

    getPhysicalRobotStatus: () => {
      const scene = game.scene.getScene("Scene");
      if (scene) {
        return {
          isPhysicalRobotMode: scene.isPhysicalRobotMode(),
          actionExecutorStatus: scene.getActionExecutorStatus(),
          gameState: scene.gameState,
        };
      }
      return null;
    },

    isPhysicalRobotMode: () => {
      const scene = game.scene.getScene("Scene");
      return scene ? scene.isPhysicalRobotMode() : false;
    },
  };
}
