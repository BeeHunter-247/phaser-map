# 🎮 Flutter Integration Prompt - Phaser Game Status

## 📋 Tổng quan

Đây là prompt chi tiết để tích hợp Phaser Robot Game vào Flutter app với đầy đủ xử lý status và events từ game.

## 🔧 Dependencies cần thiết

```yaml
dependencies:
  webview_flutter: ^4.4.2
  webview_flutter_android: ^3.12.1
  webview_flutter_wkwebview: ^3.9.4
```

## 📡 Cấu trúc Message từ Phaser

### 1. Message Format
```javascript
{
  channel: 'PhaserChannel',
  type: 'event' | 'response' | 'method',
  event: 'victory' | 'defeat' | 'progress' | 'error' | 'ready',
  data: { /* status data */ },
  messageId: number,
  timestamp: number
}
```

### 2. Status Data Structure
```javascript
// VICTORY/LOSE Event Data
{
  isVictory: boolean,
  mapKey: string,
  collectedBatteries: number,
  collectedBatteryTypes: {
    red: number,
    yellow: number, 
    green: number
  },
  requiredBatteries: {
    red: number,
    yellow: number,
    green: number
  },
  details: object,
  robotPosition: { x: number, y: number } | null,
  isPaused: boolean,
  score: number,
  timestamp: number
}

// PROGRESS Event Data
{
  mapKey: string,
  collectedBatteries: number,
  collectedBatteryTypes: object,
  robotPosition: object | null,
  isPaused: boolean,
  timestamp: number
}

// READY Event Data
{
  gameVersion: string,
  features: string[],
  timestamp: number
}

// ERROR Event Data
{
  error: string,
  details: object,
  timestamp: number
}
```

## 🚀 Flutter Implementation

### 1. Game Status Model

```dart
class GameStatus {
  final bool isVictory;
  final String? mapKey;
  final int collectedBatteries;
  final Map<String, int> collectedBatteryTypes;
  final Map<String, int> requiredBatteries;
  final Map<String, dynamic> details;
  final Position? robotPosition;
  final bool isPaused;
  final int score;
  final DateTime timestamp;

  GameStatus({
    required this.isVictory,
    this.mapKey,
    required this.collectedBatteries,
    required this.collectedBatteryTypes,
    required this.requiredBatteries,
    required this.details,
    this.robotPosition,
    required this.isPaused,
    required this.score,
    required this.timestamp,
  });

  factory GameStatus.fromJson(Map<String, dynamic> json) {
    return GameStatus(
      isVictory: json['isVictory'] ?? false,
      mapKey: json['mapKey'],
      collectedBatteries: json['collectedBatteries'] ?? 0,
      collectedBatteryTypes: Map<String, int>.from(
        json['collectedBatteryTypes'] ?? {'red': 0, 'yellow': 0, 'green': 0}
      ),
      requiredBatteries: Map<String, int>.from(
        json['requiredBatteries'] ?? {'red': 0, 'yellow': 0, 'green': 0}
      ),
      details: Map<String, dynamic>.from(json['details'] ?? {}),
      robotPosition: json['robotPosition'] != null 
        ? Position.fromJson(json['robotPosition']) 
        : null,
      isPaused: json['isPaused'] ?? false,
      score: json['score'] ?? 0,
      timestamp: DateTime.fromMillisecondsSinceEpoch(
        json['timestamp'] ?? DateTime.now().millisecondsSinceEpoch
      ),
    );
  }
}

class Position {
  final double x;
  final double y;

  Position({required this.x, required this.y});

  factory Position.fromJson(Map<String, dynamic> json) {
    return Position(
      x: (json['x'] ?? 0).toDouble(),
      y: (json['y'] ?? 0).toDouble(),
    );
  }
}
```

### 2. Game Event Types

```dart
enum GameEventType {
  victory,
  defeat,
  progress,
  error,
  ready,
  status
}

class GameEvent {
  final GameEventType type;
  final GameStatus? status;
  final String? error;
  final Map<String, dynamic>? rawData;
  final DateTime timestamp;

  GameEvent({
    required this.type,
    this.status,
    this.error,
    this.rawData,
    required this.timestamp,
  });
}
```

### 3. Phaser Game Controller

```dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class PhaserGameController {
  late WebViewController _controller;
  String? _currentMap;
  List<Map<String, dynamic>>? _currentProgram;
  
  // Event callbacks
  Function(GameEvent)? onGameEvent;
  Function(GameStatus)? onVictory;
  Function(GameStatus)? onDefeat;
  Function(GameStatus)? onProgress;
  Function(String, Map<String, dynamic>?)? onError;
  Function(Map<String, dynamic>)? onReady;

  void initialize(WebViewController controller) {
    _controller = controller;
    _setupMessageListener();
  }

  void _setupMessageListener() {
    _controller.evaluateJavascript('''
      // Setup message listener for PhaserChannel
      window.addEventListener('message', function(event) {
        if (event.data && event.data.channel === 'PhaserChannel') {
          // Send message to Flutter
          window.flutter_inappwebview.callHandler('onPhaserMessage', event.data);
        }
      });
      
      // Also listen for direct PhaserChannel events
      if (window.PhaserChannel) {
        window.PhaserChannel.on('victory', function(data) {
          window.flutter_inappwebview.callHandler('onPhaserEvent', {
            type: 'victory',
            data: data
          });
        });
        
        window.PhaserChannel.on('defeat', function(data) {
          window.flutter_inappwebview.callHandler('onPhaserEvent', {
            type: 'defeat', 
            data: data
          });
        });
        
        window.PhaserChannel.on('progress', function(data) {
          window.flutter_inappwebview.callHandler('onPhaserEvent', {
            type: 'progress',
            data: data
          });
        });
        
        window.PhaserChannel.on('error', function(data) {
          window.flutter_inappwebview.callHandler('onPhaserEvent', {
            type: 'error',
            data: data
          });
        });
        
        window.PhaserChannel.on('ready', function(data) {
          window.flutter_inappwebview.callHandler('onPhaserEvent', {
            type: 'ready',
            data: data
          });
        });
      }
    ''');
  }

  // Handle messages from Phaser
  void handlePhaserMessage(Map<String, dynamic> message) {
    try {
      final type = message['type'] as String?;
      final event = message['event'] as String?;
      final data = message['data'] as Map<String, dynamic>?;

      if (type == 'event' && event != null && data != null) {
        _handleGameEvent(event, data);
      }
    } catch (e) {
      print('Error handling Phaser message: $e');
    }
  }

  void handlePhaserEvent(Map<String, dynamic> eventData) {
    try {
      final type = eventData['type'] as String?;
      final data = eventData['data'] as Map<String, dynamic>?;

      if (type != null && data != null) {
        _handleGameEvent(type, data);
      }
    } catch (e) {
      print('Error handling Phaser event: $e');
    }
  }

  void _handleGameEvent(String eventType, Map<String, dynamic> data) {
    final timestamp = DateTime.now();
    
    switch (eventType) {
      case 'victory':
        final status = GameStatus.fromJson(data);
        final event = GameEvent(
          type: GameEventType.victory,
          status: status,
          timestamp: timestamp,
        );
        onGameEvent?.call(event);
        onVictory?.call(status);
        break;
        
      case 'defeat':
        final status = GameStatus.fromJson(data);
        final event = GameEvent(
          type: GameEventType.defeat,
          status: status,
          timestamp: timestamp,
        );
        onGameEvent?.call(event);
        onDefeat?.call(status);
        break;
        
      case 'progress':
        final status = GameStatus.fromJson(data);
        final event = GameEvent(
          type: GameEventType.progress,
          status: status,
          timestamp: timestamp,
        );
        onGameEvent?.call(event);
        onProgress?.call(status);
        break;
        
      case 'error':
        final error = data['error'] as String? ?? 'Unknown error';
        final event = GameEvent(
          type: GameEventType.error,
          error: error,
          rawData: data,
          timestamp: timestamp,
        );
        onGameEvent?.call(event);
        onError?.call(error, data);
        break;
        
      case 'ready':
        final event = GameEvent(
          type: GameEventType.ready,
          rawData: data,
          timestamp: timestamp,
        );
        onGameEvent?.call(event);
        onReady?.call(data);
        break;
    }
  }

  // Game control methods
  Future<void> loadMap(String mapKey) async {
    await _controller.evaluateJavascript('''
      if (window.PhaserChannel) {
        window.PhaserChannel.sendEvent('load_map', { mapKey: '$mapKey' });
      }
    ''');
    _currentMap = mapKey;
  }

  Future<void> runProgram(List<Map<String, dynamic>> program) async {
    String programJson = jsonEncode(program);
    await _controller.evaluateJavascript('''
      if (window.PhaserChannel) {
        window.PhaserChannel.sendEvent('run_program', { program: $programJson });
      }
    ''');
    _currentProgram = program;
  }

  Future<void> pauseGame() async {
    await _controller.evaluateJavascript('''
      if (window.PhaserChannel) {
        window.PhaserChannel.sendEvent('pause_game', {});
      }
    ''');
  }

  Future<void> resumeGame() async {
    await _controller.evaluateJavascript('''
      if (window.PhaserChannel) {
        window.PhaserChannel.sendEvent('resume_game', {});
      }
    ''');
  }

  Future<void> resetGame() async {
    await _controller.evaluateJavascript('''
      if (window.PhaserChannel) {
        window.PhaserChannel.sendEvent('reset_game', {});
      }
    ''');
  }

  Future<GameStatus?> getGameStatus() async {
    try {
      String result = await _controller.evaluateJavascript('''
        if (window.PhaserChannel) {
          return JSON.stringify(window.PhaserChannel.getGameStatus());
        }
        return null;
      ''');
      
      if (result != 'null' && result.isNotEmpty) {
        final data = jsonDecode(result) as Map<String, dynamic>;
        return GameStatus.fromJson(data);
      }
    } catch (e) {
      print('Error getting game status: $e');
    }
    return null;
  }
}
```

