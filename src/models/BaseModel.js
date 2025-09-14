/**
 * BaseModel - Base class cho tất cả models trong game
 *
 * Cung cấp các chức năng cơ bản như:
 * - ID generation
 * - Position management
 * - Metadata handling
 * - Serialization interface
 */
export class BaseModel {
  constructor(config = {}) {
    this.id = config.id || this.generateId();
    this.type =
      config.type || this.constructor.name.replace("Model", "").toLowerCase();
    this.position = config.position || { x: 0, y: 0 };
    this.isActive = config.isActive !== false;
    this.metadata = config.metadata || {};
    this.createdAt = Date.now();
  }

  /**
   * Tạo ID duy nhất cho model
   * @returns {string} Unique ID
   */
  generateId() {
    return `${this.type}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }

  /**
   * Cập nhật vị trí của model
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   */
  updatePosition(x, y) {
    this.position = { x, y };
  }

  /**
   * Set trạng thái active/inactive
   * @param {boolean} active - Active state
   */
  setActive(active) {
    this.isActive = active;
  }

  /**
   * Lấy metadata theo key
   * @param {string} key - Metadata key
   * @returns {*} Metadata value
   */
  getMetadata(key) {
    return this.metadata[key];
  }

  /**
   * Set metadata
   * @param {string} key - Metadata key
   * @param {*} value - Metadata value
   */
  setMetadata(key, value) {
    this.metadata[key] = value;
  }

  /**
   * Validate model data - phải implement trong subclass
   * @returns {boolean} Is valid
   */
  validate() {
    throw new Error("validate() must be implemented by subclass");
  }

  /**
   * Serialize model to plain object - phải implement trong subclass
   * @returns {Object} Serialized data
   */
  serialize() {
    throw new Error("serialize() must be implemented by subclass");
  }

  /**
   * Clone model
   * @returns {BaseModel} Cloned model
   */
  clone() {
    const serialized = this.serialize();
    return new this.constructor(serialized);
  }

  /**
   * Kiểm tra distance đến một vị trí khác
   * @param {number} x - Target X
   * @param {number} y - Target Y
   * @returns {number} Distance
   */
  distanceTo(x, y) {
    const dx = this.position.x - x;
    const dy = this.position.y - y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Kiểm tra có cùng vị trí với một model khác không
   * @param {BaseModel} other - Other model
   * @returns {boolean} Same position
   */
  isSamePosition(other) {
    return (
      this.position.x === other.position.x &&
      this.position.y === other.position.y
    );
  }
}
