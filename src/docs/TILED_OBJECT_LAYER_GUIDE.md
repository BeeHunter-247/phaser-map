# Hướng dẫn sử dụng Object Layer trong Tiled cho Isometric Map

## 1. Tạo Object Layer trong Tiled

### Bước 1: Thêm Object Layer

1. Mở Tiled Editor
2. Chọn `Layer > Add Object Layer`
3. Đặt tên layer (ví dụ: "objects", "spawns", "collisions", "triggers")

### Bước 2: Cấu hình Layer

- **Name**: Tên layer (sẽ dùng trong code Phaser)
- **Draw Order**:
  - `topdown`: Vẽ từ trên xuống (mặc định)
  - `index`: Vẽ theo thứ tự index
- **Color**: Màu hiển thị objects trong editor
- **Opacity**: Độ trong suốt

## 2. Các loại Object trong Tiled

### Rectangle Object

- **Dùng cho**: Vùng collision, trigger zones, spawn areas
- **Tọa độ**: Top-left corner
- **Size**: Width x Height

### Point Object

- **Dùng cho**: Spawn points, waypoints, markers
- **Tọa độ**: Chính xác vị trí point
- **Size**: Không có (0x0)

### Tile Object

- **Dùng cho**: Decorative tiles, animated objects
- **Tọa độ**: Top-left corner
- **Size**: Theo tile size
- **GID**: ID của tile trong tileset

### Polygon/Polyline Object

- **Dùng cho**: Complex collision shapes, paths
- **Tọa độ**: Array of points
- **Size**: Bounding box

## 3. Tọa độ trong Isometric Map

### Projected Coordinate Space

Theo tài liệu Tiled, **objects trong isometric map được lưu trong projected coordinate space**:

```
- Tọa độ (x,y) được tính theo tile height
- Width/height cũng được projected
- Không phải pixel coordinates thông thường
```

### Ví dụ tọa độ:

```json
{
  "x": 111, // Projected X coordinate
  "y": 367, // Projected Y coordinate
  "width": 66, // Projected width
  "height": 46 // Projected height
}
```

## 4. Đặt Objects trong Tiled

### Cách 1: Sử dụng Tools

1. Chọn tool phù hợp (Rectangle, Point, Tile, etc.)
2. Click và drag trên map để tạo object
3. Đặt tên object trong Properties panel
4. Thêm custom properties nếu cần

### Cách 2: Sử dụng Tile Object

1. Chọn Tile Object tool
2. Chọn tile từ tileset
3. Click trên map để đặt
4. Có thể scale, rotate tile

### Custom Properties

Thêm properties tùy chỉnh:

- **Type**: Loại object (string)
- **Custom fields**: Bất kỳ giá trị nào
- **Boolean, Int, Float, String, Color, File**

## 5. Load Object Layer trong Phaser

### Cấu trúc JSON Object Layer:

```json
{
  "draworder": "topdown",
  "name": "objects",
  "objects": [
    {
      "gid": 4,
      "height": 46,
      "id": 1,
      "name": "RobotPoint",
      "rotation": 0,
      "type": "spawn",
      "visible": true,
      "width": 66,
      "x": 111,
      "y": 367,
      "properties": [
        {
          "name": "team",
          "type": "string",
          "value": "player"
        }
      ]
    }
  ],
  "opacity": 1,
  "type": "objectgroup",
  "visible": true,
  "x": 0,
  "y": 0
}
```

### Code Phaser cơ bản:

```javascript
// Load object layer
const objectLayer = map.getObjectLayer("objects");

objectLayer.objects.forEach((obj) => {
  // Chuyển đổi tọa độ
  const tileX = obj.x / map.tileWidth;
  const tileY = obj.y / map.tileHeight;

  const worldPoint = layer.tileToWorldXY(tileX, tileY);
  const centerX = worldPoint.x + (map.tileWidth * layer.scaleX) / 2;
  const centerY = worldPoint.y + (map.tileHeight * layer.scaleY) / 2;

  // Tạo sprite
  const sprite = this.add.image(centerX, centerY, spriteKey);
  sprite.setOrigin(0.5, 0.5);
  sprite.setScale(scale);
});
```

## 6. Best Practices

### Naming Convention

- **Objects**: `RobotPoint`, `PinPoint`, `SpawnPoint`, `TriggerZone`
- **Layers**: `objects`, `collisions`, `spawns`, `triggers`
- **Types**: `spawn`, `collectible`, `trigger`, `decoration`

### Organization

- Tách riêng các loại object vào layer khác nhau
- Sử dụng custom properties để phân loại
- Đặt tên rõ ràng, có ý nghĩa

### Performance

- Không tạo quá nhiều objects nhỏ
- Sử dụng object pooling cho dynamic objects
- Cache world positions nếu cần

## 7. Debug và Troubleshooting

### Debug Object Positions

```javascript
// Log object information
objectLayer.objects.forEach((obj, index) => {
  console.log(`Object ${index + 1}:`, {
    name: obj.name,
    position: { x: obj.x, y: obj.y },
    size: { width: obj.width, height: obj.height },
    tileCoords: {
      x: obj.x / map.tileWidth,
      y: obj.y / map.tileHeight,
    },
  });
});
```

### Common Issues

1. **Objects không hiển thị**: Kiểm tra layer name và object visibility
2. **Vị trí sai**: Kiểm tra coordinate conversion
3. **Scale không đúng**: Áp dụng cùng scale với layer
4. **Origin sai**: Sử dụng setOrigin(0.5, 0.5) cho center

## 8. Ví dụ hoàn chỉnh

Xem file `DemoScene2_Improved.js` để có ví dụ implementation đầy đủ với:

- Error handling
- Debug logging
- Multiple object types
- Coordinate conversion
- Scale và positioning
