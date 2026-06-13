const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { getRedisClient } = require('../utils/redis');
const logger = require('../utils/logger');

let wss = null;

// Map: companyId -> Set of WebSocket clients
const companyClients = new Map();

/**
 * Initialize WebSocket server and Redis pub/sub
 */
const initWebSocket = async (server) => {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Authenticate via token in query string
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Authentication required');
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      ws.close(4001, 'Invalid token');
      return;
    }

    const { companyId } = decoded;
    ws.companyId = companyId;
    ws.isAlive = true;

    // Add to company clients
    if (!companyClients.has(companyId)) {
      companyClients.set(companyId, new Set());
    }
    companyClients.get(companyId).add(ws);

    logger.info(`WebSocket client connected for company ${companyId}`);

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('close', () => {
      const clients = companyClients.get(companyId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) companyClients.delete(companyId);
      }
    });

    ws.on('error', (err) => logger.error('WebSocket error:', err.message));

    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: 'connected', message: 'Real-time tracking active' }));
  });

  // Heartbeat to detect dead connections
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));

  // Subscribe to Redis channels for real-time events
  await subscribeToRedisEvents();

  logger.info('WebSocket server initialized');
};

/**
 * Subscribe to Redis pub/sub for GPS updates and alerts
 */
const subscribeToRedisEvents = async () => {
  try {
    const client = await getRedisClient();
    if (!client) {
      logger.warn('Redis not available - WebSocket will work without real-time pub/sub');
      return;
    }
    const sub = client.duplicate();
    await sub.connect();

    await sub.subscribe('vehicle:position:update', (message) => {
      try {
        const data = JSON.parse(message);
        broadcastToCompany(data.companyId, { type: 'position_update', data });
      } catch {}
    });

    await sub.subscribe('alerts:new', (message) => {
      try {
        const data = JSON.parse(message);
        broadcastToCompany(data.companyId, { type: 'new_alert', data });
      } catch {}
    });

    logger.info('Redis pub/sub subscriptions active');
  } catch (error) {
    logger.warn('Redis subscription not available:', error.message);
  }
};

/**
 * Broadcast message to all WebSocket clients of a company
 */
const broadcastToCompany = (companyId, message) => {
  const clients = companyClients.get(companyId);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify(message);
  clients.forEach((ws) => {
    if (ws.readyState === 1) { // OPEN
      ws.send(payload);
    }
  });
};

/**
 * Broadcast to all connected clients (for super admin)
 */
const broadcastAll = (message) => {
  if (!wss) return;
  const payload = JSON.stringify(message);
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) ws.send(payload);
  });
};

module.exports = { initWebSocket, broadcastToCompany, broadcastAll };
