import "./style.css";
import Phaser from "phaser";
import MenuScene from "./scenes/MenuScene";
import Scene from "./scenes/basics/Scene";
import { initWebViewCommunication } from "./utils/WebViewMessenger";

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
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
    },
  },
  scene: [MenuScene, Scene],
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
