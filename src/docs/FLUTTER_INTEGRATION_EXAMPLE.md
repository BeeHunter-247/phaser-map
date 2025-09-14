# Flutter Integration Example

## Cấu hình WebView với PhaserChannel

### 1. Dependencies

Thêm vào `pubspec.yaml`:

```yaml
dependencies:
  webview_flutter: ^4.4.2
  webview_flutter_android: ^3.12.1
  webview_flutter_wkwebview: ^3.9.4
```

### 2. Flutter WebView Controller

```dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class PhaserGameController {
  late WebViewController _controller;
  String? _currentMap;
  List<Map<String, dynamic>>? _currentProgram;
  
  // Callbacks
  Function(Map<String, dynamic>)? onVictory;
  Function(Map<String, dynamic>)? onDefeat;
  Function(Map<String, dynamic>)? onProgress;
  Function(Map<String, dynamic>)? onError;

  void initialize(WebViewController controller) {
    _controller = controller;
    _setupMessageListener();
  }

  void _setupMessageListener() {
    _controller.evaluateJavascript('''
      window.addEventListener('message', function(event) {
        if (event.data && event.data.channel === 'phaserChannel') {
          // Gửi message về Flutter
          window.flutter_inappwebview.callHandler('onPhaserMessage', event.data);
        }
      });
    ''');
  }

  // Gửi sự kiện đến game
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

  Future<Map<String, dynamic>?> getGameStatus() async {
    try {
      String result = await _controller.evaluateJavascript('''
        if (window.PhaserChannel) {
          return JSON.stringify(window.PhaserChannel.getGameStatus());
        }
        return null;
      ''');
      
      if (result != 'null' && result.isNotEmpty) {
        return jsonDecode(result);
      }
    } catch (e) {
      print('Error getting game status: $e');
    }
    return null;
  }

  // Xử lý message từ game
  void handlePhaserMessage(Map<String, dynamic> message) {
    switch (message['type']) {
      case 'event':
        _handleGameEvent(message['event'], message['data']);
        break;
      case 'response':
        _handleGameResponse(message['requestId'], message['data']);
        break;
    }
  }

  void _handleGameEvent(String event, Map<String, dynamic> data) {
    switch (event) {
      case 'victory':
        onVictory?.call(data);
        break;
      case 'defeat':
        onDefeat?.call(data);
        break;
      case 'progress':
        onProgress?.call(data);
        break;
      case 'error':
        onError?.call(data);
        break;
      case 'ready':
        print('Game is ready');
        break;
    }
  }

  // Enhanced status handling with detailed data structure
  void handleDetailedStatus(Map<String, dynamic> statusData) {
    final isVictory = statusData['isVictory'] ?? false;
    final mapKey = statusData['mapKey'];
    final collectedBatteries = statusData['collectedBatteries'] ?? 0;
    final collectedBatteryTypes = Map<String, int>.from(
      statusData['collectedBatteryTypes'] ?? {'red': 0, 'yellow': 0, 'green': 0}
    );
    final requiredBatteries = Map<String, int>.from(
      statusData['requiredBatteries'] ?? {'red': 0, 'yellow': 0, 'green': 0}
    );
    final robotPosition = statusData['robotPosition'];
    final isPaused = statusData['isPaused'] ?? false;
    final score = statusData['score'] ?? 0;
    final timestamp = statusData['timestamp'];

    print('Game Status Update:');
    print('  Map: $mapKey');
    print('  Batteries: $collectedBatteries');
    print('  Types: $collectedBatteryTypes');
    print('  Required: $requiredBatteries');
    print('  Robot Position: $robotPosition');
    print('  Paused: $isPaused');
    print('  Score: $score');
    print('  Timestamp: $timestamp');
  }

  void _handleGameResponse(String requestId, Map<String, dynamic> data) {
    // Xử lý response từ game
    print('Game response for $requestId: $data');
  }
}
```

