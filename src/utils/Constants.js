/**
 * Constants - Các hằng số của game
 *
 * Trách nhiệm:
 * - Định nghĩa các hằng số dùng chung
 * - Cung cấp enums và mappings
 * - Quản lý configuration values
 */

// Robot directions
export const DIRECTIONS = {
  NORTH: "north",
  EAST: "east",
  SOUTH: "south",
  WEST: "west",
};

// Battery types
export const BATTERY_TYPES = {
  RED: "red",
  YELLOW: "yellow",
  GREEN: "green",
};

// Game events
export const GAME_EVENTS = {
  ROBOT_MOVED: "robot:moved",
  ROBOT_TURNED: "robot:turned",
  BATTERY_COLLECTED: "battery:collected",
  BOX_PUSHED: "box:pushed",
  GAME_WON: "game:won",
  GAME_LOST: "game:lost",
  PROGRAM_STARTED: "program:started",
  PROGRAM_STOPPED: "program:stopped",
  PROGRAM_COMMAND_EXECUTED: "program:command:executed",
};

// Program commands
export const COMMANDS = {
  MOVE_FORWARD: "moveforward",
  TURN_LEFT: "turnleft",
  TURN_RIGHT: "turnright",
  COLLECT_BATTERY: "collectbattery",
  PUSH_BOX: "pushbox",
};

// Command aliases
export const COMMAND_ALIASES = {
  forward: COMMANDS.MOVE_FORWARD,
  left: COMMANDS.TURN_LEFT,
  right: COMMANDS.TURN_RIGHT,
  collect: COMMANDS.COLLECT_BATTERY,
  push: COMMANDS.PUSH_BOX,
};

// UI colors
export const UI_COLORS = {
  PRIMARY: "#ffffff",
  SECONDARY: "#cccccc",
  SUCCESS: "#00ff00",
  WARNING: "#ffff00",
  ERROR: "#ff0000",
  INFO: "#00ffff",
  BACKGROUND: "#000000",
  TRANSPARENT: "rgba(0, 0, 0, 0.7)",
};

// Game configuration
export const GAME_CONFIG = {
  TILE_SIZE: 128,
  MAP_OFFSET_X: 500,
  MAP_OFFSET_Y: 0,
  MAP_SCALE: 1,
  PROGRAM_EXECUTION_DELAY: 500, // milliseconds
  TOAST_DISPLAY_TIME: 2000, // milliseconds
  VICTORY_DISPLAY_TIME: 3000, // milliseconds
};

// Input keys
export const INPUT_KEYS = {
  MOVE_FORWARD: "UP",
  TURN_LEFT: "LEFT",
  TURN_RIGHT: "RIGHT",
  COLLECT_BATTERY: "SPACE",
  PUSH_BOX: "B",
  LOAD_EXAMPLE: "L",
  TOGGLE_PROGRAM: "P",
  RESTART: "R",
};

// Direction mappings
export const DIRECTION_MAPPINGS = {
  [DIRECTIONS.NORTH]: { x: 0, y: -1, angle: 0 },
  [DIRECTIONS.EAST]: { x: 1, y: 0, angle: 90 },
  [DIRECTIONS.SOUTH]: { x: 0, y: 1, angle: 180 },
  [DIRECTIONS.WEST]: { x: -1, y: 0, angle: 270 },
};

// Turn mappings
export const TURN_MAPPINGS = {
  [DIRECTIONS.NORTH]: {
    left: DIRECTIONS.WEST,
    right: DIRECTIONS.EAST,
  },
  [DIRECTIONS.EAST]: {
    left: DIRECTIONS.NORTH,
    right: DIRECTIONS.SOUTH,
  },
  [DIRECTIONS.SOUTH]: {
    left: DIRECTIONS.EAST,
    right: DIRECTIONS.WEST,
  },
  [DIRECTIONS.WEST]: {
    left: DIRECTIONS.SOUTH,
    right: DIRECTIONS.NORTH,
  },
};

// Battery sprite mappings
export const BATTERY_SPRITE_MAPPINGS = {
  [BATTERY_TYPES.RED]: "pin_red",
  [BATTERY_TYPES.YELLOW]: "pin_yellow",
  [BATTERY_TYPES.GREEN]: "pin_green",
};

// Robot sprite mappings
export const ROBOT_SPRITE_MAPPINGS = {
  [DIRECTIONS.NORTH]: "robot_north",
  [DIRECTIONS.EAST]: "robot_east",
  [DIRECTIONS.SOUTH]: "robot_south",
  [DIRECTIONS.WEST]: "robot_west",
};

// Tile sprite mappings
export const TILE_SPRITE_MAPPINGS = {
  1: "road_v",
  2: "road_h",
  3: "water",
  4: "grass",
  5: "wood",
  6: "crossroad",
};

// Error messages
export const ERROR_MESSAGES = {
  ROBOT_NOT_INITIALIZED: "Robot not initialized",
  INVALID_POSITION: "Invalid position",
  INVALID_DIRECTION: "Invalid direction",
  INVALID_COMMAND: "Invalid command",
  GAME_NOT_INITIALIZED: "Game not initialized",
  MAP_NOT_LOADED: "Map not loaded",
  CHALLENGE_NOT_LOADED: "Challenge not loaded",
};

// Success messages
export const SUCCESS_MESSAGES = {
  ROBOT_MOVED: "Robot moved successfully",
  ROBOT_TURNED: "Robot turned successfully",
  BATTERY_COLLECTED: "Battery collected successfully",
  BOX_PUSHED: "Box pushed successfully",
  PROGRAM_LOADED: "Program loaded successfully",
  GAME_WON: "Congratulations! You won!",
  GAME_RESTARTED: "Game restarted successfully",
};

// Default values
export const DEFAULTS = {
  ROBOT_POSITION: { x: 0, y: 0 },
  ROBOT_DIRECTION: DIRECTIONS.EAST,
  BATTERY_COUNTS: { red: 0, yellow: 0, green: 0 },
  PROGRAM_STEP: 0,
  MAP_OFFSET: { x: GAME_CONFIG.MAP_OFFSET_X, y: GAME_CONFIG.MAP_OFFSET_Y },
};
