require('dotenv').config();
const { Pool } = require('pg');
const logger = require('../utils/logger');

// PostgreSQL connection pool - created after dotenv is loaded
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'fleet_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', err);
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    logger.error('Error connecting to PostgreSQL:', err.message);
  } else {
    logger.info('PostgreSQL connected successfully');
    release();
  }
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      logger.warn(`Slow query (${duration}ms): ${text.substring(0, 100)}`);
    }
    return result;
  } catch (error) {
    logger.error('Database query error:', { text: text.substring(0, 100), error: error.message });
    throw error;
  }
};

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
