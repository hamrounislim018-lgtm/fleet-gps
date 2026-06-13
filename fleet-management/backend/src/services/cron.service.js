const cron = require('node-cron');
const { query } = require('../database/db');
const { createAlert } = require('./alert.service');
const logger = require('../utils/logger');

/**
 * Initialize all scheduled jobs
 */
const initCronJobs = () => {
  // Check for disconnected devices every 5 minutes
  cron.schedule('*/5 * * * *', checkDisconnectedDevices);

  // Clean old positions (keep 90 days) - runs daily at 3 AM
  cron.schedule('0 3 * * *', cleanOldData);

  // Generate daily trip summaries at midnight
  cron.schedule('0 0 * * *', generateDailySummaries);

  // Check license expiry weekly
  cron.schedule('0 9 * * 1', checkLicenseExpiry);

  logger.info('Cron jobs initialized');
};

/**
 * Alert when device hasn't sent data for > 10 minutes
 */
const checkDisconnectedDevices = async () => {
  try {
    const result = await query(`
      SELECT v.id as vehicle_id, v.company_id, v.name, vlp.last_update
      FROM vehicles v
      JOIN vehicle_latest_position vlp ON v.id = vlp.vehicle_id
      WHERE v.is_active = true
      AND vlp.status != 'offline'
      AND vlp.last_update < NOW() - INTERVAL '10 minutes'
    `);

    for (const vehicle of result.rows) {
      await createAlert({
        companyId: vehicle.company_id,
        vehicleId: vehicle.vehicle_id,
        alertType: 'disconnect',
        severity: 'warning',
        title: 'Device Disconnected',
        titleAr: 'انقطاع الاتصال بالجهاز',
        message: `No data received from ${vehicle.name} for more than 10 minutes`,
        latitude: null,
        longitude: null,
        speed: 0
      });

      // Update status to offline
      await query(
        "UPDATE vehicle_latest_position SET status = 'offline' WHERE vehicle_id = $1",
        [vehicle.vehicle_id]
      );
    }

    if (result.rows.length > 0) {
      logger.info(`Marked ${result.rows.length} vehicles as offline`);
    }
  } catch (error) {
    logger.error('Disconnect check error:', error.message);
  }
};

/**
 * Remove GPS positions older than 90 days to save storage
 */
const cleanOldData = async () => {
  try {
    const result = await query(`
      DELETE FROM gps_positions
      WHERE created_at < NOW() - INTERVAL '90 days'
    `);
    logger.info(`Cleaned ${result.rowCount} old GPS positions`);
  } catch (error) {
    logger.error('Data cleanup error:', error.message);
  }
};

/**
 * Generate daily trip summaries
 */
const generateDailySummaries = async () => {
  try {
    // Close any trips that are still open from yesterday
    await query(`
      UPDATE trips SET
        end_time = last_update_time,
        is_complete = true
      FROM (
        SELECT t.id, vlp.last_update as last_update_time
        FROM trips t
        JOIN vehicle_latest_position vlp ON t.vehicle_id = vlp.vehicle_id
        WHERE t.is_complete = false
        AND t.start_time < CURRENT_DATE
      ) sub
      WHERE trips.id = sub.id
    `);
    logger.info('Daily trip summaries generated');
  } catch (error) {
    logger.error('Daily summary error:', error.message);
  }
};

/**
 * Alert when driver license is expiring within 30 days
 */
const checkLicenseExpiry = async () => {
  try {
    const result = await query(`
      SELECT d.*, c.id as company_id
      FROM drivers d
      JOIN companies c ON d.company_id = c.id
      WHERE d.license_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      AND d.is_active = true
    `);

    for (const driver of result.rows) {
      const daysLeft = Math.ceil((new Date(driver.license_expiry) - new Date()) / (1000 * 60 * 60 * 24));
      logger.info(`Driver ${driver.full_name} license expires in ${daysLeft} days`);
      // Could create an alert or send email here
    }
  } catch (error) {
    logger.error('License expiry check error:', error.message);
  }
};

module.exports = { initCronJobs };
