# PhaserChannel Guide

## Tổng quan

PhaserChannel là một JavaScript channel được thiết kế để giao tiếp giữa game Phaser và Flutter WebView. Nó hoạt động tương tự như WebChannel nhưng được tối ưu hóa cho các game Phaser.

## Tính năng chính

- **Bidirectional Communication**: Giao tiếp hai chiều giữa JavaScript và Flutter
- **Event-driven**: Hệ thống sự kiện linh hoạt
- **Request-Response**: Hỗ trợ gọi phương thức và nhận phản hồi
- **Error Handling**: Xử lý lỗi và timeout
- **Debug Mode**: Chế độ debug để theo dõi giao tiếp
- **Backward Compatibility**: Tương thích với hệ thống cũ

## Cài đặt và Khởi tạo

### 1. Import PhaserChannel

```javascript
import { PhaserChannel, getPhaserChannel, initPhaserChannel } from './utils/PhaserChannel.js';
```

### 2. Khởi tạo Channel

```javascript
// Khởi tạo với game instance
const channel = initPhaserChannel(game, {
  debug: true,
  channelName: 'phaserChannel',
  timeout: 5000,
  retryAttempts: 3
});

// Hoặc lấy instance đã có
const channel = getPhaserChannel();
```

## API Reference

### Phương thức chính

#### `sendEvent(event, data)`
Gửi sự kiện đến Flutter

```javascript
channel.sendEvent('victory', { 
  isVictory: true, 
  score: 100 
});
```

#### `sendRequest(method, params)`
Gửi yêu cầu và chờ phản hồi

```javascript
try {
  const result = await channel.sendRequest('getGameStatus');
  console.log('Game status:', result);
} catch (error) {
  console.error('Request failed:', error);
}
```

#### `on(event, handler)`
Đăng ký xử lý sự kiện

```javascript
channel.on('loadMap', (data) => {
  console.log('Load map:', data.mapKey);
  game.scene.start('Scene', { mapKey: data.mapKey });
});
```

#### `off(event)`
Hủy đăng ký xử lý sự kiện

```javascript
channel.off('loadMap');
```

### Sự kiện có sẵn

#### Từ JavaScript đến Flutter

- `ready`: Game đã sẵn sàng
- `victory`: Thắng game
- `defeat`: Thua game
- `progress`: Tiến độ game
- `error`: Lỗi xảy ra

#### Từ Flutter đến JavaScript

- `start_map`: Bắt đầu map
- `load_map`: Tải map mới
- `run_program`: Chạy chương trình
- `get_status`: Lấy trạng thái game
- `pause_game`: Tạm dừng game
- `resume_game`: Tiếp tục game
- `reset_game`: Reset game

### Phương thức game

#### `getGameStatus()`
Lấy trạng thái hiện tại của game

```javascript
const status = channel.getGameStatus();
console.log(status);
// Output: {
//   isRunning: true,
//   mapKey: 'basic1',
//   collectedBatteries: 3,
//   collectedBatteryTypes: { red: 1, yellow: 1, green: 1 },
//   robotPosition: { x: 100, y: 200 },
//   isPaused: false
// }
```

#### `loadMap(mapKey)`
Tải map mới

```javascript
const success = channel.loadMap('basic2');
if (success) {
  console.log('Map loaded successfully');
}
```

#### `runProgram(program)`
Chạy chương trình robot

```javascript
const program = [
  { type: 'move', direction: 'north' },
  { type: 'collect' },
  { type: 'move', direction: 'east' }
];

const success = channel.runProgram(program);
```

#### `pauseGame()`, `resumeGame()`, `resetGame()`
Điều khiển game

```javascript
channel.pauseGame();
// ... sau một lúc
channel.resumeGame();
```

## Ví dụ sử dụng

### 1. Khởi tạo cơ bản

```javascript
import { initPhaserChannel } from './utils/PhaserChannel.js';

// Trong main.js
const game = new Phaser.Game(config);

window.addEventListener('load', () => {
  setTimeout(() => {
    const channel = initPhaserChannel(game, { debug: true });
    
    // Đăng ký xử lý sự kiện
    channel.on('loadMap', (data) => {
      game.scene.start('Scene', { mapKey: data.mapKey });
    });
    
    channel.on('runProgram', (data) => {
      const scene = game.scene.getScene('Scene');
      scene.loadProgram(data.program, true);
    });
  }, 1000);
});
```

### 2. Gửi sự kiện từ game

