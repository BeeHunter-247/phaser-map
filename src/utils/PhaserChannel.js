/**
 * PhaserChannel.js
 * 
 * JavaScript channel for communication with Flutter WebView
 * Similar to WebChannel but specifically designed for Phaser games
 * Provides bidirectional communication with Flutter app
 */

export class PhaserChannel {
  constructor(options = {}) {
    this.options = {
      channelName: 'phaserChannel',
      debug: false,
      timeout: 5000,
      retryAttempts: 3,
      ...options
    };
    
    this.messageId = 0;
    this.pendingMessages = new Map();
    this.messageHandlers = new Map();
    this.isConnected = false;
    this.connectionPromise = null;
    
    this.init();
  }

  /**
   * Initialize the channel
   */
  init() {
    this.setupMessageListener();
    this.setupConnectionCheck();
    this.log('PhaserChannel initialized');
  }

  /**
   * Setup message listener for incoming messages
   */
  setupMessageListener() {
    window.addEventListener('message', (event) => {
      try {
        const message = event.data;
        
        // Check if message is for this channel
        if (message && message.channel === this.options.channelName) {
          this.handleIncomingMessage(message);
        }
      } catch (error) {
        this.log('Error handling incoming message:', error);
      }
    });
  }

  /**
   * Setup connection check with Flutter
   */
  setupConnectionCheck() {
    // Send ping to check connection
    this.ping().then(() => {
      this.isConnected = true;
      this.log('Connected to Flutter WebView');
    }).catch(() => {
      this.isConnected = false;
      this.log('Not connected to Flutter WebView');
    });
  }

  /**
   * Handle incoming messages from Flutter
   * @param {Object} message - Message from Flutter
   */
  handleIncomingMessage(message) {
    this.log('Received message:', message);

    // Handle response messages
    if (message.type === 'response' && message.requestId) {
      const pendingMessage = this.pendingMessages.get(message.requestId);
      if (pendingMessage) {
        clearTimeout(pendingMessage.timeout);
        this.pendingMessages.delete(message.requestId);
        
        if (message.success) {
          pendingMessage.resolve(message.data);
        } else {
          pendingMessage.reject(new Error(message.error || 'Unknown error'));
        }
      }
      return;
    }

    // Handle event messages
    if (message.type === 'event') {
      const handler = this.messageHandlers.get(message.event);
      if (handler) {
        try {
          handler(message.data);
        } catch (error) {
          this.log('Error in event handler:', error);
        }
      }
      return;
    }

    // Handle direct method calls
    if (message.type === 'method') {
      this.handleMethodCall(message);
    }
  }

  /**
   * Handle method calls from Flutter
   * @param {Object} message - Method call message
   */
  handleMethodCall(message) {
    const { method, params, requestId } = message;
    
    try {
      let result = null;
      
      switch (method) {
        case 'getGameStatus':
          result = this.getGameStatus();
          break;
        case 'loadMap':
          result = this.loadMap(params.mapKey);
          break;
        case 'runProgram':
          result = this.runProgram(params.program);
          break;
        case 'pauseGame':
          result = this.pauseGame();
          break;
        case 'resumeGame':
          result = this.resumeGame();
          break;
        case 'resetGame':
          result = this.resetGame();
          break;
        default:
          throw new Error(`Unknown method: ${method}`);
      }
      
      this.sendResponse(requestId, true, result);
    } catch (error) {
      this.sendResponse(requestId, false, null, error.message);
    }
  }

  /**
   * Send response back to Flutter
   * @param {string} requestId - Request ID
   * @param {boolean} success - Success status
   * @param {*} data - Response data
   * @param {string} error - Error message
   */
  sendResponse(requestId, success, data = null, error = null) {
    this.sendMessage({
      type: 'response',
      requestId,
      success,
      data,
      error
    });
  }

  /**
   * Send message to Flutter
   * @param {Object} message - Message to send
   * @returns {Promise} Promise that resolves when message is sent
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      const messageId = ++this.messageId;
      const fullMessage = {
        ...message,
        channel: this.options.channelName,
        messageId,
        timestamp: Date.now()
      };

      try {
        // Send to parent window (Flutter WebView)
        window.parent.postMessage(fullMessage, '*');
        this.log('Sent message:', fullMessage);
        resolve(fullMessage);
      } catch (error) {
        this.log('Error sending message:', error);
        reject(error);
      }
    });
  }

  /**
   * Send request and wait for response
   * @param {string} method - Method name
   * @param {Object} params - Parameters
   * @returns {Promise} Promise that resolves with response
   */
  sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store pending message
      this.pendingMessages.set(requestId, {
        resolve,
        reject,
        timeout: setTimeout(() => {
          this.pendingMessages.delete(requestId);
          reject(new Error('Request timeout'));
        }, this.options.timeout)
      });

