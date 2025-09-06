/**
 * Cấu hình objects cho từng map
 * Format:
 * - robot: { tileType: "Robot", direction: "north" } - đặt robot trên tile đầu tiên của loại này với hướng
 * - robot: { tile: { x: 1, y: 2 }, direction: "east" } - đặt robot trên tile cụ thể với hướng
 * - batteries: [{ tileType: "Battery", count: 1, spread: 1, type: "red" }] - đặt batteries trên mỗi tile Battery
 * - batteries: [{ tiles: [{x: 4, y: 5, count: 3, types: ["red", "yellow", "green"]}], type: "yellow" }] - đặt battery tại vị trí cụ thể
 *
 * Robot directions: "north", "east", "south", "west" (0, 1, 2, 3)
 * Battery types: "red", "yellow", "green"
 *
 * Thuộc tính mở rộng cho từng pin:
 * - count: số lượng pin tại ô đó (mặc định: 1)
 * - type: màu sắc cho tất cả pin tại ô đó
 * - types: mảng màu sắc cho từng pin tại ô đó (ưu tiên hơn type)
 * - spread: độ rộng khi đặt nhiều pin (mặc định: 1)
 */

export const mapConfigs = {
  // BasicScene1 Configuration
  basic1: {
    // Đặt robot tại vị trí cụ thể (khớp basic1.json: Robot ở (3,5))
    robot: {
      tile: { x: 3, y: 5 },
      direction: "east",
    },
    // Đặt battery tại vị trí cụ thể (khớp basic1.json: Battery ở (6,5))
    batteries: [
      {
        tiles: [
          // Đặt 1 pin màu xanh lá
          { x: 6, y: 5, count: 1, type: "green" },
        ],
      },
    ],
  },

  // Map 2: Đường thẳng với 2 pin
  basic2: {
    robot: {
      tile: { x: 3, y: 5 }, // Vị trí robot ở giữa đường
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin đầu tiên: 2 pin xanh lá
          { x: 5, y: 5, count: 2, type: "green", spread: 1.2 },
          // Pin cuối cùng: 3 pin đỏ
          { x: 7, y: 5, count: 3, type: "red", spread: 1.5 },
        ],
      },
    ],
  },

  // Map 3: Tương tự map 2
  basic3: {
    robot: {
      tile: { x: 3, y: 5 },
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin đầu tiên: 3 pin với màu khác nhau
          {
            x: 5,
            y: 5,
            count: 3,
            types: ["red", "yellow", "green"],
            spread: 1.3,
          },
          // Pin cuối cùng: 2 pin vàng
          { x: 7, y: 5, count: 2, type: "yellow", spread: 1.2 },
        ],
      },
    ],
  },

  // Map 4: Đường thẳng với nhiều pin
  basic4: {
    robot: {
      tile: { x: 3, y: 5 },
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 4, y: 5, count: 2, type: "green" },
          { x: 5, y: 5, count: 2, type: "green" },
          { x: 6, y: 5, count: 2, type: "green" },
          { x: 7, y: 5, count: 2, type: "green" },
        ],
      },
    ],
  },

  // Map 5: Mê cung hình chữ nhật
  basic5: {
    robot: {
      tile: { x: 2, y: 2 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 6, y: 2, count: 4 }, // Pin ở góc trên bên phải
          { x: 6, y: 6, count: 4 }, // Pin ở góc dưới bên phải
        ],
        type: "green",
        spread: 1.5,
      },
    ],
  },

  // Map 6: Mê cung lớn hơn
  basic6: {
    robot: {
      tile: { x: 7, y: 7 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 7, y: 2 }, // Pin ở góc trên bên phải
        ],
        type: "red",
      },
    ],
  },

  // Map 7: Mê cung phức tạp
  basic7: {
    robot: {
      tile: { x: 2, y: 2 }, // Robot ở đầu mê cung
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 4, y: 2, count: 3, type: "green" }, // Pin ở giữa mê cung
          { x: 4, y: 4, count: 3, type: "yellow" }, // Pin ở cuối mê cung
          { x: 6, y: 4, count: 3, type: "green" }, // Pin ở cuối mê cung
          { x: 6, y: 6, count: 3, type: "yellow" }, // Pin ở cuối mê cung
        ],
      },
    ],
  },

  // Map 8: Mê cung lớn nhất
  basic8: {
    robot: {
      tile: { x: 1, y: 3 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 3, y: 5, count: 3, type: "yellow", spread: 1.2 },
          { x: 5, y: 5, count: 3, type: "yellow", spread: 1.2 },
          { x: 7, y: 5, count: 3, type: "yellow", spread: 1.2 },
        ],
      },
    ],
  },

  boolean1: {
    robot: {
      tile: { x: 3, y: 4 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 6, y: 4, count: 3, type: "green", spread: 1.2 },
        ],
      },
    ],
  },
  boolean2: {
    robot: {
      tile: { x: 2, y: 4 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 4, y: 4, count: 2, type: "green", spread: 1.2 },
          { x: 6, y: 4, count: 1, type: "red", spread: 1.2 },
          { x: 8, y: 4, count: 2, type: "green", spread: 1.2 },
        ],
      },
    ],
  },
  boolean3: {
    robot: {
      tile: { x: 1, y: 4 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 3, y: 4, count: 3, type: "green", spread: 1.2 },
          { x: 4, y: 4, count: 1, type: "red", spread: 1.2 },
          { x: 5, y: 4, count: 3, type: "green", spread: 1.2 },
          { x: 6, y: 4, count: 3, type: "green", spread: 1.2 },
        ],
      },
    ],
  },
  boolean4: {
    robot: {
      tile: { x: 2, y: 4 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 3, y: 4, count: 2, type: "green", spread: 1.2 },
          { x: 4, y: 4, count: 2, type: "green", spread: 1.2 },
          { x: 5, y: 4, count: 1, type: "red", spread: 1.2 },
          { x: 6, y: 4, count: 2, type: "green", spread: 1.2 },
          { x: 7, y: 4, count: 2, type: "green", spread: 1.2 },
        ],
      },
    ],
  },
  boolean5: {
    robot: {
      tile: { x: 1, y: 4 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 5, y: 4, count: 1, type: "red", spread: 1.2 },
          { x: 5, y: 8, count: 5, type: "green", spread: 1.2 },
        ],
      },
    ],
  },
  boolean6: {
    robot: {
      tile: { x: 0, y: 4 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 2, y: 4, count: 4, type: "green", spread: 1.2 },
          { x: 2, y: 6, count: 4, type: "green", spread: 1.2 },
          { x: 4, y: 6, count: 1, type: "red", spread: 1.2 },
          { x: 4, y: 8, count: 4, type: "green", spread: 1.2 },
        ],
      },
    ],
  },
  boolean7: {
    robot: {
      tile: { x: 1, y: 4 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 3, y: 5, count: 3, type: "green", spread: 1.2 },
          { x: 5, y: 5, count: 1, type: "red", spread: 1.2 },
          { x: 7, y: 5, count: 3, type: "green", spread: 1.2 },
        ],
      },
    ],
  },
  boolean8: {
    robot: {
      tile: { x: 0, y: 4 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 2, y: 5, count: 3, type: "green", spread: 1.2 },
          { x: 5, y: 5, count: 3, type: "green", spread: 1.2 },
          { x: 3, y: 3, count: 1, type: "red", spread: 1.2 },
          { x: 6, y: 3, count: 3, type: "green", spread: 1.2 },
        ],
      },
    ],
  },

  // ForLoop Maps Configuration
  forloop1: {
    robot: {
      tile: { x: 2, y: 6 }, // Robot ở vị trí (2,6)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 3, y: 6, count: 1, type: "green" },
          { x: 4, y: 6, count: 1, type: "green" },
          { x: 5, y: 6, count: 1, type: "green" },
          { x: 6, y: 6, count: 1, type: "green" },
          { x: 7, y: 6, count: 1, type: "green" },
        ],
      },
    ],
  },

  forloop2: {
    robot: {
      tile: { x: 2, y: 6 }, // Robot ở vị trí (2,6)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 3, y: 6, count: 1, type: "green" },
          { x: 4, y: 6, count: 2, type: "green" },
          { x: 5, y: 6, count: 3, type: "green" },
          { x: 6, y: 6, count: 4, type: "green" },
          { x: 7, y: 6, count: 5, type: "green" },
        ],
        spread: 1.2,
      },
    ],
  },

  forloop3: {
    robot: {
      tile: { x: 1, y: 4 },
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 2, y: 4, count: 1, type: "green" },
          { x: 4, y: 4, count: 1, type: "green" },
          { x: 7, y: 4, count: 1, type: "green" },
        ],
      },
    ],
  },

  forloop4: {
    robot: {
      tile: { x: 2, y: 6 }, // Robot ở vị trí (2,6)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 3, y: 6, count: 1, type: "green" },
          { x: 5, y: 6, count: 2, type: "green" },
          { x: 8, y: 6, count: 3, type: "green" },
        ],
      },
    ],
  },

  forloop5: {
    robot: {
      tile: { x: 2, y: 6 }, // Robot ở vị trí (2,6)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 3, y: 6, count: 5, type: "green" },
          { x: 4, y: 6, count: 4, type: "green" },
          { x: 5, y: 6, count: 3, type: "green" },
          { x: 6, y: 6, count: 2, type: "green" },
          { x: 7, y: 6, count: 1, type: "green" },
        ],
        spread: 1.2,
      },
    ],
  },

  forloop6: {
    robot: {
      tile: { x: 2, y: 5 }, // Robot ở vị trí (2,6)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 3, y: 5, count: 9, type: "green" },
          { x: 4, y: 5, count: 7, type: "green" },
          { x: 5, y: 5, count: 5, type: "green" },
          { x: 6, y: 5, count: 3, type: "green" },
          { x: 7, y: 5, count: 1, type: "green" },
        ],
        spread: 1.2,
      },
    ],
  },

  forloop7: {
    robot: {
      tile: { x: 2, y: 4 }, // Robot ở vị trí (2,4)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 3, y: 4, count: 2, type: "green" },
          { x: 4, y: 4, count: 5, type: "green" },
          { x: 5, y: 4, count: 8, type: "green" },
        ],
        spread: 1.2,
      },
    ],
  },

  forloop8: {
    robot: {
      tile: { x: 2, y: 3 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [{ x: 4, y: 4, count: 1, type: "green" }],
      },
    ],
  },
};

/**
 * Chuyển đổi tên hướng thành số
 * @param {string} direction - Tên hướng: "north", "east", "south", "west"
 * @returns {number} Direction index: 0=north, 1=east, 2=south, 3=west
 */
export function getDirectionIndex(direction) {
  const directions = {
    north: 0,
    east: 1,
    south: 2,
    west: 3,
  };
  return directions[direction] || 0; // Default to north if invalid
}

/**
 * Lấy config cho một map
 * @param {string} mapKey - Key của map (basic1, basic2, etc.)
 * @returns {Object} Config object cho map đó
 */
export function getMapConfig(mapKey) {
  return mapConfigs[mapKey] || {};
}
