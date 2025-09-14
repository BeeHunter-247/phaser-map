/**
 * Battery Model - Đại diện cho pin trong game
 *
 * Thuộc tính:
 * - position: {x, y} - Vị trí tile
 * - type: string - Loại pin ("red", "yellow", "green")
 * - sprite: Phaser.GameObjects.Sprite - Sprite của pin
 * - isCollected: boolean - Trạng thái đã thu thập
 * - allowedCollect: boolean - Pin có được phép thu thập không
 *
 * Methods:
 * - collect() - Thu thập pin
 * - destroy() - Hủy sprite
 * - getTileKey() - Lấy key của tile
 */
export class Battery {
  constructor(scene, x, y, type = "green", allowedCollect = true) {
    this.scene = scene;
    this.position = { x, y };
    this.type = type; // "red", "yellow", "green"
    this.sprite = null;
    this.isCollected = false;
    this.allowedCollect = allowedCollect; // Pin có được phép thu thập không
  }

  /**
   * Khởi tạo battery với sprite
   * @param {Phaser.GameObjects.Sprite} sprite - Sprite của battery
   */
  initialize(sprite) {
    this.sprite = sprite;
    this.updateSpritePosition();
  }

  /**
   * Cập nhật vị trí sprite theo position
   */
  updateSpritePosition() {
    if (!this.sprite) return;

    // Battery được đặt với y + 20 để nổi trên robot
    this.sprite.setDepth(this.sprite.y + 20);
  }

  /**
   * Thu thập pin
   * @returns {boolean} Success/failure
   */
  collect() {
    if (this.isCollected) {
      console.log(
        `Battery at (${this.position.x}, ${this.position.y}) already collected`
      );
      return false;
    }

    if (!this.allowedCollect) {
      console.log(
        `Battery at (${this.position.x}, ${this.position.y}) is not allowed to collect`
      );
      return false;
    }

    this.isCollected = true;

    // Hủy sprite
    if (this.sprite && this.sprite.active) {
      this.sprite.destroy();
    }

    console.log(
      `Collected ${this.type} battery at (${this.position.x}, ${this.position.y})`
    );
    return true;
  }

  /**
   * Hủy sprite
   */
  destroy() {
    if (this.sprite && this.sprite.active) {
      this.sprite.destroy();
    }
    this.sprite = null;
  }

  /**
   * Lấy key của tile
   * @returns {string} Tile key format: "x,y"
   */
  getTileKey() {
    return `${this.position.x},${this.position.y}`;
  }

  /**
   * Kiểm tra pin có được thu thập chưa
   * @returns {boolean}
   */
  isBatteryCollected() {
    return this.isCollected;
  }

  /**
   * Lấy thông tin pin
   * @returns {Object} Battery info
   */
  getInfo() {
    return {
      position: { ...this.position },
      type: this.type,
      isCollected: this.isCollected,
      allowedCollect: this.allowedCollect,
      tileKey: this.getTileKey(),
    };
  }

  /**
   * Tạo battery từ config
   * @param {Object} config - Battery config
   * @param {Phaser.Scene} scene - Scene object
   * @returns {Battery} Battery instance
   */
  static fromConfig(config, scene) {
    const x = config.x || 0;
    const y = config.y || 0;
    const type = config.type || "green";
    const allowedCollect =
      config.allowedCollect !== undefined ? config.allowedCollect : true;

    return new Battery(scene, x, y, type, allowedCollect);
  }

  /**
   * Tạo nhiều battery từ config array
   * @param {Array} configs - Array of battery configs
   * @param {Phaser.Scene} scene - Scene object
   * @returns {Array<Battery>} Array of Battery instances
   */
  static fromConfigArray(configs, scene) {
    return configs.map((config) => Battery.fromConfig(config, scene));
  }
}