### 4. Game Widget với Status Display

```dart
class PhaserGameWidget extends StatefulWidget {
  final String gameUrl;
  final Function(GameEvent)? onGameEvent;
  final Function(GameStatus)? onVictory;
  final Function(GameStatus)? onDefeat;
  final Function(GameStatus)? onProgress;

  const PhaserGameWidget({
    Key? key,
    required this.gameUrl,
    this.onGameEvent,
    this.onVictory,
    this.onDefeat,
    this.onProgress,
  }) : super(key: key);

  @override
  State<PhaserGameWidget> createState() => _PhaserGameWidgetState();
}

class _PhaserGameWidgetState extends State<PhaserGameWidget> {
  late WebViewController _controller;
  late PhaserGameController _gameController;
  bool _isLoading = true;
  
  // Game status
  GameStatus? _currentStatus;
  int _totalScore = 0;
  int _victoryCount = 0;

  @override
  void initState() {
    super.initState();
    _initializeWebView();
  }

  void _initializeWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (String url) {
            setState(() {
              _isLoading = false;
            });
            _gameController.initialize(_controller);
          },
        ),
      )
      ..addJavaScriptChannel(
        'flutter_inappwebview',
        onMessageReceived: (JavaScriptMessage message) {
          final data = jsonDecode(message.message) as Map<String, dynamic>;
          if (data.containsKey('onPhaserMessage')) {
            _gameController.handlePhaserMessage(data['onPhaserMessage']);
          } else if (data.containsKey('onPhaserEvent')) {
            _gameController.handlePhaserEvent(data['onPhaserEvent']);
          }
        },
      )
      ..loadRequest(Uri.parse(widget.gameUrl));

    _gameController = PhaserGameController();
    _gameController.onGameEvent = _handleGameEvent;
    _gameController.onVictory = _handleVictory;
    _gameController.onDefeat = _handleDefeat;
    _gameController.onProgress = _handleProgress;
  }

  void _handleGameEvent(GameEvent event) {
    widget.onGameEvent?.call(event);
    
    setState(() {
      _currentStatus = event.status;
    });
  }

  void _handleVictory(GameStatus status) {
    setState(() {
      _victoryCount++;
      _totalScore += status.score;
    });
    
    widget.onVictory?.call(status);
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('🏆 Victory! Score: ${status.score}'),
        backgroundColor: Colors.green,
        duration: Duration(seconds: 3),
      ),
    );
  }

  void _handleDefeat(GameStatus status) {
    widget.onDefeat?.call(status);
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('💥 Defeat! Try again!'),
        backgroundColor: Colors.red,
        duration: Duration(seconds: 2),
      ),
    );
  }

  void _handleProgress(GameStatus status) {
    widget.onProgress?.call(status);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Robot Game'),
        actions: [
          IconButton(
            icon: Icon(Icons.play_arrow),
            onPressed: _gameController.resumeGame,
          ),
          IconButton(
            icon: Icon(Icons.pause),
            onPressed: _gameController.pauseGame,
          ),
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _gameController.resetGame,
          ),
        ],
      ),
      body: Column(
        children: [
          // Status display
          if (_currentStatus != null) _buildStatusDisplay(),
          
          // Game area
          Expanded(
            child: Stack(
              children: [
                WebViewWidget(controller: _controller),
                if (_isLoading)
                  Center(child: CircularProgressIndicator()),
              ],
            ),
          ),
          
          // Control buttons
          _buildControlButtons(),
        ],
      ),
    );
  }

  Widget _buildStatusDisplay() {
    if (_currentStatus == null) return SizedBox.shrink();
    
    return Container(
      padding: EdgeInsets.all(16),
      color: Colors.grey[100],
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStatCard('Score', '$_totalScore', Colors.blue),
              _buildStatCard('Victories', '$_victoryCount', Colors.green),
              _buildStatCard('Batteries', '${_currentStatus!.collectedBatteries}', Colors.orange),
            ],
          ),
          SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildBatteryType('Red', _currentStatus!.collectedBatteryTypes['red'] ?? 0, Colors.red),
              _buildBatteryType('Yellow', _currentStatus!.collectedBatteryTypes['yellow'] ?? 0, Colors.yellow[700]!),
              _buildBatteryType('Green', _currentStatus!.collectedBatteryTypes['green'] ?? 0, Colors.green),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String label, String value, Color color) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
          Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  Widget _buildBatteryType(String type, int count, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        SizedBox(width: 4),
        Text('$type: $count', style: TextStyle(fontSize: 12)),
      ],
    );
  }

  Widget _buildControlButtons() {
    return Container(
      padding: EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          ElevatedButton(
            onPressed: () => _gameController.loadMap('basic1'),
            child: Text('Basic 1'),
          ),
          ElevatedButton(
            onPressed: () => _gameController.loadMap('basic2'),
            child: Text('Basic 2'),
          ),
          ElevatedButton(
            onPressed: _runSampleProgram,
            child: Text('Run Program'),
          ),
        ],
      ),
    );
  }

  void _runSampleProgram() {
    final program = [
      {'type': 'move', 'direction': 'north'},
      {'type': 'collect'},
      {'type': 'move', 'direction': 'east'},
      {'type': 'move', 'direction': 'east'},
      {'type': 'collect'},
    ];
    _gameController.runProgram(program);
  }
}
```

