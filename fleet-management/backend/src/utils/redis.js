const { createClient } = require('redis');
const logger = require('./logger');

let redisClient = null;

const getRedisClient = async () => {
  if (redisClient && redisClient.isOpen) return redisClient;

  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      reconnectStrategy: (retries) => {
        if (retries > 5) return false; // Stop retrying after 5 attempts
        return Math.min(retries * 100, 3000);
      }
    },
    password: process.env.REDIS_PASSWORD || undefined
  });

  redisClient.on('error', (err) => logger.warn('Redis unavailable (cache disabled):', err.message));
  redisClient.on('connect', () => logger.info('Redis connected'));
  redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  try {
    await redisClient.connect();
  } catch (err) {
    logger.warn('Redis not available - running without cache');
    redisClient = null;
    return null;
  }
  return redisClient;
};

// Cache helpers
const cache = {
  async get(key) {
    try {
      const client = await getRedisClient();
      if (!client) return null;
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.warn('Redis GET error:', err.message);
      return null;
    }
  },

  async set(key, value, ttlSeconds = 300) {
    try {
      const client = await getRedisClient();
      if (!client) return;
      await client.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      logger.warn('Redis SET error:', err.message);
    }
  },

  async del(key) {
    try {
      const client = await getRedisClient();
      if (!client) return;
      await client.del(key);
    } catch (err) {
      logger.warn('Redis DEL error:', err.message);
    }
  },

  async publish(channel, message) {
    try {
      const client = await getRedisClient();
      if (!client) return;
      await client.publish(channel, JSON.stringify(message));
    } catch (err) {
      logger.warn('Redis PUBLISH error:', err.message);
    }
  },

  async setVehiclePosition(vehicleId, positionData) {
    await this.set(`vehicle:position:${vehicleId}`, positionData, 3600);
    await this.publish('vehicle:position:update', { vehicleId, ...positionData });
  },

  async getVehiclePosition(vehicleId) {
    return await this.get(`vehicle:position:${vehicleId}`);
  }
};

module.exports = { getRedisClient, cache };
