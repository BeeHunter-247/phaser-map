import Phaser from "phaser";

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#f4f4f9");

    // Gọi hàm để vẽ menu cho Basic
    this.drawCategory("Basic", 8, 100, 120);
    this.drawCategory("Variable", 8, 100, 240);

    // Sau này bạn có thể gọi thêm:
    // this.drawCategory("Variable", 5, 100, 300);
    // this.drawCategory("Loop", 10, 100, 480);
  }

  // Hàm generic vẽ menu cho 1 category
  drawCategory(prefix, totalMaps, startX, startY) {
    const mapsPerRow = 8;
    const spacingX = 70;
    const spacingY = 70;

    this.add
      .text(this.scale.width / 2, startY - 40, `${prefix} Maps`, {
        fontSize: "28px",
        fill: "#000",
      })
      .setOrigin(0.5);

    for (let i = 1; i <= totalMaps; i++) {
      const col = (i - 1) % mapsPerRow;
      const row = Math.floor((i - 1) / mapsPerRow);

      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      const mapText = this.add
        .text(x, y, `${i}`, {
          fontSize: "24px",
          fill: "#00f",
        })
        .setInteractive();

      mapText.on("pointerdown", () => {
        // Start the common Scene with selected mapKey
        const mapKey = `${prefix.toLowerCase()}${i}`; // e.g., basic1..basic8
        this.scene.start("Scene", { mapKey });
      });
    }
  }
}