      // Send request
      this.sendMessage({
        type: 'request',
        method,
        params,
        requestId
      });
    });
  }

  /**
   * Send event to Flutter
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  sendEvent(event, data = {}) {
    this.sendMessage({
      type: 'event',
      event,
      data
    });
  }

  /**
   * Register event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  on(event, handler) {
    this.messageHandlers.set(event, handler);
  }

  /**
   * Unregister event handler
   * @param {string} event - Event name
   */
  off(event) {
    this.messageHandlers.delete(event);
  }

  /**
   * Ping Flutter to check connection
   * @returns {Promise} Promise that resolves if connected
   */
  ping() {
    return this.sendRequest('ping');
  }

  /**
   * Get game status
   * @returns {Object} Game status
   */
  getGameStatus() {
    const scene = window.game?.scene?.getScene('Scene');
    if (!scene) {
      return {
        isRunning: false,
        mapKey: null,
        collectedBatteries: 0,
        collectedBatteryTypes: { red: 0, yellow: 0, green: 0 }
      };
    }

    return {
      isRunning: true,
      mapKey: scene.mapKey,
      collectedBatteries: scene.collectedBatteries || 0,
      collectedBatteryTypes: scene.collectedBatteryTypes || { red: 0, yellow: 0, green: 0 },
      robotPosition: scene.robot ? { x: scene.robot.x, y: scene.robot.y } : null,
      isPaused: scene.scene.isPaused()
    };
  }

  /**
   * Load map
   * @param {string} mapKey - Map key to load
   * @returns {boolean} Success status
   */
  loadMap(mapKey) {
    try {
      const scene = window.game?.scene?.getScene('Scene');
      if (scene) {
        scene.scene.restart({ mapKey });
        return true;
      }
      return false;
    } catch (error) {
      this.log('Error loading map:', error);
      return false;
    }
  }

  /**
   * Run program
   * @param {Array} program - Program to run
   * @returns {boolean} Success status
   */
  runProgram(program) {
    try {
      const scene = window.game?.scene?.getScene('Scene');
      if (scene && typeof scene.loadProgram === 'function') {
        return scene.loadProgram(program, true);
      }
      return false;
    } catch (error) {
      this.log('Error running program:', error);
      return false;
    }
  }

  /**
   * Pause game
   * @returns {boolean} Success status
   */
  pauseGame() {
    try {
      const scene = window.game?.scene?.getScene('Scene');
      if (scene) {
        scene.scene.pause();
        return true;
      }
      return false;
    } catch (error) {
      this.log('Error pausing game:', error);
      return false;
    }
  }

  /**
   * Resume game
   * @returns {boolean} Success status
   */
  resumeGame() {
    try {
      const scene = window.game?.scene?.getScene('Scene');
      if (scene) {
        scene.scene.resume();
        return true;
      }
      return false;
    } catch (error) {
      this.log('Error resuming game:', error);
      return false;
    }
  }

  /**
   * Reset game
   * @returns {boolean} Success status
   */
  resetGame() {
    try {
      const scene = window.game?.scene?.getScene('Scene');
      if (scene) {
        scene.scene.restart();
        return true;
      }
      return false;
    } catch (error) {
      this.log('Error resetting game:', error);
      return false;
    }
  }

  /**
   * Send victory event
   * @param {Object} data - Victory data
   */
  sendVictory(data = {}) {
    this.sendEvent('victory', { isVictory: true, ...data });
  }

  /**
   * Send defeat event
   * @param {Object} data - Defeat data
   */
  sendDefeat(data = {}) {
    this.sendEvent('defeat', { isVictory: false, ...data });
  }

  /**
   * Send progress event
   * @param {Object} data - Progress data
   */
  sendProgress(data) {
    this.sendEvent('progress', data);
  }

  /**
   * Send error event
   * @param {Object} data - Error data
   */
  sendError(data) {
    this.sendEvent('error', data);
  }

  /**
   * Send ready event
   * @param {Object} data - Ready data
   */
  sendReady(data = {}) {
    this.sendEvent('ready', {
      gameVersion: '1.0.0',
      features: ['robot-programming', 'battery-collection'],
      ...data
    });
  }

  /**
   * Log message if debug is enabled
   * @param {...any} args - Arguments to log
   */
  log(...args) {
    if (this.options.debug) {
      console.log('[PhaserChannel]', ...args);
    }
  }

  /**
   * Get connection status
   * @returns {boolean} Connection status
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Clear all pending messages
    this.pendingMessages.forEach(pending => {
      clearTimeout(pending.timeout);
    });
    this.pendingMessages.clear();
    
    // Clear handlers
    this.messageHandlers.clear();
    
    this.log('PhaserChannel destroyed');
  }
}

// Create global instance
let phaserChannelInstance = null;

/**
 * Get or create PhaserChannel instance
 * @param {Object} options - Channel options
 * @returns {PhaserChannel} PhaserChannel instance
 */
export function getPhaserChannel(options = {}) {
  if (!phaserChannelInstance) {
    phaserChannelInstance = new PhaserChannel(options);
  }
  return phaserChannelInstance;
}

/**
 * Initialize PhaserChannel with game instance
 * @param {Object} game - Phaser game instance
 * @param {Object} options - Channel options
 * @returns {PhaserChannel} PhaserChannel instance
 */
export function initPhaserChannel(game, options = {}) {
  const channel = getPhaserChannel(options);
  
  // Store game reference globally for channel methods
  window.game = game;
  
  // Send ready event
  channel.sendReady();
  
  return channel;
}

export default PhaserChannel;
