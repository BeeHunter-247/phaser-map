import {
  createBatteryStatusText,
  updateBatteryStatusText,
  VictoryConditions,
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
    this.victoryReqContainer = null;
    this.infoButton = null;
  }

  /**
   * Khởi tạo UI Manager
   */
  initialize() {
    // Tạo status UI
    this.createStatusUI();
    this.createInfoButton();
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

  // (Removed) showBanner: generic center-screen banner not needed for win/lose

  /**
   * Hiển thị yêu cầu chiến thắng của map hiện tại
   */
  showVictoryRequirements() {
    try {
      // Ưu tiên: Map dạng BOX → hiển thị mô tả box (nếu có)
      const requiredBoxes = VictoryConditions.getRequiredBoxes(this.scene);
      if (requiredBoxes && requiredBoxes.length > 0) {
        const desc = this.scene.mapModel?.victoryConditions?.description;
        let messageBody = desc;
        if (!messageBody) {
          // Tự tạo mô tả ngắn nếu thiếu description
          const parts = requiredBoxes.map((t) => `(${t.x},${t.y}): ${t.count}`);
          messageBody = `Boxes: place exact counts at targets → ${parts.join(
            " • "
          )}`;
        }
        const message = ` ${messageBody}`;
        this.showPersistentBanner(message, "#2563EB");
        return;
      }

      const required = VictoryConditions.getRequiredBatteries(this.scene);
      if (!required || !required.byType) return;

      // Ưu tiên mô tả tuỳ chỉnh trong config nếu có
      let messageBody = required.description;

      if (!messageBody) {
        const red = required.byType.red || 0;
        const yellow = required.byType.yellow || 0;
        const green = required.byType.green || 0;

        const parts = [];
        if (red > 0) parts.push(`Đỏ: ${red}`);
        if (yellow > 0) parts.push(`Vàng: ${yellow}`);
        if (green > 0) parts.push(`Xanh lá: ${green}`);

        messageBody =
          parts.length > 0
            ? parts.join(" • ")
            : "Thu thập đúng số lượng pin yêu cầu";
      }

      const message = ` ${messageBody}`;
      this.showPersistentBanner(message, "#2563EB");
    } catch (e) {
      // No-op if config missing
    }
  }

  /**
   * Hiển thị banner cố định với nút đóng, cho đến khi người dùng tắt
   * @param {string} message
   * @param {string|number} background
   */
  showPersistentBanner(message, background = "#2563EB") {
    // Nếu đã tồn tại, cập nhật nội dung và layout
    if (this.victoryReqContainer) {
      const text = this.victoryReqContainer.getByName("messageText");
      if (text) text.setText(message);
      this.layoutPersistentBanner();
      if (this.infoButton) this.infoButton.setVisible(false);
      return;
    }

    const x = this.scene.cameras.main.width / 2;
    const y = this.scene.cameras.main.height - 40;

    // Kích thước tối đa và padding
    const maxWidth = this.scene.cameras.main.width - 80;
    const paddingX = 18;
    const paddingY = 12;

    // Text nội dung (word-wrap + đậm + màu tối)
    const wrapWidth = this.scene.cameras.main.width * 0.5; // 60% chiều rộng màn hình
    const text = this.scene.add.text(0, 0, message, {
      fontFamily: "Arial",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#1f2937",
      align: "center",
      wordWrap: { width: wrapWidth, useAdvancedWrap: true },
    });
    text.setName("messageText");

    // Icon loa bên trái
    const icon = this.scene.add.text(0, 0, "📢", {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#1f2937",
    });
    icon.setName("iconText");

    // Nút đóng
    const closeText = this.scene.add.text(0, 0, "✕", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#1f2937",
    });
    closeText.setName("closeButton");
    closeText.setInteractive({ useHandCursor: true });
    closeText.on("pointerdown", () => this.hidePersistentBanner());
    closeText.on("pointerover", () => closeText.setAlpha(0.7));
    closeText.on("pointerout", () => closeText.setAlpha(1));

    // Colors
    const borderColor =
      typeof background === "string" && background.startsWith("#")
        ? parseInt(background.slice(1), 16)
        : typeof background === "number"
        ? background
        : 0x1f2a6b;
    const fillColor = 0xe9e4e4; // nền sáng

    // Background bằng Graphics (bo góc + viền) và shadow
    const shadow = this.scene.add.graphics();
    shadow.setName("backgroundShadow");
    const bg = this.scene.add.graphics();
    bg.setName("backgroundGraphics");

    // Container
    this.victoryReqContainer = this.scene.add.container(x, y, [
      shadow,
      bg,
      icon,
      text,
      closeText,
    ]);
    this.victoryReqContainer.setName("victoryReqContainer");
    this.victoryReqContainer.setDepth(1000);

    // Lưu style để dùng khi layout
    this.victoryReqContainer.setDataEnabled();
    this.victoryReqContainer.setData({
      paddingX,
      paddingY,
      maxWidth,
      borderColor,
      fillColor,
      cornerRadius: 18,
      iconMarginRight: 8,
    });

    this.layoutPersistentBanner();

    // Ẩn nút thông tin khi banner hiển thị
    if (this.infoButton) this.infoButton.setVisible(false);
  }

  /**
   * Cập nhật layout cho banner cố định
   */
  layoutPersistentBanner() {
    if (!this.victoryReqContainer) return;
    const paddingX = this.victoryReqContainer.getData("paddingX") || 14;
    const paddingY = this.victoryReqContainer.getData("paddingY") || 8;
    const maxWidth =
      this.victoryReqContainer.getData("maxWidth") ||
      this.scene.cameras.main.width - 80;
    const borderColor =
      this.victoryReqContainer.getData("borderColor") || 0x1f2a6b;
    const fillColor = this.victoryReqContainer.getData("fillColor") || 0xe9e4e4;
    const cornerRadius = this.victoryReqContainer.getData("cornerRadius") || 16;

    const shadow = this.victoryReqContainer.getByName("backgroundShadow");
    const bg = this.victoryReqContainer.getByName("backgroundGraphics");
    const icon = this.victoryReqContainer.getByName("iconText");
    const text = this.victoryReqContainer.getByName("messageText");
    const closeText = this.victoryReqContainer.getByName("closeButton");
    if (!bg || !text || !closeText || !shadow || !icon) return;

    const iconMarginRight =
      this.victoryReqContainer.getData("iconMarginRight") || 8;
    const contentWidth = Math.min(
      icon.width +
        iconMarginRight +
        text.width +
        paddingX * 2 +
        closeText.width +
        10,
      maxWidth
    );
    const contentHeight =
      Math.max(text.height, closeText.height) + paddingY * 2;

    // Vẽ shadow
    shadow.clear();
    shadow.fillStyle(0x000000, 0.18);
    shadow.fillRoundedRect(
      -contentWidth / 2 + 2,
      -contentHeight / 2 + 2,
      contentWidth,
      contentHeight,
      cornerRadius
    );

    // Vẽ nền + viền + đuôi (speech bubble)
    bg.clear();
    bg.lineStyle(4, borderColor, 1);
    bg.fillStyle(fillColor, 1);
    bg.fillRoundedRect(
      -contentWidth / 2,
      -contentHeight / 2,
      contentWidth,
      contentHeight,
      cornerRadius
    );
    bg.strokeRoundedRect(
      -contentWidth / 2,
      -contentHeight / 2,
      contentWidth,
      contentHeight,
      cornerRadius
    );
    const tailWidth = 16;
    const tailHeight = 14;
    const tailOffsetY = 0;
    bg.fillTriangle(
      -contentWidth / 2 + 20,
      tailOffsetY,
      -contentWidth / 2 + 20 + tailWidth,
      tailOffsetY - tailHeight / 2,
      -contentWidth / 2 + 20 + tailWidth,
      tailOffsetY + tailHeight / 2
    );
    bg.lineStyle(4, borderColor, 1);
    bg.strokeTriangle(
      -contentWidth / 2 + 20,
      tailOffsetY,
      -contentWidth / 2 + 20 + tailWidth,
      tailOffsetY - tailHeight / 2,
      -contentWidth / 2 + 20 + tailWidth,
      tailOffsetY + tailHeight / 2
    );

    // Icon bên trái, text sau icon, nút đóng bên phải
    icon.setPosition(-contentWidth / 2 + paddingX, -icon.height / 2);
    text.setPosition(icon.x + icon.width + iconMarginRight, -text.height / 2);
    closeText.setPosition(
      contentWidth / 2 - paddingX - closeText.width,
      -contentHeight / 2 + 6
    );

    const x = this.scene.cameras.main.width / 2;
    // Always keep a margin from bottom so long text isn't cut off
    const bottomMargin = 24;
    const sceneHeight = this.scene.cameras.main.height;
    const y = Math.max(
      contentHeight / 2 + 60, // top safety margin
      sceneHeight - (bottomMargin + contentHeight / 2)
    );
    this.victoryReqContainer.setPosition(x, y);
  }

  /**
   * Ẩn/destroy banner cố định
   */
  hidePersistentBanner() {
    if (this.victoryReqContainer) {
      this.victoryReqContainer.destroy(true);
      this.victoryReqContainer = null;
    }
    // Hiện lại nút thông tin để có thể mở mô tả
    if (this.infoButton) this.infoButton.setVisible(true);
  }

  // (Removed) showLoseMessage: FE/MB display lose reason externally

  // (Removed) showVictoryMessage: FE/MB display win reason externally

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
      position = "top",
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
    this.hidePersistentBanner();
  }

  /**
   * Lấy status text reference
   * @returns {Phaser.GameObjects.Text|null} Status text object
   */
  getStatusText() {
    return this.statusText;
  }

  /**
   * Tạo nút thông tin (ℹ) để mở lại mô tả khi đã đóng
   */
  createInfoButton() {
    if (this.infoButton) return;

    const size = 44;
    const margin = 16;
    const x = this.scene.cameras.main.width * 0.75;
    const y = this.scene.cameras.main.height - margin - size / 2;

    // Nền tròn
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x2563eb, 1);
    bg.fillCircle(0, 0, size / 2);

    // Icon ℹ
    const icon = this.scene.add.text(0, 0, "ℹ", {
      fontFamily: "Arial",
      fontSize: "22px",
      fontStyle: "bold",
      color: "#ffffff",
    });
    icon.setOrigin(0.5);

    this.infoButton = this.scene.add.container(x, y, [bg, icon]);
    this.infoButton.setSize(size, size);
    this.infoButton.setDepth(1001);
    this.infoButton.setName("infoButton");
    // Dùng hit area hình chữ nhật lớn, căn giữa để bắt click tốt hơn cả phía dưới
    const hitW = size + 20;
    const hitH = size + 20;
    this.infoButton.setInteractive(
      new Phaser.Geom.Rectangle(-hitW / 2, -hitH / 2, hitW, hitH),
      Phaser.Geom.Rectangle.Contains
    );
    if (this.infoButton.input) {
      this.infoButton.input.cursor = "pointer";
    }
    this.infoButton.on("pointerdown", () => this.showVictoryRequirements());
    this.infoButton.on("pointerover", () => {
      this.infoButton.setScale(1.06);
    });
    this.infoButton.on("pointerout", () => {
      this.infoButton.setScale(1);
    });

    // Nếu ngay lúc tạo đã có banner, ẩn nút lại
    if (this.victoryReqContainer) this.infoButton.setVisible(false);

    // Cập nhật vị trí theo kích thước màn hình (nếu có resize logic bên ngoài, có thể gọi lại hàm này)
    const reposition = () => {
      const nx = this.scene.cameras.main.width * 0.6;
      const ny = this.scene.cameras.main.height - margin - size / 2;
      this.infoButton.setPosition(nx, ny);
    };
    // Thử lắng nghe sự kiện resize của phaser nếu có
    if (this.scene.scale && this.scene.scale.on) {
      this.scene.scale.on("resize", reposition);
    }
  }
}
