require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');
const logger = require('../utils/logger');

async function migrateV2() {
  const client = await pool.connect();
  try {
    logger.info('Running v2 migrations...');
    const sql = fs.readFileSync(path.join(__dirname, 'schema_v2.sql'), 'utf8');
    await client.query(sql);
    logger.info('V2 migration completed successfully');
  } catch (error) {
    logger.error('V2 Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateV2();
