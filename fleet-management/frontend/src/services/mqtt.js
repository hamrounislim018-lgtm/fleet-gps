/**
 * MQTT service for real-time GPS tracking
 */
import mqtt from 'mqtt';

class MQTTService {
  constructor() {
    this.client = null;
    this.listeners = new Map();
    this.reconnectTimer = null;
    this.reconnectDelay = 3000;
    this.maxReconnectDelay = 30000;
    this.options = {
      clientId: 'fleet-client-' + Math.random().toString(16).substr(2, 8),
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 3000,
    };
  }

  connect(brokerUrl, options = {}) {
    if (this.client?.connected) return;

    const mergedOptions = { ...this.options, ...options };
    
    this.client = mqtt.connect(brokerUrl, mergedOptions);

    this.client.on('connect', () => {
      console.log('MQTT connected');
      this.reconnectDelay = 3000;
      this.emit('connected', {});
      
      // Subscribe to vehicle position updates
      this.client.subscribe('vehicles/+/position', (err) => {
        if (!err) {
          console.log('Subscribed to vehicle positions');
        }
      });
    });

    this.client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Parse topic to determine message type
        if (topic.includes('position')) {
          this.emit('position_update', {
            vehicleId: data.vehicle_id,
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed,
            status: data.status
          });
        }
      } catch (error) {
        console.error('MQTT message parse error:', error);
      }
    });

    this.client.on('error', (err) => {
      console.error('MQTT error:', err);
      this.client?.end();
    });

    this.client.on('close', () => {
      console.log('MQTT disconnected');
      this.emit('disconnected', {});
    });

    this.client.on('reconnect', () => {
      console.log('MQTT reconnecting...');
    });
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
    this.client?.end();
    this.client = null;
  }

  publish(topic, message) {
    if (this.client?.connected) {
      this.client.publish(topic, JSON.stringify(message));
    }
  }
}

export const mqttService = new MQTTService();
export default mqttService;
