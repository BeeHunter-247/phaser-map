import Phaser from "phaser";

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#f4f4f9");

    // Gọi hàm để vẽ menu cho Basic (8 maps)
    this.drawCategory("Basic", 8, 100, 120);

    // Gọi hàm để vẽ menu cho Boolean (8 maps)
    this.drawCategory("Boolean", 8, 100, 240);

    // Gọi hàm để vẽ menu cho ForLoop (8 maps)
    this.drawCategory("ForLoop", 8, 100, 360);

    // Gọi hàm để vẽ menu cho Repeat (8 maps)
    this.drawCategory("Repeat", 8, 100, 480);

    // Gọi hàm để vẽ menu cho WhileLoop (8 maps)
    this.drawCategory("WhileLoop", 8, 100, 600);

    this.drawCategory("Conditional", 8, 100, 720);
    this.drawCategory("Function", 8, 100, 840);
    this.drawCategory("Demo", 8, 100, 960);

    // Enable vertical scrolling (mouse wheel + drag to pan)
    const camera = this.cameras.main;
    const totalHeight = 1200; // enough to contain all categories below
    camera.setBounds(0, 0, this.scale.width, totalHeight);

    // Mouse wheel scroll
    this.input.on("wheel", (_pointer, _objects, _dx, dy) => {
      const maxScroll = Math.max(0, totalHeight - camera.height);
      camera.scrollY = Phaser.Math.Clamp(
        camera.scrollY + dy * 0.5,
        0,
        maxScroll
      );
    });

    // Drag to pan
    let isDragging = false;
    let dragStartY = 0;
    let startScrollY = 0;
    this.input.on("pointerdown", (p) => {
      isDragging = true;
      dragStartY = p.y;
      startScrollY = camera.scrollY;
    });
    this.input.on("pointerup", () => {
      isDragging = false;
    });
    this.input.on("pointermove", (p) => {
      if (!isDragging) return;
      const dy = p.y - dragStartY;
      const maxScroll = Math.max(0, totalHeight - camera.height);
      camera.scrollY = Phaser.Math.Clamp(startScrollY - dy, 0, maxScroll);
    });
    // Removed duplicate categories to prevent overlaps

    // Sau này bạn có thể gọi thêm:
    // this.drawCategory("Variable", 5, 100, 720);
    // this.drawCategory("Loop", 10, 100, 840);
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
        const mapKey = `${prefix.toLowerCase()}${i}`; // e.g., basic1..basic8, boolean1..boolean8, forloop1..forloop8
        this.scene.start("Scene", { mapKey });
      });
    }
  }
}