```javascript
// Trong Scene.js
class Scene extends Phaser.Scene {
  // ... game logic
  
  onVictory() {
    // Gửi sự kiện thắng
    window.PhaserChannel.sendVictory({
      score: this.score,
      time: this.gameTime,
      batteries: this.collectedBatteries
    });
  }
  
  onDefeat() {
    // Gửi sự kiện thua
    window.PhaserChannel.sendDefeat({
      reason: 'out_of_battery',
      score: this.score
    });
  }
  
  onProgress() {
    // Gửi tiến độ
    window.PhaserChannel.sendProgress({
      collectedBatteries: this.collectedBatteries,
      totalBatteries: this.totalBatteries,
      percentage: (this.collectedBatteries / this.totalBatteries) * 100
    });
  }
}
```

### 3. Xử lý yêu cầu từ Flutter

```javascript
// Đăng ký xử lý các yêu cầu từ Flutter
channel.on('get_status', () => {
  const status = channel.getGameStatus();
  // Status sẽ được tự động gửi về Flutter
});

channel.on('pause_game', () => {
  channel.pauseGame();
});

channel.on('resume_game', () => {
  channel.resumeGame();
});
```

## Tích hợp với Flutter

### 1. Cấu hình WebView

```dart
WebView(
  initialUrl: 'your-game-url',
  javascriptMode: JavascriptMode.unrestricted,
  onWebViewCreated: (WebViewController controller) {
    _controller = controller;
  },
  onPageFinished: (String url) {
    // Đăng ký JavaScript channel
    _controller.evaluateJavascript('''
      if (window.PhaserChannel) {
        window.PhaserChannel.sendEvent('flutter_ready', {});
      }
    ''');
  },
)
```

### 2. Gửi sự kiện từ Flutter

```dart
// Gửi sự kiện load map
void loadMap(String mapKey) {
  _controller.evaluateJavascript('''
    if (window.PhaserChannel) {
      window.PhaserChannel.sendEvent('load_map', { mapKey: '$mapKey' });
    }
  ''');
}

// Gửi chương trình robot
void runProgram(List<Map<String, dynamic>> program) {
  String programJson = jsonEncode(program);
  _controller.evaluateJavascript('''
    if (window.PhaserChannel) {
      window.PhaserChannel.sendEvent('run_program', { program: $programJson });
    }
  ''');
}
```

### 3. Lắng nghe sự kiện từ JavaScript

```dart
// Trong WebView
onPageFinished: (String url) {
  _controller.evaluateJavascript('''
    window.addEventListener('message', function(event) {
      if (event.data && event.data.channel === 'phaserChannel') {
        // Xử lý sự kiện từ game
        switch(event.data.type) {
          case 'event':
            handleGameEvent(event.data.event, event.data.data);
            break;
          case 'response':
            handleGameResponse(event.data.requestId, event.data.data);
            break;
        }
      }
    });
  ''');
}

void handleGameEvent(String event, Map<String, dynamic> data) {
  switch (event) {
    case 'victory':
      // Xử lý thắng game
      break;
    case 'defeat':
      // Xử lý thua game
      break;
    case 'progress':
      // Cập nhật tiến độ
      break;
  }
}
```

## Debug và Troubleshooting

### 1. Bật debug mode

```javascript
const channel = initPhaserChannel(game, { debug: true });
```

### 2. Kiểm tra kết nối

```javascript
// Kiểm tra trạng thái kết nối
console.log('Connected:', channel.getConnectionStatus());

// Ping để kiểm tra kết nối
channel.ping().then(() => {
  console.log('Connection OK');
}).catch(() => {
  console.log('Connection failed');
});
```

### 3. Xem tất cả sự kiện

```javascript
// Đăng ký xem tất cả sự kiện
channel.on('*', (event, data) => {
  console.log('Event received:', event, data);
});
```

## Lưu ý quan trọng

1. **Timing**: Đảm bảo game đã khởi tạo xong trước khi sử dụng channel
2. **Error Handling**: Luôn xử lý lỗi khi gửi request
3. **Memory Management**: Hủy đăng ký event handler khi không cần thiết
4. **Security**: Trong môi trường production, nên kiểm tra origin của message
5. **Performance**: Tránh gửi quá nhiều sự kiện trong thời gian ngắn

## Migration từ WebViewMessenger cũ

PhaserChannel tương thích ngược với WebViewMessenger cũ. Các hàm cũ vẫn hoạt động bình thường:

```javascript
// Các hàm cũ vẫn hoạt động
sendVictoryMessage();
sendProgressMessage(data);
sendLoseMessage();
sendErrorMessage(error);
```

Nhưng khuyến khích sử dụng PhaserChannel mới:

```javascript
// Cách mới
window.PhaserChannel.sendVictory(data);
window.PhaserChannel.sendProgress(data);
window.PhaserChannel.sendDefeat(data);
window.PhaserChannel.sendError(data);
```
