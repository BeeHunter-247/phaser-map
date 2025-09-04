# Hướng Dẫn Tích Hợp Game Với Webview

Tài liệu này hướng dẫn cách tích hợp game Robot Programming với một trang web thông qua webview/iframe.

## 1. Nhúng Game Vào Trang Web

### Sử dụng iframe

```html
<iframe
  id="robot-game-iframe"
  src="https://your-game-url.com/index.html"
  width="800"
  height="600"
  allow="fullscreen"
  style="border: none;"
></iframe>
```

## 2. Giao Tiếp Giữa Game Và Trang Web

### Từ Trang Web Gửi Đến Game

Sử dụng `postMessage` để gửi thông điệp đến game:

```javascript
// Tham chiếu đến iframe
const gameIframe = document.getElementById("robot-game-iframe");

// Tải map cụ thể
function loadMap(mapKey) {
  gameIframe.contentWindow.postMessage(
    {
      source: "parent-website",
      type: "LOAD_MAP",
      data: { mapKey },
    },
    "*"
  );
}

// Chạy chương trình
function runProgram(program) {
  gameIframe.contentWindow.postMessage(
    {
      source: "parent-website",
      type: "RUN_PROGRAM",
      data: { program },
    },
    "*"
  );
}

// Yêu cầu trạng thái hiện tại
function getStatus() {
  gameIframe.contentWindow.postMessage(
    {
      source: "parent-website",
      type: "GET_STATUS",
    },
    "*"
  );
}
```

### Từ Game Gửi Đến Trang Web

Lắng nghe thông điệp từ game:

```javascript
window.addEventListener("message", (event) => {
  // Kiểm tra nguồn thông điệp để đảm bảo an toàn
  // Trong môi trường thực tế, nên kiểm tra origin

  const message = event.data;

  // Kiểm tra xem thông điệp có đúng định dạng không
  if (message && message.source === "phaser-robot-game") {
    console.log("Received message from game:", message);

    switch (message.type) {
      case "READY":
        // Game đã sẵn sàng
        console.log("Game is ready!", message.data);
        break;

      case "VICTORY":
        // Người chơi đã thắng
        handleVictory(message.data);
        break;

      case "PROGRESS":
        // Cập nhật tiến độ
        updateProgress(message.data);
        break;

      case "ERROR":
        // Xử lý lỗi
        handleError(message.data);
        break;

      case "STATUS":
        // Nhận trạng thái hiện tại
        displayStatus(message.data);
        break;
    }
  }
});

// Xử lý khi người chơi thắng
function handleVictory(data) {
  console.log(`Player completed map ${data.mapKey}!`);
  console.log(
    `Collected ${data.collected.total}/${data.required.total} batteries`
  );

  // Hiển thị thông báo chiến thắng
  showVictoryMessage(data.message);

  // Có thể mở khóa map tiếp theo, cập nhật tiến độ, v.v.
  unlockNextMap(data.mapKey);
}

// Cập nhật hiển thị tiến độ
function updateProgress(data) {
  console.log(`Progress: ${Math.round(data.progress * 100)}%`);

  // Cập nhật thanh tiến độ
  updateProgressBar(data.progress);

  // Hiển thị thông tin thu thập pin
  updateBatteryDisplay(data.collected, data.required);
}
```

### Gọi Trực Tiếp API (Tùy Chọn)

Game cũng cung cấp API toàn cục để gọi trực tiếp:

```javascript
// Tải map
gameIframe.contentWindow.RobotGameAPI.loadMap("basic2");

// Chạy chương trình
const program = {
  version: "1.0.0",
  programName: "test_program",
  actions: [
    { type: "forward", count: 2 },
    { type: "turnRight" },
    { type: "collect", count: 1 },
  ],
};
gameIframe.contentWindow.RobotGameAPI.runProgram(program);

// Lấy trạng thái hiện tại
const status = gameIframe.contentWindow.RobotGameAPI.getStatus();
console.log(status);
```

## 3. Định Dạng Thông Điệp

### Thông Điệp VICTORY

```javascript
{
  source: 'phaser-robot-game',
  type: 'VICTORY',
  data: {
    mapKey: 'basic1',
    isVictory: true,
    progress: 1,
    message: 'Chiến thắng! Đã thu thập đủ 5/5 pin',
    collected: {
      total: 5,
      byType: { red: 2, yellow: 1, green: 2 }
    },
    required: {
      total: 5,
      byType: { red: 2, yellow: 1, green: 2 }
    }
  },
  timestamp: 1621234567890
}
```

### Thông Điệp PROGRESS

```javascript
{
  source: 'phaser-robot-game',
  type: 'PROGRESS',
  data: {
    mapKey: 'basic1',
    isVictory: false,
    progress: 0.6,
    message: 'Đã thu thập 3/5 pin (60%)',
    collected: {
      total: 3,
      byType: { red: 1, yellow: 1, green: 1 }
    },
    required: {
      total: 5,
      byType: { red: 2, yellow: 1, green: 2 }
    }
  },
  timestamp: 1621234567890
}
```

### Thông Điệp STATUS

```javascript
{
  source: 'phaser-robot-game',
  type: 'STATUS',
  data: {
    mapKey: 'basic1',
    collectedBatteries: 3,
    collectedBatteryTypes: { red: 1, yellow: 1, green: 1 }
  },
  timestamp: 1621234567890
}
```

## 4. Định Dạng Chương Trình

Khi gửi chương trình để robot thực thi, sử dụng định dạng sau:

```javascript
{
  version: "1.0.0",
  programName: "example_program",
  actions: [
    { type: "forward", count: 2 },
    { type: "turnRight" },
    { type: "forward", count: 1 },
    { type: "collect", count: 1, color: "green" },
    { type: "turnLeft" },
    { type: "forward", count: 3 },
    { type: "collect", count: 2, color: "red" }
  ]
}
```