### 3. Flutter Widget

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class PhaserGameWidget extends StatefulWidget {
  final String gameUrl;
  final Function(Map<String, dynamic>)? onVictory;
  final Function(Map<String, dynamic>)? onDefeat;
  final Function(Map<String, dynamic>)? onProgress;

  const PhaserGameWidget({
    Key? key,
    required this.gameUrl,
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
      ..loadRequest(Uri.parse(widget.gameUrl));

    _gameController = PhaserGameController();
    _gameController.onVictory = widget.onVictory;
    _gameController.onDefeat = widget.onDefeat;
    _gameController.onProgress = widget.onProgress;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Phaser Robot Game'),
        actions: [
          IconButton(
            icon: const Icon(Icons.play_arrow),
            onPressed: _resumeGame,
          ),
          IconButton(
            icon: const Icon(Icons.pause),
            onPressed: _pauseGame,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _resetGame,
          ),
        ],
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(),
            ),
        ],
      ),
      floatingActionButton: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          FloatingActionButton(
            onPressed: _loadBasicMap,
            child: const Text('Basic1'),
          ),
          const SizedBox(height: 8),
          FloatingActionButton(
            onPressed: _loadAdvancedMap,
            child: const Text('Basic2'),
          ),
          const SizedBox(height: 8),
          FloatingActionButton(
            onPressed: _runSampleProgram,
            child: const Text('Run'),
          ),
        ],
      ),
    );
  }

  void _pauseGame() {
    _gameController.pauseGame();
  }

  void _resumeGame() {
    _gameController.resumeGame();
  }

  void _resetGame() {
    _gameController.resetGame();
  }

  void _loadBasicMap() {
    _gameController.loadMap('basic1');
  }

  void _loadAdvancedMap() {
    _gameController.loadMap('basic2');
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

### 4. Sử dụng trong App

```dart
import 'package:flutter/material.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Phaser Game Demo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: MyHomePage(),
    );
  }
}

class MyHomePage extends StatefulWidget {
  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _score = 0;
  int _batteries = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Phaser Game Demo'),
      ),
      body: Column(
        children: [
          // Game stats
          Container(
            padding: EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Text('Score: $_score'),
                Text('Batteries: $_batteries'),
              ],
            ),
          ),
          // Game widget
          Expanded(
            child: PhaserGameWidget(
              gameUrl: 'https://your-game-url.com',
              onVictory: _handleVictory,
              onDefeat: _handleDefeat,
              onProgress: _handleProgress,
            ),
          ),
        ],
      ),
    );
  }

  void _handleVictory(Map<String, dynamic> data) {
    setState(() {
      _score += data['score'] ?? 0;
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Victory! Score: ${data['score']}'),
        backgroundColor: Colors.green,
      ),
    );
  }

  void _handleDefeat(Map<String, dynamic> data) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Defeat! Reason: ${data['reason']}'),
        backgroundColor: Colors.red,
      ),
    );
  }

  void _handleProgress(Map<String, dynamic> data) {
    setState(() {
      _batteries = data['collectedBatteries'] ?? 0;
    });
  }
}
```

### 5. Advanced Usage với JavaScript Channels

```dart
// Sử dụng JavaScript channels để giao tiếp trực tiếp
class AdvancedPhaserController {
  late WebViewController _controller;
  Map<String, Completer<dynamic>> _pendingRequests = {};

  Future<T> callGameMethod<T>(String method, Map<String, dynamic> params) async {
    final requestId = DateTime.now().millisecondsSinceEpoch.toString();
    final completer = Completer<T>();
    _pendingRequests[requestId] = completer;

    await _controller.evaluateJavascript('''
      if (window.PhaserChannel) {
        window.PhaserChannel.sendRequest('$method', ${jsonEncode(params)})
          .then(result => {
            window.flutter_inappwebview.callHandler('onMethodResponse', {
              requestId: '$requestId',
              success: true,
              data: result
            });
          })
          .catch(error => {
            window.flutter_inappwebview.callHandler('onMethodResponse', {
              requestId: '$requestId',
              success: false,
              error: error.message
            });
          });
      }
    ''');

    return completer.future;
  }

  void handleMethodResponse(Map<String, dynamic> response) {
    final requestId = response['requestId'];
    final completer = _pendingRequests.remove(requestId);
    
    if (completer != null) {
      if (response['success']) {
        completer.complete(response['data']);
      } else {
        completer.completeError(Exception(response['error']));
      }
    }
  }

  // Ví dụ sử dụng
  Future<Map<String, dynamic>> getGameStatus() async {
    return await callGameMethod<Map<String, dynamic>>('getGameStatus', {});
  }

  Future<bool> loadMap(String mapKey) async {
    return await callGameMethod<bool>('loadMap', {'mapKey': mapKey});
  }
}
```

## Lưu ý quan trọng

1. **CORS**: Đảm bảo game được host trên domain có CORS được cấu hình đúng
2. **HTTPS**: Sử dụng HTTPS trong production
3. **Error Handling**: Luôn xử lý lỗi khi gọi JavaScript
4. **Memory Management**: Cleanup các listener khi không cần thiết
5. **Testing**: Test trên cả Android và iOS WebView
