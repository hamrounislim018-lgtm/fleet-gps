const net = require('net');
const mqtt = require('mqtt');
const logger = require('../utils/logger');
const { processGPSData } = require('./gps.processor');
const { parseTeltonika } = require('./parsers/teltonika.parser');
const { parseConcox } = require('./parsers/concox.parser');

// =============================================
// TCP Server - for direct device connections
// =============================================
const startTCPServer = () => {
  const server = net.createServer((socket) => {
    const clientIP = socket.remoteAddress;
    logger.info(`GPS device connected from ${clientIP}`);

    let deviceImei = null;
    let buffer = Buffer.alloc(0);

    socket.on('data', async (data) => {
      try {
        // Accumulate data in buffer (TCP can split packets)
        buffer = Buffer.concat([buffer, data]);

        // Try to detect device type and parse
        const parsed = await detectAndParse(buffer, deviceImei);

        if (parsed) {
          if (parsed.type === 'login') {
            deviceImei = parsed.imei;
            logger.info(`Device logged in: IMEI ${deviceImei}`);
            // Send ACK
            socket.write(Buffer.from([0x01]));
          } else if (parsed.type === 'data' && deviceImei) {
            await processGPSData(deviceImei, parsed.positions);
            // Send ACK with count
            const ack = Buffer.alloc(4);
            ack.writeUInt32BE(parsed.positions.length, 0);
            socket.write(ack);
          }
          buffer = Buffer.alloc(0); // Clear buffer after successful parse
        }
      } catch (error) {
        logger.error(`TCP parse error from ${clientIP}:`, error.message);
        buffer = Buffer.alloc(0);
      }
    });

    socket.on('error', (err) => {
      logger.warn(`Socket error from ${clientIP}: ${err.message}`);
    });

    socket.on('close', () => {
      logger.info(`Device disconnected: ${deviceImei || clientIP}`);
    });

    // Timeout inactive connections
    socket.setTimeout(300000); // 5 minutes
    socket.on('timeout', () => socket.destroy());
  });

  const TCP_PORT = parseInt(process.env.TCP_PORT) || 5000;
  server.listen(TCP_PORT, () => {
    logger.info(`GPS TCP Server listening on port ${TCP_PORT}`);
  });

  server.on('error', (err) => {
    logger.error('TCP Server error:', err.message);
  });

  return server;
};

// =============================================
// MQTT Server - for MQTT-capable devices
// =============================================
const startMQTTClient = () => {
  // Skip MQTT if not configured
  const brokerUrl = process.env.MQTT_BROKER_URL;
  if (!brokerUrl || brokerUrl === 'mqtt://localhost:1883') {
    logger.info('MQTT broker not configured - skipping (set MQTT_BROKER_URL in .env to enable)');
    return null;
  }

  const client = mqtt.connect(brokerUrl, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clientId: `fleet-server-${Date.now()}`,
    reconnectPeriod: 5000,
    keepalive: 60
  });

  client.on('connect', () => {
    logger.info('MQTT broker connected');
    // Subscribe to all device topics
    client.subscribe('devices/+/data', { qos: 1 });
    client.subscribe('devices/+/login', { qos: 1 });
    client.subscribe('gps/+/position', { qos: 1 });
  });

  client.on('message', async (topic, payload) => {
    try {
      const parts = topic.split('/');
      const imei = parts[1];

      let data;
      try {
        data = JSON.parse(payload.toString());
      } catch {
        data = { raw: payload.toString() };
      }

      if (topic.includes('/data') || topic.includes('/position')) {
        // Normalize MQTT data to standard format
        const positions = normalizeMQTTData(data);
        if (positions.length > 0) {
          await processGPSData(imei, positions);
        }
      }
    } catch (error) {
      logger.error('MQTT message processing error:', error.message);
    }
  });

  client.on('error', (err) => logger.error('MQTT error:', err.message));
  client.on('reconnect', () => logger.warn('MQTT reconnecting...'));

  return client;
};

// =============================================
// HTTP endpoint for devices that use HTTP
// =============================================
const createHTTPHandler = () => {
  return async (req, res) => {
    try {
      const { imei, lat, lng, speed, heading, timestamp, fuel, engine, satellites } = req.body;

      if (!imei || !lat || !lng) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const positions = [{
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        speed: parseFloat(speed) || 0,
        heading: parseFloat(heading) || 0,
        deviceTime: timestamp ? new Date(timestamp) : new Date(),
        fuelLevel: fuel ? parseFloat(fuel) : null,
        engineStatus: engine === '1' || engine === true,
        satellites: parseInt(satellites) || 0
      }];

      await processGPSData(imei, positions);
      res.json({ success: true });
    } catch (error) {
      logger.error('HTTP GPS handler error:', error.message);
      res.status(500).json({ error: 'Processing failed' });
    }
  };
};

// =============================================
// Helpers
// =============================================

/**
 * Detect device type from raw buffer and parse accordingly
 */
async function detectAndParse(buffer, knownImei) {
  if (buffer.length < 2) return null;

  // Teltonika: starts with 0x0000 (preamble) or IMEI login (15 digits)
  if (buffer.length >= 17 && buffer[0] === 0x00 && buffer[1] === 0x0F) {
    return parseTeltonika(buffer);
  }

  // Concox: starts with 0x78 0x78 or 0x79 0x79
  if (buffer[0] === 0x78 && buffer[1] === 0x78) {
    return parseConcox(buffer);
  }

  // Generic JSON format
  try {
    const str = buffer.toString('utf8').trim();
    if (str.startsWith('{')) {
      const data = JSON.parse(str);
      return {
        type: 'data',
        positions: [normalizeMQTTData(data)[0]].filter(Boolean)
      };
    }
  } catch {}

  return null;
}

/**
 * Normalize MQTT/HTTP JSON data to standard position format
 */
function normalizeMQTTData(data) {
  // Support multiple JSON formats from different devices
  const lat = data.lat || data.latitude || data.Lat || data.LAT;
  const lng = data.lng || data.lon || data.longitude || data.Lng || data.LON;

  if (!lat || !lng) return [];

  return [{
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
    speed: parseFloat(data.speed || data.Speed || data.spd || 0),
    heading: parseFloat(data.heading || data.course || data.dir || 0),
    altitude: parseFloat(data.altitude || data.alt || 0),
    satellites: parseInt(data.satellites || data.sat || 0),
    fuelLevel: data.fuel ? parseFloat(data.fuel) : null,
    engineStatus: data.engine === 1 || data.engine === true || data.ign === 1,
    ignition: data.ignition === 1 || data.ign === 1,
    odometer: data.odometer ? parseFloat(data.odometer) : null,
    batteryVoltage: data.battery ? parseFloat(data.battery) : null,
    deviceTime: data.timestamp ? new Date(data.timestamp * 1000) : new Date()
  }];
}

module.exports = { startTCPServer, startMQTTClient, createHTTPHandler };
