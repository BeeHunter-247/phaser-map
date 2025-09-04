# Hệ thống MapLoader - Tái sử dụng cho tất cả Map

## Tổng quan

Hệ thống MapLoader giúp tái sử dụng code để load map và objects cho tất cả BasicScene, loại bỏ việc hardcode và dễ dàng maintain.

## Cấu trúc Files

```
src/
├── utils/
│   └── MapLoader.js          # Utility class chính
├── data/
│   └── mapConfigs.js         # Cấu hình objects cho từng map
└── scenes/basics/
    └── BasicScene1_New.js    # Example scene sử dụng MapLoader
```

## 1. MapLoader.js

### Chức năng chính:

- `loadMap()`: Load tilemap với cấu hình chuẩn
- `loadObjects()`: Load objects từ object layer hoặc custom config
- `convertObjectToWorld()`: Convert tọa độ Tiled sang world position

### Usage:

```javascript
import { MapLoader } from "../../utils/MapLoader.js";

// Load map
const mapData = MapLoader.loadMap(this, "basic1", {
  offsetX: 300,
  offsetY: 0,
  scale: 0.75,
});

// Load objects
const objectConfig = getMapConfig("basic1");
const loadedObjects = MapLoader.loadObjects(this, mapData, objectConfig);
```

## 2. mapConfigs.js

### Cấu hình format:

```javascript
basic1: {
  robot: {
    tileType: "road45"  // Đặt robot trên tile road45 đầu tiên
  },
  batteries: [
    {
      tileType: "road55", // Đặt batteries trên tất cả tile road55
      count: 3,           // 3 batteries mỗi tile
      spread: 1           // Độ rộng spread
    }
  ]
}
```

### Options:

- **Robot placement**:

  - `{ tileType: "road45" }` - Đặt trên tile đầu tiên của loại này
  - `{ tile: { x: 1, y: 2 } }` - Đặt trên tile cụ thể

- **Battery placement**:
  - `{ tileType: "road55", count: 3, spread: 1 }` - Trên tất cả tile của loại
  - `{ tiles: [{ x: 1, y: 2 }, { x: 2, y: 3 }] }` - Trên tiles cụ thể

## 3. BasicScene Implementation

### Template cơ bản:

```javascript
import { MapLoader } from "../../utils/MapLoader.js";
import { getMapConfig } from "../../data/mapConfigs.js";

export default class BasicSceneX extends Phaser.Scene {
  constructor() {
    super("BasicSceneX");
    // ... setup properties
  }

  create() {
    // Load map
    const mapData = MapLoader.loadMap(this, "basicX", {
      offsetX: 300,
      offsetY: 0,
      scale: 0.75,
    });

    this.map = mapData.map;
    this.layer = mapData.layer;

    // Load objects
    const objectConfig = getMapConfig("basicX");
    const loadedObjects = MapLoader.loadObjects(this, mapData, objectConfig);

    this.robot = loadedObjects.robot;
    // ... setup game logic
  }
}
```

## 4. Cách sử dụng cho từng Map

### Bước 1: Thêm config trong mapConfigs.js

```javascript
basic2: {
  robot: { tileType: "road45" },
  batteries: [{ tileType: "road55", count: 2, spread: 1 }]
}
```

### Bước 2: Tạo Scene mới

```javascript
// Copy từ BasicScene1_New.js
// Chỉ cần thay đổi:
// - Constructor name: "BasicScene2New"
// - Map key: "basic2"
// - Config key: "basic2"
```

### Bước 3: Update main.js

```javascript
import BasicScene2New from "./scenes/basics/BasicScene2_New";
// ... add to scenes array
```

## 5. Ưu điểm của hệ thống

### ✅ Tái sử dụng code:

- Một MapLoader cho tất cả scenes
- Logic load map/objects được chuẩn hóa

### ✅ Dễ maintain:

- Chỉ cần sửa config file thay vì code
- Thêm map mới rất nhanh

### ✅ Flexible:

- Support cả object layer và custom config
- Có thể mix cả hai approaches

### ✅ Consistent:

- Tất cả maps có cùng cách load
- Cùng offset, scale, positioning logic

## 6. Migration cho các BasicScene hiện tại

### Để migrate BasicScene2, 3, 4, etc:

1. **Analyze current scene**: Xem robot đặt ở đâu, batteries ở đâu
2. **Create config**: Thêm vào mapConfigs.js
3. **Copy template**: Từ BasicScene1_New.js
4. **Update references**: Scene name, map key, config key
5. **Test**: Chạy và kiểm tra

### Example migration BasicScene2:

```javascript
// 1. Thêm config
basic2: {
  robot: { tileType: "road45" },
  batteries: [{ tileType: "road55", count: 2 }]
}

// 2. Copy BasicScene1_New.js → BasicScene2_New.js
// 3. Thay đổi:
//    - super("BasicScene2New")
//    - "basic1" → "basic2"
//    - getMapConfig("basic2")
```

## 7. Troubleshooting

### Objects không hiển thị:

- Kiểm tra tileset name trong config có đúng không
- Kiểm tra map có tile đó không
- Kiểm tra offset và scale

### Robot không đúng vị trí:

- Kiểm tra `findRobotTile()` logic
- Kiểm tra threshold distance
- Kiểm tra tile center calculation

### Batteries không collect được:

- Kiểm tra `setupBatteryTracking()`
- Kiểm tra tile key mapping
- Kiểm tra sprite references

Hệ thống này giúp bạn dễ dàng tạo và maintain tất cả BasicScene với code tái sử dụng cao!
