/**
 * PhaserChannelExample.js
 * 
 * Ví dụ sử dụng PhaserChannel để giao tiếp với Flutter WebView
 */

import { getPhaserChannel } from '../utils/PhaserChannel.js';

// Lấy instance của PhaserChannel
const channel = getPhaserChannel();

// Ví dụ 1: Gửi sự kiện thắng game
function sendVictoryExample() {
  channel.sendVictory({
    score: 1000,
    time: 120, // seconds
    batteries: 5,
    level: 'basic1'
  });
}

// Ví dụ 2: Gửi sự kiện thua game
function sendDefeatExample() {
  channel.sendDefeat({
    reason: 'out_of_battery',
    score: 500,
    time: 60
  });
}

// Ví dụ 3: Gửi tiến độ game
function sendProgressExample() {
  channel.sendProgress({
    collectedBatteries: 3,
    totalBatteries: 8,
    percentage: 37.5,
    currentMap: 'basic2'
  });
}

// Ví dụ 4: Lắng nghe sự kiện từ Flutter
function setupEventListeners() {
  // Lắng nghe sự kiện tải map
  channel.on('load_map', (data) => {
    console.log('Loading map:', data.mapKey);
    // Thực hiện tải map
    if (window.game) {
      const scene = window.game.scene.getScene('Scene');
      if (scene) {
        scene.scene.restart({ mapKey: data.mapKey });
      }
    }
  });

  // Lắng nghe sự kiện chạy chương trình
  channel.on('run_program', (data) => {
    console.log('Running program:', data.program);
    // Thực hiện chạy chương trình
    if (window.game) {
      const scene = window.game.scene.getScene('Scene');
      if (scene && typeof scene.loadProgram === 'function') {
        scene.loadProgram(data.program, true);
      }
    }
  });

  // Lắng nghe sự kiện tạm dừng game
  channel.on('pause_game', () => {
    console.log('Pausing game');
    channel.pauseGame();
  });

  // Lắng nghe sự kiện tiếp tục game
  channel.on('resume_game', () => {
    console.log('Resuming game');
    channel.resumeGame();
  });

  // Lắng nghe sự kiện reset game
  channel.on('reset_game', () => {
    console.log('Resetting game');
    channel.resetGame();
  });
}

// Ví dụ 5: Gửi yêu cầu và chờ phản hồi
async function requestGameStatus() {
  try {
    const status = await channel.sendRequest('getGameStatus');
    console.log('Game status:', status);
    return status;
  } catch (error) {
    console.error('Failed to get game status:', error);
    return null;
  }
}

// Ví dụ 6: Ping để kiểm tra kết nối
async function checkConnection() {
  try {
    await channel.ping();
    console.log('✅ Connected to Flutter WebView');
    return true;
  } catch (error) {
    console.log('❌ Not connected to Flutter WebView');
    return false;
  }
}

// Ví dụ 7: Sử dụng các phương thức game
function gameControlExamples() {
  // Lấy trạng thái game
  const status = channel.getGameStatus();
  console.log('Current game status:', status);

  // Tải map mới
  const loadSuccess = channel.loadMap('basic3');
  console.log('Map load result:', loadSuccess);

  // Chạy chương trình robot
  const program = [
    { type: 'move', direction: 'north' },
    { type: 'collect' },
    { type: 'move', direction: 'east' },
    { type: 'move', direction: 'east' },
    { type: 'collect' }
  ];
  
  const runSuccess = channel.runProgram(program);
  console.log('Program run result:', runSuccess);
}

// Ví dụ 8: Xử lý lỗi
function errorHandlingExample() {
  channel.on('error', (errorData) => {
    console.error('Game error:', errorData);
    // Gửi lỗi về Flutter
    channel.sendError({
      message: errorData.message,
      stack: errorData.stack,
      timestamp: Date.now()
    });
  });
}

// Ví dụ 9: Gửi sự kiện tùy chỉnh
function sendCustomEvent() {
  channel.sendEvent('custom_event', {
    action: 'special_move',
    data: { x: 100, y: 200 },
    timestamp: Date.now()
  });
}

// Ví dụ 10: Cleanup khi thoát game
function cleanup() {
  // Hủy đăng ký tất cả event handlers
  channel.off('load_map');
  channel.off('run_program');
  channel.off('pause_game');
  channel.off('resume_game');
  channel.off('reset_game');
  channel.off('error');
  
  // Gửi sự kiện thoát game
  channel.sendEvent('game_exit', {});
  
  // Cleanup channel
  channel.destroy();
}

// Export các hàm để sử dụng
export {
  sendVictoryExample,
  sendDefeatExample,
  sendProgressExample,
  setupEventListeners,
  requestGameStatus,
  checkConnection,
  gameControlExamples,
  errorHandlingExample,
  sendCustomEvent,
  cleanup
};

// Tự động thiết lập khi load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Đợi một chút để đảm bảo PhaserChannel đã được khởi tạo
    setTimeout(() => {
      setupEventListeners();
      errorHandlingExample();
      console.log('📡 PhaserChannel examples initialized');
    }, 2000);
  });
}
