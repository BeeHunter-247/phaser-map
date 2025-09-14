/**
 * Map Model - Đại diện cho map data trong game
 *
 * Chỉ quản lý map structure, không quản lý game objects (robot, pin, box)
 *
 * Thuộc tính:
 * - id: string - ID của map
 * - name: string - Tên map
 * - width: number - Chiều rộng map (tiles)
 * - height: number - Chiều cao map (tiles)
 * - tileWidth: number - Chiều rộng mỗi tile
 * - tileHeight: number - Chiều cao mỗi tile
 * - layers: Array - Các layers của map
 * - tilesets: Array - Các tilesets được sử dụng
 * - data: Object - Dữ liệu map gốc từ JSON
 * - isLoaded: boolean - Trạng thái đã load
 *
 * Methods:
 * - loadFromBackend() - Load map data từ backend
 * - loadFromLocal() - Load map data từ file local
 * - validate() - Validate map data
 * - getLayer() - Lấy layer theo tên
 * - getTileset() - Lấy tileset theo tên
 * - getTileAt() - Lấy tile tại vị trí
 *
 * Lưu ý: Map model KHÔNG quản lý:
 * - Robot position/direction
 * - Battery positions/types
 * - Box positions
 * - Victory conditions
 *
 * Những thứ này được quản lý bởi Config riêng biệt
 */
export class Map {
  constructor(scene, id) {
    this.scene = scene;
    this.id = id;
    this.name = "";
    this.width = 0;
    this.height = 0;
    this.tileWidth = 32;
    this.tileHeight = 32;
    this.layers = [];
    this.tilesets = [];
    this.data = null;
    this.challengeData = null; // Challenge data từ challenge.json
    this.isLoaded = false;
    this.phaserMap = null; // Phaser Tilemap object
    this.phaserLayers = new globalThis.Map(); // Map of layer name -> Phaser TilemapLayer
  }

