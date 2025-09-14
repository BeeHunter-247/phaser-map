import {
  createBatteryStatusText,
  updateBatteryStatusText,
  VictoryConditions,
} from "../utils/VictoryConditions.js";

/**
 * UIManager - Quản lý UI và hiển thị (Gộp từ UIManager và GameUIManager)
 *
 * Trách nhiệm:
 * - Hiển thị thông tin game
 * - Quản lý UI elements
 * - Hiển thị thông báo
 * - Cập nhật status
 * - Quản lý victory requirements
 * - Hiển thị toast và banner
 */
export class UIManager {
  constructor(scene) {
    this.scene = scene;
    this.gameState = null;
    this.challenge = null;
    this.uiElements = new Map();
    this.statusText = null;
    this.victoryReqContainer = null;
  }

  /**
   * Khởi tạo UI Manager
   * @param {GameState} gameState - Trạng thái game
   * @param {Challenge} challenge - Dữ liệu thử thách
   */
  initialize(gameState, challenge) {
    this.gameState = gameState;
    this.challenge = challenge;
    this.createUI();
    console.log("✅ UIManager: Initialized");
  }

  /**
   * Tạo UI elements
   */
  createUI() {
    // Tạo background cho UI
    this.createBackground();

    // Tạo status text
    this.createStatusText();

    // Tạo instruction text
    this.createInstructionText();

    // Tạo battery status
    this.createBatteryStatus();

    // Tạo status UI cho progress/victory (từ GameUIManager)
    this.createStatusUI();
  }

  /**
   * Tạo background cho UI
   */
  createBackground() {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0x000000, 0.7);
    graphics.fillRect(0, 0, 300, this.scene.cameras.main.height);

