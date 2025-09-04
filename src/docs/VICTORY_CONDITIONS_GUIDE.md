# Hướng Dẫn Tích Hợp Điều Kiện Thắng

File `VictoryConditions.js` cung cấp hệ thống đánh giá tiêu chí thắng thua dựa trên việc thu thập pin. Dưới đây là hướng dẫn tích hợp với `Scene.js`.

## 1. Import VictoryConditions

Đầu tiên, thêm import vào đầu file `Scene.js`:

```javascript
import {
  createBatteryStatusText,
  updateBatteryStatusText,
  checkAndDisplayVictory,
} from "../utils/VictoryConditions.js";
```

## 2. Thêm Text Hiển Thị Trạng Thái

Trong phương thức `create()` của Scene, thêm đoạn code sau để tạo text hiển thị:

```javascript
// Tạo text hiển thị trạng thái thu thập pin
this.statusText = createBatteryStatusText(this);
```

## 3. Cập Nhật Trạng Thái Sau Khi Thu Thập Pin

Trong phương thức `collectBattery()`, thêm đoạn code sau vào cuối hàm để cập nhật trạng thái:

```javascript
// Cập nhật trạng thái thu thập pin
updateBatteryStatusText(this, this.statusText);

// Kiểm tra điều kiện thắng
const victoryResult = checkAndDisplayVictory(this);
if (victoryResult.isVictory) {
  // Xử lý khi thắng (có thể hiển thị thông báo, chuyển màn, etc.)
  console.log("🎉 Chiến thắng! Đã thu thập đủ pin.");
}
```

## 4. Kiểm Tra Điều Kiện Thắng Khi Bắt Đầu

Để hiển thị trạng thái ngay từ đầu, thêm đoạn code sau vào cuối phương thức `create()`:

```javascript
// Kiểm tra điều kiện thắng ban đầu
checkAndDisplayVictory(this);
```

## 5. Tùy Chọn: Thêm Phương Thức Kiểm Tra Thủ Công

Nếu muốn kiểm tra điều kiện thắng theo yêu cầu, thêm phương thức sau vào Scene:

```javascript
/**
 * Kiểm tra điều kiện thắng thủ công
 */
checkVictory() {
  const result = checkAndDisplayVictory(this);
  return result.isVictory;
}
```

## 6. Tùy Chọn: Thêm Phím Tắt Kiểm Tra

Thêm phím tắt để kiểm tra điều kiện thắng trong `setupInput()`:

```javascript
case "KeyV":
  // Kiểm tra điều kiện thắng
  this.checkVictory();
  break;
```

## Ví Dụ Hoàn Chỉnh

Dưới đây là ví dụ hoàn chỉnh về cách tích hợp:

```javascript
import { createBatteryStatusText, updateBatteryStatusText, checkAndDisplayVictory } from "../utils/VictoryConditions.js";

// Trong phương thức create()
create() {
  // ... code hiện tại ...

  // Tạo text hiển thị trạng thái thu thập pin
  this.statusText = createBatteryStatusText(this);

  // Kiểm tra điều kiện thắng ban đầu
  checkAndDisplayVictory(this);
}

// Trong phương thức collectBattery()
collectBattery() {
  // ... code hiện tại ...

  // Cập nhật trạng thái thu thập pin
  updateBatteryStatusText(this, this.statusText);

  // Kiểm tra điều kiện thắng
  const victoryResult = checkAndDisplayVictory(this);
  if (victoryResult.isVictory) {
    // Xử lý khi thắng
    console.log("🎉 Chiến thắng! Đã thu thập đủ pin.");
  }

  return batteryCount;
}

// Thêm phương thức kiểm tra thủ công
checkVictory() {
  const result = checkAndDisplayVictory(this);
  return result.isVictory;
}

// Trong phương thức setupInput()
setupInput() {
  this.input.keyboard.on("keydown", (event) => {
    switch (event.code) {
      // ... code hiện tại ...

      case "KeyV":
        // Kiểm tra điều kiện thắng
        this.checkVictory();
        break;
    }
  });

  // ... code hiện tại ...
}
```

## Tùy Chỉnh Giao Diện

Bạn có thể tùy chỉnh giao diện hiển thị bằng cách sửa đổi các hàm `createBatteryStatusText` và `updateBatteryStatusText` trong file `VictoryConditions.js`.

## Tùy Chỉnh Điều Kiện Thắng

Nếu muốn thay đổi điều kiện thắng (ví dụ: chỉ cần thu thập một số lượng pin nhất định), bạn có thể sửa đổi hàm `checkVictory` trong file `VictoryConditions.js`.
