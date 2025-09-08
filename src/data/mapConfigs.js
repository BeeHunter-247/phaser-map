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
      tile: { x: 3, y: 4 },
      direction: "east",
    },
    // Đặt battery tại vị trí cụ thể (khớp basic1.json: Battery ở (6,5))
    batteries: [
      {
        tiles: [
          // Đặt 1 pin màu xanh lá
          { x: 4, y: 4, count: 1, type: "red" },
          { x: 5, y: 4, count: 2, type: "red" },
          { x: 6, y: 4, count: 1, type: "green" },
        ],
      },
    ],
    victory: {
      byType: [{ red: 0, yellow: 0, green: 1 }],
      description:
        "Hãy giúp tôi thu thập pin màu xanh lá và bỏ qua pin màu đỏ. ",
    },
  },

  // Map 2: Đường thẳng với 2 pin
  basic2: {
    robot: {
      tile: { x: 3, y: 4 }, // Vị trí robot ở giữa đường
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin đầu tiên: 2 pin xanh lá
          { x: 5, y: 4, count: 2, type: "green", spread: 1.2 },
          // Pin cuối cùng: 3 pin đỏ
          { x: 7, y: 4, count: 3, type: "yellow", spread: 1.5 },
        ],
      },
    ],
  },

  // Map 3: Tương tự map 2
  basic3: {
    robot: {
      tile: { x: 3, y: 4 },
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin đầu tiên: 3 pin với màu khác nhau
          {
            x: 5,
            y: 4,
            count: 2,
            types: "green",
            spread: 1.3,
          },
          // Pin cuối cùng: 2 pin vàng
          { x: 7, y: 4, count: 2, type: "green", spread: 1.2 },
        ],
      },
    ],
  },

  // Map 4: Đường thẳng với nhiều pin
  basic4: {
    robot: {
      tile: { x: 3, y: 4 },
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 4, y: 4, count: 2, type: "yellow" },
          { x: 5, y: 4, count: 2, type: "yellow" },
          { x: 6, y: 4, count: 2, type: "yellow" },
          { x: 7, y: 4, count: 2, type: "yellow" },
        ],
      },
    ],
  },

  // Map 5: Mê cung hình chữ nhật
  basic5: {
    robot: {
      tile: { x: 3, y: 2 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 7, y: 2, count: 4 }, // Pin ở góc trên bên phải
          { x: 7, y: 6, count: 4 }, // Pin ở góc dưới bên phải
        ],
        type: "yellow",
        spread: 1.5,
      },
    ],
  },

  // Map 6: Mê cung lớn hơn
  basic6: {
    robot: {
      tile: { x: 8, y: 7 }, // Robot ở góc trên bên trái
      direction: "west",
    },
    batteries: [
      {
        tiles: [
          { x: 8, y: 2 }, // Pin ở góc trên bên phải
        ],
        type: "yellow",
      },
    ],
  },

  // Map 7: Mê cung phức tạp
  basic7: {
    robot: {
      tile: { x: 4, y: 2 }, // Robot ở đầu mê cung
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 6, y: 2, count: 3, type: "green" }, // Pin ở giữa mê cung
          { x: 6, y: 4, count: 3, type: "yellow" }, // Pin ở cuối mê cung
          { x: 8, y: 4, count: 3, type: "green" }, // Pin ở cuối mê cung
          { x: 8, y: 6, count: 3, type: "yellow" }, // Pin ở cuối mê cung
        ],
      },
    ],
  },

  // Map 8: Mê cung lớn nhất
  basic8: {
    robot: {
      tile: { x: 1, y: 2 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 3, y: 4, count: 3, type: "yellow", spread: 1.2 },
          { x: 5, y: 4, count: 3, type: "yellow", spread: 1.2 },
          { x: 7, y: 4, count: 3, type: "yellow", spread: 1.2 },
        ],
      },
    ],
  },

  boolean1: {
    robot: {
      tile: { x: 4, y: 5 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 7, y: 5, count: 3, type: "green", spread: 1.2 },
        ],
      },
    ],
  },
  boolean2: {
    robot: {
      tile: { x: 2, y: 5 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 4, y: 5, count: 2, type: "green", spread: 1.2 },
          { x: 6, y: 5, count: 1, type: "red", spread: 1.2 },
          { x: 8, y: 5, count: 2, type: "green", spread: 1.2 },
        ],
      },
    ],
  },
  boolean3: {
    robot: {
      tile: { x: 2, y: 5 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 4, y: 5, count: 3, type: "green", spread: 1.2 },
          { x: 5, y: 5, count: 1, type: "red", spread: 1.2 },
          { x: 6, y: 5, count: 3, type: "green", spread: 1.2 },
          { x: 7, y: 5, count: 3, type: "green", spread: 1.2 },
        ],
      },
    ],
  },
  boolean4: {
    robot: {
      tile: { x: 2, y: 5 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 3, y: 5, count: 2, type: "green", spread: 1.2 },
          { x: 4, y: 5, count: 2, type: "green", spread: 1.2 },
          { x: 5, y: 5, count: 1, type: "red", spread: 1.2 },
          { x: 6, y: 5, count: 2, type: "green", spread: 1.2 },
          { x: 7, y: 5, count: 2, type: "green", spread: 1.2 },
        ],
      },
    ],
  },
  boolean5: {
    robot: {
      tile: { x: 3, y: 2 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 7, y: 2, count: 1, type: "red", spread: 1.2 },
          { x: 7, y: 6, count: 5, type: "green", spread: 1.2 },
        ],
      },
    ],
  },
  boolean6: {
    robot: {
      tile: { x: 3, y: 3 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 5, y: 3, count: 4, type: "green", spread: 1.2 },
          { x: 5, y: 5, count: 4, type: "green", spread: 1.2 },
          { x: 7, y: 5, count: 1, type: "red", spread: 1.2 },
          { x: 7, y: 7, count: 4, type: "green", spread: 1.2 },
        ],
      },
    ],
  },
  boolean7: {
    robot: {
      tile: { x: 2, y: 3 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 4, y: 4, count: 3, type: "green", spread: 1.2 },
          { x: 6, y: 4, count: 1, type: "red", spread: 1.2 },
          { x: 8, y: 4, count: 3, type: "green", spread: 1.2 },
        ],
      },
    ],
  },
  boolean8: {
    robot: {
      tile: { x: 1, y: 4 }, // Robot ở góc trên bên trái
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          // Pin ở hàng trên: 2 pin xanh lá
          { x: 3, y: 5, count: 3, type: "green", spread: 1.2 },
          { x: 4, y: 3, count: 1, type: "red", spread: 1.2 },
          { x: 6, y: 5, count: 3, type: "green", spread: 1.2 },
          { x: 7, y: 3, count: 3, type: "green", spread: 1.2 },
        ],
      },
    ],
  },

  // ForLoop Maps Configuration
  forloop1: {
    robot: {
      tile: { x: 2, y: 5 }, // Robot ở vị trí (2,6)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 3, y: 5, count: 1, type: "yellow" },
          { x: 4, y: 5, count: 1, type: "yellow" },
          { x: 5, y: 5, count: 1, type: "yellow" },
          { x: 6, y: 5, count: 1, type: "yellow" },
          { x: 7, y: 5, count: 1, type: "yellow" },
        ],
      },
    ],
  },

  forloop2: {
    robot: {
      tile: { x: 2, y: 5 }, // Robot ở vị trí (2,6)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 3, y: 5, count: 1, type: "yellow" },
          { x: 4, y: 5, count: 2, type: "yellow" },
          { x: 5, y: 5, count: 3, type: "yellow" },
          { x: 6, y: 5, count: 4, type: "yellow" },
          { x: 7, y: 5, count: 5, type: "yellow" },
        ],
        spread: 1.2,
      },
    ],
  },

  forloop3: {
    robot: {
      tile: { x: 1, y: 3 },
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 2, y: 3, count: 1, type: "yellow" },
          { x: 4, y: 3, count: 1, type: "yellow" },
          { x: 7, y: 3, count: 1, type: "yellow" },
        ],
      },
    ],
  },

  forloop4: {
    robot: {
      tile: { x: 2, y: 5 }, // Robot ở vị trí (2,6)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 3, y: 5, count: 1, type: "yellow" },
          { x: 5, y: 5, count: 2, type: "yellow" },
          { x: 8, y: 5, count: 3, type: "yellow" },
        ],
      },
    ],
  },

  forloop5: {
    robot: {
      tile: { x: 2, y: 5 }, // Robot ở vị trí (2,6)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 3, y: 5, count: 5, type: "yellow" },
          { x: 4, y: 5, count: 4, type: "yellow" },
          { x: 5, y: 5, count: 3, type: "yellow" },
          { x: 6, y: 5, count: 2, type: "yellow" },
          { x: 7, y: 5, count: 1, type: "yellow" },
        ],
        spread: 1.2,
      },
    ],
  },

  forloop6: {
    robot: {
      tile: { x: 2, y: 4 }, // Robot ở vị trí (2,6)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 3, y: 4, count: 9, type: "yellow" },
          { x: 4, y: 4, count: 7, type: "yellow" },
          { x: 5, y: 4, count: 5, type: "yellow" },
          { x: 6, y: 4, count: 3, type: "yellow" },
          { x: 7, y: 4, count: 1, type: "yellow" },
        ],
        spread: 1.2,
      },
    ],
  },

  forloop7: {
    robot: {
      tile: { x: 3, y: 4 }, // Robot ở vị trí (2,4)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 4, y: 4, count: 2, type: "yellow" },
          { x: 5, y: 4, count: 5, type: "yellow" },
          { x: 6, y: 4, count: 8, type: "yellow" },
        ],
        spread: 1.2,
      },
    ],
  },

  forloop8: {
    robot: {
      tile: { x: 3, y: 1 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [{ x: 5, y: 3, count: 1, type: "yellow" }],
      },
    ],
  },
  conditional1: {
    robot: {
      tile: { x: 3, y: 4 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 4, y: 4, count: 1, type: "yellow" },
          { x: 5, y: 4, count: 1, type: "green" },
        ],
      },
    ],
  },
  conditional2: {
    robot: {
      tile: { x: 3, y: 3 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 4, y: 3, count: 2, type: "red" },
          { x: 5, y: 3, count: 2, type: "green" },
          { x: 6, y: 3, count: 2, type: "green" },
          { x: 7, y: 3, count: 3, type: "green" },
        ],
      },
    ],
  },
  conditional3: {
    robot: {
      tile: { x: 3, y: 4 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 4, y: 4, count: 3, type: "green" },
          { x: 5, y: 4, count: 2, type: "green" },
          { x: 6, y: 4, count: 2, type: "yellow" },
          { x: 7, y: 4, count: 3, type: "green" },
        ],
      },
    ],
  },
  conditional4: {
    robot: {
      tile: { x: 5, y: 7 }, // Robot ở vị trí (1,3)
      direction: "west",
    },
    batteries: [
      {
        tiles: [
          { x: 2, y: 2, count: 2, type: "green" },
          { x: 2, y: 4, count: 2, type: "yellow" },
          { x: 2, y: 6, count: 1, type: "green" },
        ],
      },
    ],
  },
  conditional5: {
    robot: {
      tile: { x: 7, y: 4 }, // Robot ở vị trí (1,3)
      direction: "west",
    },
    batteries: [
      {
        tiles: [
          { x: 5, y: 4, count: 2, type: "green" },
          { x: 4, y: 3, count: 2, type: "yellow" },
          { x: 3, y: 2, count: 1, type: "green" },
          { x: 2, y: 1, count: 2, type: "green" },
        ],
      },
    ],
  },
  conditional6: {
    robot: {
      tile: { x: 6, y: 6 }, // Robot ở vị trí (1,3)
      direction: "west",
    },
    batteries: [
      {
        tiles: [
          { x: 5, y: 6, count: 2, type: "green" },
          { x: 4, y: 6, count: 2, type: "yellow" },
          { x: 3, y: 6, count: 1, type: "green" },
          { x: 3, y: 5, count: 2, type: "green" },
          { x: 3, y: 4, count: 2, type: "green" },
          { x: 3, y: 3, count: 2, type: "red" },
          { x: 4, y: 3, count: 2, type: "green" },
          { x: 5, y: 3, count: 2, type: "red" },
          { x: 6, y: 3, count: 2, type: "green" },
        ],
      },
    ],
  },
  conditional7: {
    robot: {
      tile: { x: 2, y: 3 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 3, y: 3, count: 1, type: "yellow" },
          { x: 4, y: 3, count: 2, type: "green" },
          { x: 5, y: 3, count: 2, type: "red" },
          { x: 6, y: 3, count: 1, type: "green" },
          { x: 7, y: 3, count: 2, type: "red" },
          { x: 8, y: 3, count: 1, type: "red" },
        ],
      },
    ],
  },
  conditional8: {
    robot: {
      tile: { x: 2, y: 3 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 3, y: 3, count: 2, type: "yellow" },
          { x: 4, y: 3, count: 2, type: "green" },
          { x: 5, y: 3, count: 2, type: "red" },
          { x: 6, y: 3, count: 1, type: "green" },
          { x: 6, y: 4, count: 2, type: "red" },
          { x: 6, y: 5, count: 1, type: "red" },
          { x: 6, y: 6, count: 1, type: "yellow" },
          { x: 6, y: 7, count: 2, type: "yellow" },
        ],
      },
    ],
  },
  function1: {
    robot: {
      tile: { x: 3, y: 4 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [{ x: 4, y: 4, count: 2, type: "green" }],
      },
    ],
  },
  function2: {
    robot: {
      tile: { x: 2, y: 4 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [{ x: 6, y: 4, count: 1, type: "green" }],
      },
    ],
  },
  function3: {
    robot: {
      tile: { x: 3, y: 3 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 5, y: 3, count: 1, type: "green" },
          { x: 7, y: 3, count: 1, type: "green" },
        ],
      },
    ],
  },
  function4: {
    robot: {
      tile: { x: 1, y: 4 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [{ x: 3, y: 4, count: 1, type: "green" }],
      },
    ],
  },
  function5: {
    robot: {
      tile: { x: 2, y: 4 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [{ x: 4, y: 5, count: 2, type: "green" }],
      },
    ],
  },
  function6: {
    robot: {
      tile: { x: 2, y: 5 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 5, y: 5, count: 5, type: "green" },
          { x: 5, y: 2, count: 5, type: "green" },
        ],
      },
    ],
  },
  function7: {
    robot: {
      tile: { x: 2, y: 3 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 3, y: 4, count: 3, type: "green" },
          { x: 4, y: 5, count: 3, type: "green" },
          { x: 5, y: 6, count: 3, type: "green" },
        ],
      },
    ],
  },
  function8: {
    robot: {
      tile: { x: 2, y: 4 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 3, y: 4, count: 1, type: "green" },
          { x: 4, y: 4, count: 1, type: "green" },
          { x: 5, y: 4, count: 1, type: "green" },
          { x: 6, y: 4, count: 1, type: "green" },
          { x: 7, y: 4, count: 1, type: "green" },
        ],
      },
    ],
  },
  variable1: {
    robot: {
      tile: { x: 4, y: 4 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [{ x: 6, y: 4, count: 2, type: "yellow" }],
      },
    ],
  },
  variable2: {
    robot: {
      tile: { x: 3, y: 5 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [{ x: 6, y: 5, count: 3, type: "yellow" }],
      },
    ],
  },
  variable3: {
    robot: {
      tile: { x: 2, y: 5 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 4, y: 5, count: 2, type: "yellow" },
          { x: 6, y: 5, count: 2, type: "yellow" },
          { x: 8, y: 5, count: 2, type: "yellow" },
        ],
      },
    ],
  },
  variable4: {
    robot: {
      tile: { x: 3, y: 3 }, // Robot ở vị trí (1,3)
      direction: "west",
    },
    batteries: [
      {
        tiles: [
          { x: 6, y: 3, count: 3, type: "yellow" },
          { x: 6, y: 6, count: 3, type: "yellow" },
          { x: 3, y: 6, count: 3, type: "yellow" },
        ],
      },
    ],
  },
  variable5: {
    robot: {
      tile: { x: 3, y: 4 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 4, y: 4, count: 1, type: "yellow" },
          { x: 5, y: 4, count: 2, type: "yellow" },
          { x: 6, y: 4, count: 3, type: "yellow" },
          { x: 7, y: 4, count: 4, type: "yellow" },
        ],
      },
    ],
  },
  variable6: {
    robot: {
      tile: { x: 2, y: 3 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 5, y: 3, count: 3, type: "yellow" },
          { x: 7, y: 3, count: 2, type: "yellow" },
          { x: 8, y: 3, count: 1, type: "yellow" },
        ],
      },
    ],
  },
  variable7: {
    robot: {
      tile: { x: 1, y: 5 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 2, y: 5, count: 2, type: "yellow" },
          { x: 4, y: 5, count: 4, type: "yellow" },
          { x: 7, y: 5, count: 6, type: "yellow" },
        ],
      },
    ],
  },
  variable8: {
    robot: {
      tile: { x: 2, y: 3 }, // Robot ở vị trí (1,3)
      direction: "east",
    },
    batteries: [
      {
        tiles: [
          { x: 6, y: 3, count: 4, type: "yellow" },
          { x: 6, y: 6, count: 3, type: "yellow" },
          { x: 4, y: 6, count: 2, type: "yellow" },
          { x: 4, y: 5, count: 1, type: "yellow" },
        ],
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