  /**
   * Load map từ backend API
   * @param {string} mapId - ID của map
   * @returns {Promise<boolean>} Success/failure
   */
  async loadFromBackend(mapId) {
    try {
      console.log(`📡 Loading map from backend: ${mapId}`);

      const response = await fetch(`/api/maps/${mapId}/data`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const mapData = await response.json();

      if (this.validate(mapData)) {
        this.parseMapData(mapData);
        this.isLoaded = true;
        console.log(`✅ Map loaded from backend: ${this.name}`);
        return true;
      } else {
        throw new Error("Invalid map data format");
      }
    } catch (error) {
      console.error(`❌ Failed to load map from backend:`, error);
      return false;
    }
  }

  /**
   * Load map từ file local (data/map.json và data/challenge.json)
   * @returns {Promise<boolean>} Success/failure
   */
  async loadFromLocal() {
    try {
      console.log(`📁 Loading map from local data files`);

      // Load map.json
      const mapResponse = await fetch(`src/data/map.json`);
      if (!mapResponse.ok) {
        throw new Error(`HTTP error! status: ${mapResponse.status}`);
      }
      const mapData = await mapResponse.json();

      // Load challenge.json
      const challengeResponse = await fetch(`src/data/challenge.json`);
      if (!challengeResponse.ok) {
        throw new Error(`HTTP error! status: ${challengeResponse.status}`);
      }
      const challengeData = await challengeResponse.json();

      if (this.validate(mapData)) {
        this.parseMapData(mapData);
        this.challengeData = challengeData; // Lưu challenge data
        this.isLoaded = true;
        console.log(`✅ Map loaded from local: ${this.name}`);
        console.log(`✅ Challenge data loaded:`, challengeData);
        return true;
      } else {
        throw new Error("Invalid map data format");
      }
    } catch (error) {
      console.error(`❌ Failed to load map from local:`, error);
      return false;
    }
  }

  /**
   * Parse map data từ JSON
   * @param {Object} mapData - Map data từ JSON
   */
  parseMapData(mapData) {
    this.data = mapData;
    this.name = mapData.name || this.id;
    this.width = mapData.width || 0;
    this.height = mapData.height || 0;
    this.tileWidth = mapData.tilewidth || 32;
    this.tileHeight = mapData.tileheight || 32;
    this.layers = mapData.layers || [];
    this.tilesets = mapData.tilesets || [];
  }

  /**
   * Validate map data
   * @param {Object} mapData - Map data
   * @returns {boolean} True nếu map data hợp lệ
   */
  validate(mapData) {
    try {
      if (!mapData) {
        console.error("❌ Map data is null or undefined");
        return false;
      }

      if (!mapData.width || !mapData.height) {
        console.error("❌ Missing map dimensions");
        return false;
      }

      if (!mapData.layers || !Array.isArray(mapData.layers)) {
        console.error("❌ Missing or invalid layers");
        return false;
      }

      if (!mapData.tilesets || !Array.isArray(mapData.tilesets)) {
        console.error("❌ Missing or invalid tilesets");
        return false;
      }

      // Kiểm tra có ít nhất 1 layer
      if (mapData.layers.length === 0) {
        console.error("❌ No layers found in map");
        return false;
      }

      return true;
    } catch (error) {
      console.error("❌ Map validation error:", error);
      return false;
    }
  }

  /**
   * Tạo Phaser Tilemap từ map data
   * @param {string} mapKey - Key cho Phaser cache
   * @returns {Phaser.Tilemaps.Tilemap} Phaser Tilemap object
   */
  createPhaserMap(mapKey) {
    if (!this.isLoaded) {
      console.error("❌ Map not loaded yet");
      return null;
    }

    try {
      // Tạo tilemap từ data
      this.phaserMap = this.scene.make.tilemap({
        key: mapKey,
        data: this.data,
      });

      console.log(`🎮 Phaser map created: ${this.name}`);
      return this.phaserMap;
    } catch (error) {
      console.error("❌ Failed to create Phaser map:", error);
      return null;
    }
  }

  /**
   * Tạo Phaser Tileset từ map data
   * @param {string} tilesetName - Tên tileset
   * @param {string} imageKey - Key của image trong Phaser cache
   * @returns {Phaser.Tilemaps.Tileset} Phaser Tileset object
   */
  createPhaserTileset(tilesetName, imageKey) {
    if (!this.phaserMap) {
      console.error("❌ Phaser map not created yet");
      return null;
    }

    try {
      const tileset = this.phaserMap.addTilesetImage(tilesetName, imageKey);
      console.log(`🖼️ Tileset created: ${tilesetName}`);
      return tileset;
    } catch (error) {
      console.error("❌ Failed to create tileset:", error);
      return null;
    }
  }

  /**
   * Tạo Phaser TilemapLayer
   * @param {string} layerName - Tên layer
   * @param {Phaser.Tilemaps.Tileset} tileset - Tileset object
   * @returns {Phaser.Tilemaps.TilemapLayer} Phaser TilemapLayer object
   */
  createPhaserLayer(layerName, tileset) {
    if (!this.phaserMap) {
      console.error("❌ Phaser map not created yet");
      return null;
    }

    try {
      const layer = this.phaserMap.createLayer(layerName, tileset);
      this.phaserLayers.set(layerName, layer);
      console.log(`🗺️ Layer created: ${layerName}`);
      return layer;
    } catch (error) {
      console.error("❌ Failed to create layer:", error);
      return null;
    }
  }

  /**
   * Lấy layer theo tên
   * @param {string} layerName - Tên layer
   * @returns {Object|null} Layer data hoặc null
   */
  getLayer(layerName) {
    return this.layers.find((layer) => layer.name === layerName) || null;
  }

  /**
   * Lấy Phaser layer theo tên
   * @param {string} layerName - Tên layer
   * @returns {Phaser.Tilemaps.TilemapLayer|null} Phaser layer hoặc null
   */
  getPhaserLayer(layerName) {
    return this.phaserLayers.get(layerName) || null;
  }

  /**
   * Lấy tileset theo tên
   * @param {string} tilesetName - Tên tileset
   * @returns {Object|null} Tileset data hoặc null
   */
  getTileset(tilesetName) {
    return (
      this.tilesets.find((tileset) => tileset.name === tilesetName) || null
    );
  }

  /**
   * Lấy tile tại vị trí
   * @param {string} layerName - Tên layer
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object|null} Tile data hoặc null
   */
  getTileAt(layerName, x, y) {
    const layer = this.getLayer(layerName);
    if (!layer || !layer.data) return null;

    const index = y * this.width + x;
    return layer.data[index] || null;
  }

  /**
   * Lấy challenge data
   * @returns {Object|null} Challenge data hoặc null
   */
  getChallengeData() {
    return this.challengeData;
  }

  /**
   * Lấy thông tin map
   * @returns {Object} Map info
   */
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      width: this.width,
      height: this.height,
      tileWidth: this.tileWidth,
      tileHeight: this.tileHeight,
      layersCount: this.layers.length,
      tilesetsCount: this.tilesets.length,
      isLoaded: this.isLoaded,
      hasPhaserMap: !!this.phaserMap,
      hasChallengeData: !!this.challengeData,
    };
  }

  /**
   * Debug: In ra thông tin map
   */
  debugMapInfo() {
    console.log("🗺️ Map Debug Info:");
    console.log(`   ID: ${this.id}`);
    console.log(`   Name: ${this.name}`);
    console.log(`   Size: ${this.width}x${this.height}`);
    console.log(`   Tile Size: ${this.tileWidth}x${this.tileHeight}`);
    console.log(`   Layers: ${this.layers.length}`);
    console.log(`   Tilesets: ${this.tilesets.length}`);
    console.log(`   Loaded: ${this.isLoaded}`);
    console.log(`   Phaser Map: ${!!this.phaserMap}`);
  }

  /**
   * Tạo map từ config
   * @param {Object} config - Map config
   * @param {Phaser.Scene} scene - Scene object
   * @returns {Map} Map instance
   */
  static fromConfig(config, scene) {
    const map = new Map(scene, config.id || "unknown");
    map.parseMapData(config);
    map.isLoaded = true;
    return map;
  }

  /**
   * Load map với fallback strategy
   * @param {Phaser.Scene} scene - Scene object
   * @param {boolean} useBackend - Có sử dụng backend không
   * @returns {Promise<Map>} Map instance
   */
  static async loadMap(scene, useBackend = true) {
    const map = new Map(scene, "data-map");

    if (useBackend) {
      // Thử load từ backend trước (nếu có mapId)
      const success = await map.loadFromBackend("data-map");
      if (!success) {
        // Fallback về local
        console.log(`🔄 Falling back to local data files`);
        await map.loadFromLocal();
      }
    } else {
      // Load từ local
      await map.loadFromLocal();
    }

    return map;
  }
}