### Các Loại Hành Động

- `forward`: Di chuyển thẳng theo hướng hiện tại

  - `count`: Số bước di chuyển (mặc định: 1)

- `turnRight`: Quay phải 90 độ

- `turnLeft`: Quay trái 90 độ

- `turnBack`: Quay 180 độ

- `collect`: Thu thập pin tại vị trí hiện tại
  - `count`: Số pin thu thập (mặc định: 1)
  - `color`: Màu pin ưu tiên thu thập ("red", "yellow", "green")

## 5. Ví Dụ Hoàn Chỉnh

### HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Robot Programming Game Integration</title>
    <style>
      #game-container {
        width: 800px;
        height: 600px;
        margin: 0 auto;
        position: relative;
      }
      #status-panel {
        margin-top: 20px;
        padding: 10px;
        background-color: #f0f0f0;
        border-radius: 5px;
      }
    </style>
  </head>
  <body>
    <h1>Robot Programming Game</h1>

    <div id="game-container">
      <iframe
        id="robot-game-iframe"
        src="https://your-game-url.com/index.html"
        width="800"
        height="600"
        allow="fullscreen"
        style="border: none;"
      ></iframe>
    </div>

    <div id="status-panel">
      <h2>Game Status</h2>
      <div id="map-info">Map: <span id="current-map">-</span></div>
      <div id="progress-info">
        Progress: <span id="current-progress">0%</span>
      </div>
      <div id="battery-info">
        <div>Total: <span id="total-batteries">0/0</span></div>
        <div>Red: <span id="red-batteries">0/0</span></div>
        <div>Yellow: <span id="yellow-batteries">0/0</span></div>
        <div>Green: <span id="green-batteries">0/0</span></div>
      </div>

      <h3>Controls</h3>
      <button onclick="loadMap('basic1')">Load Map 1</button>
      <button onclick="loadMap('basic2')">Load Map 2</button>
      <button onclick="runExampleProgram()">Run Example Program</button>
    </div>

    <script>
      // Tham chiếu đến iframe
      const gameIframe = document.getElementById("robot-game-iframe");

      // Tải map
      function loadMap(mapKey) {
        gameIframe.contentWindow.postMessage(
          {
            source: "parent-website",
            type: "LOAD_MAP",
            data: { mapKey },
          },
          "*"
        );
      }

      // Chạy chương trình mẫu
      function runExampleProgram() {
        const program = {
          version: "1.0.0",
          programName: "example_program",
          actions: [
            { type: "forward", count: 2 },
            { type: "collect", count: 2, color: "green" },
            { type: "forward", count: 2 },
            { type: "collect", count: 2, color: "red" },
          ],
        };

        gameIframe.contentWindow.postMessage(
          {
            source: "parent-website",
            type: "RUN_PROGRAM",
            data: { program },
          },
          "*"
        );
      }

      // Lắng nghe thông điệp từ game
      window.addEventListener("message", (event) => {
        const message = event.data;

        if (message && message.source === "phaser-robot-game") {
          console.log("Received message from game:", message);

          switch (message.type) {
            case "READY":
              console.log("Game is ready!", message.data);
              break;

            case "VICTORY":
              handleVictory(message.data);
              break;

            case "PROGRESS":
              updateProgress(message.data);
              break;

            case "STATUS":
              displayStatus(message.data);
              break;
          }
        }
      });

      // Xử lý khi người chơi thắng
      function handleVictory(data) {
        alert(`Chiến thắng! ${data.message}`);
        updateProgress(data);
      }

      // Cập nhật hiển thị tiến độ
      function updateProgress(data) {
        document.getElementById("current-map").textContent = data.mapKey;
        document.getElementById("current-progress").textContent = `${Math.round(
          data.progress * 100
        )}%`;
        document.getElementById(
          "total-batteries"
        ).textContent = `${data.collected.total}/${data.required.total}`;
        document.getElementById("red-batteries").textContent = `${
          data.collected.byType.red || 0
        }/${data.required.byType.red || 0}`;
        document.getElementById("yellow-batteries").textContent = `${
          data.collected.byType.yellow || 0
        }/${data.required.byType.yellow || 0}`;
        document.getElementById("green-batteries").textContent = `${
          data.collected.byType.green || 0
        }/${data.required.byType.green || 0}`;
      }

      // Hiển thị trạng thái
      function displayStatus(data) {
        document.getElementById("current-map").textContent = data.mapKey;
        document.getElementById(
          "total-batteries"
        ).textContent = `${data.collectedBatteries}/??`;
      }
    </script>
  </body>
</html>
```

## 6. Bảo Mật

Khi triển khai trong môi trường thực tế, nên thêm các biện pháp bảo mật sau:

1. **Kiểm tra origin**: Thay vì sử dụng `'*'` trong `postMessage`, nên chỉ định origin cụ thể.
2. **Kiểm tra nguồn thông điệp**: Xác minh rằng thông điệp đến từ nguồn đáng tin cậy.
3. **Xác thực dữ liệu**: Kiểm tra tính hợp lệ của dữ liệu trước khi xử lý.
4. **Giới hạn quyền truy cập**: Chỉ cho phép các trang web được ủy quyền nhúng game.

## 7. Xử Lý Lỗi

Nên xử lý các tình huống lỗi như:

1. **Iframe không tải được**: Hiển thị thông báo lỗi và hướng dẫn khắc phục.
2. **Thông điệp không hợp lệ**: Bỏ qua hoặc ghi log lỗi.
3. **Chương trình không hợp lệ**: Hiển thị thông báo lỗi cụ thể.
4. **Map không tồn tại**: Hiển thị thông báo lỗi và gợi ý map khác.
