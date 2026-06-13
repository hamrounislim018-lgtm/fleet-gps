require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
const logger = require('../utils/logger');

async function migrate() {
  const client = await pool.connect();
  try {
    logger.info('Running database migrations...');
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schemaSQL);
    logger.info('Database migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
