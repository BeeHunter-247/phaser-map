import Phaser from "phaser";

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#f4f4f9");

    // Title
    this.add
      .text(this.scale.width / 2, 100, "Robot Programming Game", {
        fontSize: "36px",
        fill: "#000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Subtitle
    this.add
      .text(
        this.scale.width / 2,
        150,
        "Load data from map.json and challenge.json",
        {
          fontSize: "18px",
          fill: "#666",
        }
      )
      .setOrigin(0.5);

    // Load button
    const loadButton = this.add
      .rectangle(this.scale.width / 2, 250, 200, 60, 0x4caf50)
      .setInteractive()
      .setStrokeStyle(2, 0x2e7d32);

    const loadText = this.add
      .text(this.scale.width / 2, 250, "LOAD GAME", {
        fontSize: "20px",
        fill: "#fff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Button hover effects
    loadButton.on("pointerover", () => {
      loadButton.setFillStyle(0x66bb6a);
      loadText.setStyle({ fontSize: "22px" });
    });

    loadButton.on("pointerout", () => {
      loadButton.setFillStyle(0x4caf50);
      loadText.setStyle({ fontSize: "20px" });
    });

    // Load button click
    loadButton.on("pointerdown", () => {
      console.log("🚀 Loading game from data files...");
      this.scene.start("GameScene");
    });

    // Instructions
    this.add
      .text(this.scale.width / 2, 350, "Instructions:", {
        fontSize: "24px",
        fill: "#000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const instructions = [
      "• Map data is loaded from src/data/map.json",
      "• Challenge data is loaded from src/data/challenge.json",
      "• Robot, batteries, and boxes are placed according to challenge config",
      "• Use programming blocks to control the robot",
      "• Collect allowed batteries to complete the challenge",
    ];

    instructions.forEach((instruction, index) => {
      this.add
        .text(this.scale.width / 2, 400 + index * 25, instruction, {
          fontSize: "16px",
          fill: "#333",
        })
        .setOrigin(0.5);
    });
  }
}
