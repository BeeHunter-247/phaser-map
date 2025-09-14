/**
 * Box Model - Đại diện cho hộp trong game
 *
 * Thuộc tính:
 * - position: {x, y} - Vị trí tile
 * - sprite: Phaser.GameObjects.Sprite - Sprite của hộp
 * - isPlaced: boolean - Trạng thái đã đặt
 * - isTaken: boolean - Trạng thái đã lấy
 *
 * Methods:
 * - place() - Đặt hộp
 * - take() - Lấy hộp
 * - destroy() - Hủy sprite
 * - getTileKey() - Lấy key của tile
 */
export class Box {
  constructor(scene, x, y) {
    this.scene = scene;
    this.position = { x, y };
    this.sprite = null;
    this.isPlaced = false;
    this.isTaken = false;
  }

  /**
   * Khởi tạo box với sprite
   * @param {Phaser.GameObjects.Sprite} sprite - Sprite của box
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

    // Box được đặt với y - 1 để ở dưới robot
    this.sprite.setDepth(this.sprite.y - 1);
  }

  /**
   * Đặt hộp
   * @returns {boolean} Success/failure
   */
  place() {
    if (this.isPlaced) {
      console.log(
        `Box at (${this.position.x}, ${this.position.y}) already placed`
      );
      return false;
    }

    this.isPlaced = true;
    this.isTaken = false;

    console.log(`Placed box at (${this.position.x}, ${this.position.y})`);
    return true;
  }

  /**
   * Lấy hộp
   * @returns {boolean} Success/failure
   */
  take() {
    if (this.isTaken) {
      console.log(
        `Box at (${this.position.x}, ${this.position.y}) already taken`
      );
      return false;
    }

    this.isTaken = true;
    this.isPlaced = false;

    // Hủy sprite khi lấy
    if (this.sprite && this.sprite.active) {
      this.sprite.destroy();
    }

    console.log(`Took box from (${this.position.x}, ${this.position.y})`);
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
   * Kiểm tra hộp có được đặt chưa
   * @returns {boolean}
   */
  isBoxPlaced() {
    return this.isPlaced;
  }

  /**
   * Kiểm tra hộp có được lấy chưa
   * @returns {boolean}
   */
  isBoxTaken() {
    return this.isTaken;
  }

  /**
   * Lấy thông tin hộp
   * @returns {Object} Box info
   */
  getInfo() {
    return {
      position: { ...this.position },
      isPlaced: this.isPlaced,
      isTaken: this.isTaken,
      tileKey: this.getTileKey(),
    };
  }

  /**
   * Tạo box từ config
   * @param {Object} config - Box config
   * @param {Phaser.Scene} scene - Scene object
   * @returns {Box} Box instance
   */
  static fromConfig(config, scene) {
    const x = config.x || 0;
    const y = config.y || 0;

    return new Box(scene, x, y);
  }

  /**
   * Tạo nhiều box từ config array
   * @param {Array} configs - Array of box configs
   * @param {Phaser.Scene} scene - Scene object
   * @returns {Array<Box>} Array of Box instances
   */
  static fromConfigArray(configs, scene) {
    return configs.map((config) => Box.fromConfig(config, scene));
  }
}