### 5. Usage Example

```dart
class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Phaser Game Demo',
      home: MyHomePage(),
    );
  }
}

class MyHomePage extends StatefulWidget {
  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Phaser Game Demo')),
      body: PhaserGameWidget(
        gameUrl: 'https://your-game-url.com',
        onGameEvent: (event) {
          print('Game event: ${event.type}');
        },
        onVictory: (status) {
          print('Victory! Score: ${status.score}');
        },
        onDefeat: (status) {
          print('Defeat! Batteries: ${status.collectedBatteries}');
        },
        onProgress: (status) {
          print('Progress: ${status.collectedBatteries} batteries collected');
        },
      ),
    );
  }
}
```

## 🔍 Debugging Tips

1. **Enable debug logging:**
```dart
// In PhaserGameController
void _setupMessageListener() {
  _controller.evaluateJavascript('''
    // Enable debug mode
    if (window.PhaserChannel) {
      window.PhaserChannel.options.debug = true;
    }
  ''');
}
```

2. **Check message format:**
```dart
void handlePhaserMessage(Map<String, dynamic> message) {
  print('Received message: $message');
  // ... rest of implementation
}
```

3. **Test connection:**
```dart
Future<void> testConnection() async {
  final status = await _gameController.getGameStatus();
  print('Game status: $status');
}
```

## ⚠️ Lưu ý quan trọng

1. **CORS**: Đảm bảo game được host trên domain có CORS được cấu hình đúng
2. **HTTPS**: Sử dụng HTTPS trong production
3. **Error Handling**: Luôn xử lý lỗi khi gọi JavaScript
4. **Memory Management**: Cleanup các listener khi không cần thiết
5. **Testing**: Test trên cả Android và iOS WebView

## 🎯 Các Event được gửi từ Phaser

- **VICTORY**: Khi hoàn thành màn chơi
- **LOSE**: Khi thua cuộc
- **PROGRESS**: Khi có tiến độ mới (thu thập pin, di chuyển)
- **ERROR**: Khi có lỗi xảy ra
- **READY**: Khi game sẵn sàng
- **STATUS**: Khi Flutter yêu cầu trạng thái hiện tại
