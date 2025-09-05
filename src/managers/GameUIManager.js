import {
    createBatteryStatusText,
    updateBatteryStatusText,
  } from "../utils/VictoryConditions.js";
  
  /**
   * GameUIManager - Quản lý UI elements và notifications
   * 
   * Tách từ Scene.js để tách biệt trách nhiệm
   * Xử lý tất cả UI elements, notifications, và visual feedback
   */
  export class GameUIManager {
    constructor(scene) {
      this.scene = scene;
      this.statusText = null;
    }
  
    /**
     * Khởi tạo UI Manager
     */
    initialize() {
      // Tạo status UI
      this.createStatusUI();
    }
  
    /**
     * Tạo status UI cho progress/victory
     */
    createStatusUI() {
      this.statusText = createBatteryStatusText(this.scene);
    }
  
    /**
     * Cập nhật status UI
     */
    updateStatusUI() {
      if (this.statusText) {
        updateBatteryStatusText(this.scene, this.statusText);
      }
    }
  
    /**
     * Hiển thị toast ngắn gọn ở giữa trên màn hình
     * @param {string} message - Message to display
     * @param {string} background - Background color (default: "#333333")
     */
    showToast(message, background = "#333333") {
      const x = this.scene.cameras.main.width / 2;
      const y = 40;
      const text = this.scene.add.text(x, y, message, {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#ffffff",
        backgroundColor: background,
        padding: { x: 12, y: 6 },
      });
      text.setOrigin(0.5, 0.5);
      this.scene.tweens.add({
        targets: text,
        alpha: { from: 1, to: 0 },
        duration: 1200,
        delay: 600,
        onComplete: () => text.destroy(),
      });
    }
  
    /**
     * Hiển thị banner chiến thắng ngắn gọn
     * @param {string} message - Message to display
     * @param {string} background - Background color (default: "#006600")
     */
    showBanner(message, background = "#006600") {
      const x = this.scene.cameras.main.width / 2;
      const y = this.scene.cameras.main.height / 2 - 120;
      const text = this.scene.add.text(x, y, message, {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
        backgroundColor: background,
        padding: { x: 16, y: 10 },
      });
      text.setOrigin(0.5, 0.5);
      this.scene.tweens.add({
        targets: text,
        alpha: { from: 1, to: 0 },
        duration: 1500,
        delay: 800,
        onComplete: () => text.destroy(),
      });
    }
  
    /**
     * Hiển thị thông báo thua cuộc
     * @param {string} reason - Lý do thua cuộc
     */
    showLoseMessage(reason) {
      console.warn(`💥 THUA CUỘC: ${reason}`);
      this.showBanner(reason, "#8B0000");
    }
  
    /**
     * Hiển thị thông báo chiến thắng
     * @param {string} message - Thông báo chiến thắng
     */
    showVictoryMessage(message) {
      this.showBanner(message, "#006600");
    }
  
    /**
     * Hiển thị thông báo tiến độ
     * @param {number} progress - Tiến độ (0-1)
     */
    showProgressMessage(progress) {
      this.showToast(`Tiến độ: ${Math.round(progress * 100)}%`);
    }
  
    /**
     * Tạo custom notification
     * @param {Object} options - Notification options
     * @param {string} options.message - Message text
     * @param {string} options.type - Type: "toast", "banner", "custom"
     * @param {string} options.background - Background color
     * @param {number} options.duration - Display duration in ms
     * @param {string} options.position - Position: "top", "center", "bottom"
     */
    showNotification(options = {}) {
      const {
        message = "Notification",
        type = "toast",
        background = "#333333",
        duration = 2000,
        position = "top"
      } = options;
  
      let x, y;
      switch (position) {
        case "top":
          x = this.scene.cameras.main.width / 2;
          y = 40;
          break;
        case "center":
          x = this.scene.cameras.main.width / 2;
          y = this.scene.cameras.main.height / 2;
          break;
        case "bottom":
          x = this.scene.cameras.main.width / 2;
          y = this.scene.cameras.main.height - 40;
          break;
        default:
          x = this.scene.cameras.main.width / 2;
          y = 40;
      }
  
      const text = this.scene.add.text(x, y, message, {
        fontFamily: "Arial",
        fontSize: type === "banner" ? "22px" : "18px",
        color: "#ffffff",
        backgroundColor: background,
        padding: { x: 16, y: 10 },
      });
      text.setOrigin(0.5, 0.5);
  
      this.scene.tweens.add({
        targets: text,
        alpha: { from: 1, to: 0 },
        duration: duration,
        delay: duration / 2,
        onComplete: () => text.destroy(),
      });
    }
  
    /**
     * Xóa tất cả UI elements
     */
    clearAllUI() {
      if (this.statusText) {
        this.statusText.destroy();
        this.statusText = null;
      }
    }
  
    /**
     * Lấy status text reference
     * @returns {Phaser.GameObjects.Text|null} Status text object
     */
    getStatusText() {
      return this.statusText;
    }
  }