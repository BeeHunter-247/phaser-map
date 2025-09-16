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

// --- Simple queue/retry for starting the Scene with backend data ---
let __latestStartPayload = null;
let __startRetryCount = 0;
const __MAX_START_RETRIES = 20;
const __RETRY_DELAY_MS = 200;

function __tryStartScene(game) {
  if (!__latestStartPayload) return;
  try {
    const { mapJson, challengeJson } = __latestStartPayload;
    const scene = game.scene.getScene("Scene");
    if (scene) {
      scene.scene.restart({ mapJson, challengeJson });
    } else {
      game.scene.start("Scene", { mapJson, challengeJson });
    }
    return true;
  } catch (e) {
    console.warn("⏳ Retry start Scene later due to error:", e?.message || e);
    return false;
  }
}

function __ensureSceneStart(game) {
  if (!__latestStartPayload) return;
  const ok = __tryStartScene(game);
  if (!ok && __startRetryCount < __MAX_START_RETRIES) {
    __startRetryCount++;
    setTimeout(() => __ensureSceneStart(game), __RETRY_DELAY_MS);
  }
}

/**
 * Tải challenge từ BE bằng challengeId và Bearer token
 * @param {string} apiBase - API base URL (ví dụ: https://ottobit-be.felixtien.dev)
 * @param {string} challengeId - Challenge ID
 * @param {string} token - Bearer token (không cần prefix "Bearer ")
 * @returns {Promise<{ mapJson: Object, challengeJson: Object, raw: Object }>} Parsed data
 */
async function fetchChallengeById(apiBase, challengeId, token) {
  const url = `${apiBase.replace(/\/$/, "")}/api/v1/challenges/${challengeId}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "*/*",
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${res.statusText} ${text}`.trim());
  }

  const json = await res.json();
  const payload = json?.data || {};

  // mapJson và challengeJson có thể là string JSON ⇒ parse
  let mapJsonParsed = payload.mapJson;
  if (typeof mapJsonParsed === "string") {
    mapJsonParsed = JSON.parse(mapJsonParsed);
  }
  console.log("mapJsonParsed", mapJsonParsed);
  let challengeJsonParsed = payload.challengeJson;
  if (typeof challengeJsonParsed === "string") {
    challengeJsonParsed = JSON.parse(challengeJsonParsed);
  }

  if (!mapJsonParsed || !challengeJsonParsed) {
    throw new Error("Missing mapJson or challengeJson in response");
  }

  return {
    mapJson: mapJsonParsed,
    challengeJson: challengeJsonParsed,
    raw: json,
  };
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

      case "LOAD_CHALLENGE": {
        // Tải challenge từ BE bằng id + token
        const data = message.data || {};
        const challengeId = data.challengeId || data.id;
        const token = data.token || data.authorization || data.authToken;
        const apiBase = data.apiBase || "https://ottobit-be.felixtien.dev";

        if (!challengeId || !token) {
          sendErrorMessage({
            type: "MISSING_DATA",
            message: "LOAD_CHALLENGE requires challengeId and token",
          });
          break;
        }

        console.log(`🌐 LOAD_CHALLENGE: Fetching ${challengeId} from API...`);
        fetchChallengeById(apiBase, challengeId, token)
          .then(({ mapJson, challengeJson }) => {
            console.log("✅ Challenge fetched. Starting scene...");
            console.log("🗺️ mapJson (parsed):", mapJson);
            __latestStartPayload = { mapJson, challengeJson };
            __startRetryCount = 0;
            __ensureSceneStart(game);
            sendMessageToParent("CHALLENGE_LOADED", {
              challengeId,
              ok: true,
            });
          })
          .catch((err) => {
            console.error("❌ Failed to fetch challenge:", err);
            sendErrorMessage({
              type: "LOAD_CHALLENGE_ERROR",
              message: err?.message || String(err),
              challengeId,
            });
          });
        break;
      }

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
    loadMapAndChallenge: (mapJson, challengeJson) => {
      return loadMapAndChallenge(game, mapJson, challengeJson);
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

    loadChallengeById: async ({
      challengeId,
      token,
      apiBase = "https://ottobit-be.felixtien.dev",
    }) => {
      const { mapJson, challengeJson } = await fetchChallengeById(
        apiBase,
        challengeId,
        token
      );
      console.log("🗺️ mapJson (parsed):", mapJson);
      __latestStartPayload = { mapJson, challengeJson };
      __startRetryCount = 0;
      __ensureSceneStart(game);
      return true;
    },
  };

  // Nếu payload đã đến trước khi init hệ thống, đảm bảo khởi động scene
  if (__latestStartPayload) {
    __startRetryCount = 0;
    __ensureSceneStart(game);
  }
}
