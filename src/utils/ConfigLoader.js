/**
 * ConfigLoader - Load config từ map.json và challenge.json
 *
 * Thay thế cho mapConfigs.js cũ với cấu trúc:
 * - map.json: Tiled map data (visual layout)
 * - challenge.json: Game objects và victory conditions
 */

import { MapModel } from "../models/MapModel.js";

export class ConfigLoader {
  /**
   * Load map config từ webview data only
   * @param {Object} mapData - Map JSON data từ webview
   * @param {Object} challengeData - Challenge JSON data từ webview
   * @returns {Promise<MapModel>} Map model instance
   */
  static async loadMapModel(mapData, challengeData) {
    try {
      if (!mapData || !challengeData) {
        throw new Error("MapData and challengeData are required from webview");
      }

      console.log(`🗺️ Loading map config from webview data`);

      // Transform challenge config để phù hợp với MapModel
      const transformedConfig = this.transformChallengeConfig(challengeData);

      // Merge configs và tạo MapModel
      const fullConfig = {
        mapKey: "webview",
        width: mapData.width || 10,
        height: mapData.height || 10,
        tileSize: mapData.tilewidth || 128,
        ...transformedConfig,
        mapData: mapData, // Lưu map data để sử dụng sau
      };

      console.log("✅ Loaded config from webview:", {
        width: fullConfig.width,
        height: fullConfig.height,
        robot: !!fullConfig.robot,
        batteries: fullConfig.batteries?.length || 0,
        boxes: fullConfig.boxes?.length || 0,
      });

      return MapModel.fromConfig("webview", fullConfig);
    } catch (error) {
      console.error(`❌ Failed to load map config from webview:`, error);
      throw error;
    }
  }

  /**
   * Process challenge config từ webview data
   * @param {Object} challengeData - Challenge data từ webview
   * @returns {Object} Processed challenge config
   */
  static processWebviewChallengeConfig(challengeData) {
    try {
      if (!challengeData) {
        throw new Error("Challenge data is required from webview");
      }

      // Validate basic structure
      if (!challengeData.robot) {
        throw new Error("Challenge config missing robot configuration");
      }

      // Transform config để phù hợp với MapModel
      const transformedConfig = this.transformChallengeConfig(challengeData);

      console.log("✅ Processed webview challenge config:", transformedConfig);
      return transformedConfig;
    } catch (error) {
      console.error("❌ Failed to process webview challenge config:", error);
      throw new Error(`Failed to process challenge data: ${error.message}`);
    }
  }

  /**
   * Process map data từ webview
   * @param {Object} mapData - Map data từ webview
   * @returns {Object} Processed map data
   */
  static processWebviewMapData(mapData) {
    try {
      if (!mapData) {
        throw new Error("Map data is required from webview");
      }

      // Validate basic Tiled structure
      if (!mapData.layers || !Array.isArray(mapData.layers)) {
        throw new Error("Invalid map data: missing layers");
      }

      console.log("✅ Processed webview map data:", {
        width: mapData.width,
        height: mapData.height,
        layers: mapData.layers.length,
        tilesets: mapData.tilesets?.length || 0,
      });

      return mapData;
    } catch (error) {
      console.error("❌ Failed to process webview map data:", error);
      throw new Error(`Failed to process map data: ${error.message}`);
    }
  }

  /**
   * Transform challenge config để phù hợp với MapModel
   * @param {Object} challengeConfig - Raw challenge config
   * @returns {Object} Transformed config
   */
  static transformChallengeConfig(challengeConfig) {
    const transformed = {
      robot: challengeConfig.robot,
      batteries: challengeConfig.batteries || [],
      boxes: challengeConfig.boxes || [],
      victory: {
        description: challengeConfig.description || "Complete the challenge",
        statement: challengeConfig.statement || [],
        // Propagate min/max cards if present at root for new scoring
        minCards:
          typeof challengeConfig.minCards === "number"
            ? challengeConfig.minCards
            : undefined,
        maxCards:
          typeof challengeConfig.maxCards === "number"
            ? challengeConfig.maxCards
            : undefined,
      },
    };

    // Sử dụng victory conditions từ config nếu có
    if (challengeConfig.victory) {
      transformed.victory = {
        ...transformed.victory,
        ...challengeConfig.victory,
      };
    } else {
      // Fallback: tạo victory conditions từ batteries/boxes
      if (challengeConfig.batteries && challengeConfig.batteries.length > 0) {
        const batteryRequirements = this.extractBatteryRequirements(
          challengeConfig.batteries
        );
        if (batteryRequirements) {
          transformed.victory.byType = [batteryRequirements];
        }
      }

      if (challengeConfig.boxes && challengeConfig.boxes.length > 0) {
        const boxRequirements = this.extractBoxRequirements(
          challengeConfig.boxes
        );
        if (boxRequirements.length > 0) {
          transformed.victory.byType = boxRequirements;
        }
      }
    }

    return transformed;
  }

  /**
   * Extract battery requirements từ config
   * @param {Array} batteriesConfig - Batteries configuration
   * @returns {Object|null} Battery requirements
   */
  static extractBatteryRequirements(batteriesConfig) {
    const requirements = { red: 0, yellow: 0, green: 0 };
    let hasRequirements = false;

    batteriesConfig.forEach((batteryGroup) => {
      if (batteryGroup.tiles && Array.isArray(batteryGroup.tiles)) {
        batteryGroup.tiles.forEach((tile) => {
          if (tile.type && tile.count) {
            requirements[tile.type] =
              (requirements[tile.type] || 0) + tile.count;
            hasRequirements = true;
          }
        });
      }
    });

    return hasRequirements ? requirements : null;
  }

  /**
   * Extract box requirements từ config
   * @param {Array} boxesConfig - Boxes configuration
   * @returns {Array} Box requirements
   */
  static extractBoxRequirements(boxesConfig) {
    const requirements = [];

    boxesConfig.forEach((boxGroup) => {
      if (boxGroup.tiles && Array.isArray(boxGroup.tiles)) {
        boxGroup.tiles.forEach((tile) => {
          if (typeof tile.x === "number" && typeof tile.y === "number") {
            requirements.push({
              x: tile.x,
              y: tile.y,
              count: tile.count || 1,
            });
          }
        });
      }
    });

    return requirements;
  }

  /**
   * Create map model từ webview data (thay thế cho loadDefaultMapModel)
   * @param {Object} mapData - Map JSON data từ webview
   * @param {Object} challengeData - Challenge JSON data từ webview
   * @returns {Promise<MapModel>} Map model
   */
  static async createMapModelFromWebview(mapData, challengeData) {
    return await this.loadMapModel(mapData, challengeData);
  }
}
