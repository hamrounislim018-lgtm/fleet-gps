/**
 * WebSocket service for real-time GPS tracking
 */
class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectTimer = null;
    this.reconnectDelay = 3000;
    this.maxReconnectDelay = 30000;
  }

  connect(token) {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws?token=${token}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectDelay = 3000;
      this.emit('connected', {});
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.emit(message.type, message.data);
      } catch {}
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      this.emit('disconnected', {});
      this.scheduleReconnect(token);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  scheduleReconnect(token) {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect(token);
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
    }, this.reconnectDelay);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}

export const wsService = new WebSocketService();
export default wsService;
