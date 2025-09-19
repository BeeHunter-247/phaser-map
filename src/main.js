import "./style.css";
import Phaser from "phaser";
import Scene from "./scenes/Scene";
import { initWebViewCommunication } from "./utils/WebViewMessenger";

// Tạo PhaserChannel object để Flutter có thể giao tiếp
class PhaserChannelEmitter {
  constructor() {
    this.listeners = new Map();
  }

  // Method để Flutter gọi: window.PhaserChannel.sendEvent('load_map', { mapKey: 'map1' })
  sendEvent(eventType, data) {
    console.log(`📨 PhaserChannel received event: ${eventType}`, data);

    // Emit event để WebViewMessenger có thể lắng nghe
    this.emit(eventType, {
      source: "flutter",
      type: eventType,
      data: data,
      timestamp: Date.now(),
    });
  }

  // Method để gửi message (tương thích với code hiện tại)
  postMessage(message) {
    console.log(`📨 PhaserChannel received message:`, message);
    try {
      const parsed = JSON.parse(message);
      this.emit("message", parsed);
    } catch (e) {
      console.error("❌ Failed to parse PhaserChannel message:", e);
    }
  }

  // EventEmitter pattern methods
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);

    // Return cleanup function
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  emit(eventType, data) {
    const callbacks = this.listeners.get(eventType) || [];
    const wildcardCallbacks = this.listeners.get("*") || [];

    // Call specific event listeners
    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (e) {
        console.error(
          `❌ Error in PhaserChannel listener for ${eventType}:`,
          e
        );
      }
    });

    // Call wildcard listeners
    wildcardCallbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (e) {
        console.error(`❌ Error in PhaserChannel wildcard listener:`, e);
      }
    });
  }
}

// Tạo PhaserChannel ngay khi script load
window.PhaserChannel = new PhaserChannelEmitter();
console.log("✅ PhaserChannel created and available globally");

const sizes = {
  width: 1400,
  height: 800,
};

const config = {
  type: Phaser.AUTO,
  width: sizes.width,
  height: sizes.height,
  parent: "app",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 800,
      height: 400,
    },
    max: {
      width: 1920,
      height: 1080,
    },
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
    },
  },
  scene: [Scene],
};

const game = new Phaser.Game(config);

// Khởi tạo hệ thống giao tiếp với webview
window.addEventListener("load", () => {
  // Đợi game khởi tạo xong
  setTimeout(() => {
    initWebViewCommunication(game);
    console.log("🔄 WebView communication initialized");
  }, 1000);
});