    this.uiElements.set("background", graphics);
  }

  /**
   * Tạo status text
   */
  createStatusText() {
    const statusText = this.scene.add.text(20, 20, "Challenge Mode", {
      fontSize: "18px",
      fill: "#ffffff",
      fontFamily: "Arial",
    });

    this.uiElements.set("statusText", statusText);
  }

  /**
   * Tạo instruction text
   */
  createInstructionText() {
    const instructions = [
      "Controls:",
      "↑ - Move Forward",
      "← → - Turn",
      "SPACE - Collect Battery",
      "B - Push Box",
      "L - Load Example",
      "P - Toggle Program",
      "R - Restart",
    ].join("\n");

    const instructionText = this.scene.add.text(20, 60, instructions, {
      fontSize: "14px",
      fill: "#cccccc",
      fontFamily: "Arial",
    });

    this.uiElements.set("instructionText", instructionText);
  }

  /**
   * Tạo battery status
   */
  createBatteryStatus() {
    const batteryText = this.scene.add.text(20, 200, "", {
      fontSize: "16px",
      fill: "#ffff00",
      fontFamily: "Arial",
    });

    this.uiElements.set("batteryText", batteryText);
    this.updateBatteryStatus();
  }

  /**
   * Hiển thị yêu cầu thắng
   */
  showVictoryRequirements() {
    if (!this.challenge) return;

    const summary = this.challenge.getSummary();
    const requirements = [
      `Description: ${summary.description}`,
      `Required Batteries:`,
      `  Red: ${summary.requiredBatteries.red}`,
      `  Yellow: ${summary.requiredBatteries.yellow}`,
      `  Green: ${summary.requiredBatteries.green}`,
      `Total: ${summary.totalBatteries}`,
      `Max Statements: ${summary.maxStatements}`,
    ].join("\n");

    const requirementText = this.scene.add.text(20, 300, requirements, {
      fontSize: "14px",
      fill: "#ffffff",
      fontFamily: "Arial",
    });

    this.uiElements.set("requirementText", requirementText);
  }

  /**
   * Cập nhật battery status
   */
  updateBatteryStatus() {
    if (!this.gameState || !this.uiElements.has("batteryText")) return;

    const collected = this.gameState.getCollectedBatteries();
    const required = this.challenge.calculateRequiredBatteries();

    const status = [
      "Battery Status:",
      `Red: ${collected.red}/${required.red}`,
      `Yellow: ${collected.yellow}/${required.yellow}`,
      `Green: ${collected.green}/${required.green}`,
    ].join("\n");

    this.uiElements.get("batteryText").setText(status);
  }

  /**
   * Hiển thị thông báo thắng
   */
  showVictoryMessage() {
    const victoryText = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      "🎉 VICTORY! 🎉",
      {
        fontSize: "48px",
        fill: "#00ff00",
        fontFamily: "Arial",
        stroke: "#000000",
        strokeThickness: 4,
      }
    );

    victoryText.setOrigin(0.5);
    this.uiElements.set("victoryText", victoryText);

    // Auto remove sau 3 giây
    this.scene.time.delayedCall(3000, () => {
      if (victoryText && victoryText.active) {
        victoryText.destroy();
      }
    });
  }

  /**
   * Hiển thị toast message
   * @param {string} message - Nội dung message
   * @param {string} color - Màu sắc
   */
  showToast(message, color = "#ffffff") {
    const toast = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY + 100,
      message,
      {
        fontSize: "24px",
        fill: color,
        fontFamily: "Arial",
        stroke: "#000000",
        strokeThickness: 2,
      }
    );

    toast.setOrigin(0.5);

    // Auto remove sau 2 giây
    this.scene.time.delayedCall(2000, () => {
      if (toast && toast.active) {
        toast.destroy();
      }
    });
  }

  /**
   * Cập nhật UI theo game state
   */
  update() {
    this.updateBatteryStatus();

    // Cập nhật status text
    if (this.uiElements.has("statusText")) {
      const status = this.gameState.isProgramRunning
        ? "Program Running"
        : "Manual Mode";
      this.uiElements.get("statusText").setText(status);
    }
  }

  /**
   * Lấy UI element theo tên
   * @param {string} name - Tên element
   * @returns {Phaser.GameObjects.GameObject|null}
   */
  getUIElement(name) {
    return this.uiElements.get(name) || null;
  }

  // ===== METHODS TỪ GAMEUIMANAGER =====

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
    const y = this.scene.cameras.main.height - 40;
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
   * Hiển thị banner cố định với nút đóng, cho đến khi người dùng tắt
   * @param {string} message
   * @param {string|number} background
   */
  showPersistentBanner(message, background = "#2563EB") {
    // Nếu đã tồn tại, cập nhật nội dung và layout
    if (this.victoryReqContainer) {
      this.victoryReqContainer.destroy();
    }

    const x = this.scene.cameras.main.width / 2;
    const y = 60;

    // Container chứa banner và nút đóng
    this.victoryReqContainer = this.scene.add.container(x, y);

    // Banner background
    const bannerBg = this.scene.add.rectangle(0, 0, 600, 50, background);
    bannerBg.setAlpha(0.9);

    // Banner text
    const bannerText = this.scene.add.text(0, 0, message, {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: 580 },
    });
    bannerText.setOrigin(0.5, 0.5);

    // Nút đóng (X)
    const closeBtn = this.scene.add.text(280, -20, "✕", {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#ffffff",
      backgroundColor: "#666666",
      padding: { x: 8, y: 4 },
    });
    closeBtn.setOrigin(0.5, 0.5);
    closeBtn.setInteractive();
    closeBtn.on("pointerdown", () => {
      this.victoryReqContainer.destroy();
      this.victoryReqContainer = null;
    });

    // Thêm vào container
    this.victoryReqContainer.add([bannerBg, bannerText, closeBtn]);
  }

  /**
   * Cleanup UI elements
   */
  destroy() {
    this.uiElements.forEach((element) => {
      if (element && element.destroy) {
        element.destroy();
      }
    });
    this.uiElements.clear();

    if (this.victoryReqContainer) {
      this.victoryReqContainer.destroy();
      this.victoryReqContainer = null;
    }

    console.log("✅ UIManager: Cleaned up UI elements");
  }
}
