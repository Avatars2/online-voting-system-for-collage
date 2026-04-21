class RealtimeNotificationService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3; // Reduced from 5 to 3 attempts
    this.reconnectInterval = 10000; // Increased from 5000ms to 10000ms (10 seconds)
    this.isConnected = false;
    this.eventListeners = new Map();
    this.token = null;
  }

  connect(token) {
    this.token = token;
    
    if (this.ws && this.ws.readyState === 1) { // WebSocket.OPEN = 1
      console.log('📡 WebSocket already connected');
      return;
    }

    try {
      const wsUrl = `ws://localhost:5001/?token=${token}`;
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      
      // Use native WebSocket or fallback
      const WebSocketClass = window.WebSocket || window.webkitWebSocket;
      this.ws = new WebSocketClass(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected', { timestamp: new Date().toISOString() });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data);
          this.handleMessage(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        this.isConnected = false;
        this.emit('disconnected', { code: event.code, reason: event.reason });
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          setTimeout(() => this.connect(this.token), this.reconnectInterval);
        } else {
          console.error('❌ Max reconnection attempts reached');
          this.emit('reconnectFailed');
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      this.emit('error', error);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      console.log('🔌 WebSocket disconnected manually');
    }
  }

  handleMessage(data) {
    const { type, data: messageData } = data;
    
    switch (type) {
      case 'CONNECTION_ESTABLISHED':
        console.log('✅ Real-time notifications enabled');
        this.emit('connectionEstablished', messageData);
        break;
        
      case 'USER_REGISTERED':
        console.log('👤 New user registered:', messageData);
        this.emit('userRegistered', messageData);
        this.showNotification('New User Registered', messageData.message, 'info');
        break;
        
      case 'USER_DELETED':
        console.log('🗑️ User deleted:', messageData);
        this.emit('userDeleted', messageData);
        this.showNotification('User Account Deleted', messageData.message, 'warning');
        break;
        
      case 'EMAIL_SENT':
        console.log('📧 Email sent:', messageData);
        this.emit('emailSent', messageData);
        this.showNotification('Email Sent', messageData.message, 'success');
        break;
        
      case 'PONG':
        // Ping-pong for connection health
        this.emit('pong', messageData);
        break;
        
      default:
        console.log('📨 Unknown message type:', type);
        this.emit('unknownMessage', data);
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === 1) { // WebSocket.OPEN = 1
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('❌ Error sending WebSocket message:', error);
        return false;
      }
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
      return false;
    }
  }

  ping() {
    this.send({ type: 'PING', timestamp: new Date().toISOString() });
  }

  // Event listeners
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Browser notifications
  requestNotificationPermission() {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        console.log('🔔 Notification permission:', permission);
      });
    }
  }

  showNotification(title, body, type = 'info') {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: this.getNotificationIcon(type),
        badge: '/favicon.ico',
        tag: `notification-${Date.now()}`,
        requireInteraction: type === 'warning'
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }

    // Console notification for debugging
    console.log(`🔔 ${type.toUpperCase()}: ${title} - ${body}`);
  }

  getNotificationIcon(type) {
    const icons = {
      info: '📢',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    return icons[type] || icons.info;
  }

  // Connection status
  isConnectionOpen() {
    return this.ws && this.ws.readyState === 1; // WebSocket.OPEN = 1
  }

  getConnectionStatus() {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case 0: return 'connecting'; // WebSocket.CONNECTING = 0
      case 1: return 'connected';  // WebSocket.OPEN = 1
      case 2: return 'closing';   // WebSocket.CLOSING = 2
      case 3: return 'closed';    // WebSocket.CLOSED = 3
      default: return 'unknown';
    }
  }

  // Get connection stats
  getStats() {
    return {
      isConnected: this.isConnected,
      status: this.getConnectionStatus(),
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

// Create singleton instance
const realtimeService = new RealtimeNotificationService();

export default realtimeService;
