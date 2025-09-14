import "./style.css";
import Phaser from "phaser";
import MenuScene from "./scenes/MenuScene.js";
import GameScene from "./scenes/GameScene.js";
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
  scene: [MenuScene, GameScene],
};

const game = new Phaser.Game(config);

// Đảm bảo MenuScene được start ngay lập tức
setTimeout(() => {
  game.scene.start("MenuScene");
}, 100);

// Khởi tạo hệ thống giao tiếp với webview
window.addEventListener("load", () => {
  // Đợi game khởi tạo xong
  setTimeout(() => {
    initWebViewCommunication(game);
  }, 1000);
});
