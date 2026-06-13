const { query } = require('../database/db');
const { cache } = require('../utils/redis');
const { checkAlerts } = require('../services/alert.service');
const { checkGeofences } = require('../services/geofence.service');
const { updateTrip } = require('../services/trip.service');
const logger = require('../utils/logger');

/**
 * Main GPS data processor
 * Called by TCP, MQTT, and HTTP handlers
 */
const processGPSData = async (imei, positions) => {
  try {
    // Get device and vehicle info
    const deviceResult = await query(`
      SELECT gd.id as device_id, gd.vehicle_id, v.company_id, v.max_speed, v.id as vid
      FROM gps_devices gd
      LEFT JOIN vehicles v ON gd.vehicle_id = v.id
      WHERE gd.imei = $1 AND gd.is_active = true
    `, [imei]);

    if (!deviceResult.rows[0]) {
      logger.warn(`Unknown device IMEI: ${imei}`);
      return;
    }

    const device = deviceResult.rows[0];
    if (!device.vehicle_id) {
      logger.warn(`Device ${imei} not assigned to any vehicle`);
      return;
    }

    // Update device last seen
    await query('UPDATE gps_devices SET last_seen = NOW() WHERE id = $1', [device.device_id]);

    // Process each position
    for (const pos of positions) {
      if (!isValidPosition(pos)) continue;

      // Insert into positions table
      await query(`
        INSERT INTO gps_positions 
          (device_id, vehicle_id, latitude, longitude, altitude, speed, heading, 
           accuracy, satellites, fuel_level, engine_status, ignition, odometer,
           battery_voltage, raw_data, device_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `, [
        device.device_id, device.vehicle_id,
        pos.latitude, pos.longitude, pos.altitude || 0,
        pos.speed || 0, pos.heading || 0,
        pos.accuracy || null, pos.satellites || 0,
        pos.fuelLevel || null, pos.engineStatus || false,
        pos.ignition || false, pos.odometer || null,
        pos.batteryVoltage || null,
        pos.rawData ? JSON.stringify(pos.rawData) : null,
        pos.deviceTime || new Date()
      ]);

      // Determine vehicle status
      const status = determineStatus(pos);

      // Update latest position (upsert)
      await query(`
        INSERT INTO vehicle_latest_position 
          (vehicle_id, device_id, latitude, longitude, speed, heading, 
           fuel_level, engine_status, ignition, odometer, status, last_update)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (vehicle_id) DO UPDATE SET
          device_id = $2, latitude = $3, longitude = $4,
          speed = $5, heading = $6, fuel_level = $7,
          engine_status = $8, ignition = $9, odometer = $10,
          status = $11, last_update = NOW()
      `, [
        device.vehicle_id, device.device_id,
        pos.latitude, pos.longitude, pos.speed || 0,
        pos.heading || 0, pos.fuelLevel || null,
        pos.engineStatus || false, pos.ignition || false,
        pos.odometer || null, status
      ]);

      // Cache latest position in Redis for real-time access
      await cache.setVehiclePosition(device.vehicle_id, {
        vehicleId: device.vehicle_id,
        latitude: pos.latitude,
        longitude: pos.longitude,
        speed: pos.speed || 0,
        heading: pos.heading || 0,
        status,
        engineStatus: pos.engineStatus || false,
        fuelLevel: pos.fuelLevel,
        lastUpdate: new Date().toISOString()
      });

      // Run alert checks and geofence checks in parallel
      await Promise.all([
        checkAlerts(device, pos, device.max_speed),
        checkGeofences(device, pos)
      ]);

      // Update trip tracking
      await updateTrip(device.vehicle_id, pos, status);
    }
  } catch (error) {
    logger.error(`GPS processing error for IMEI ${imei}:`, error.message);
  }
};

/**
 * Determine vehicle status from position data
 */
function determineStatus(pos) {
  if (!pos.engineStatus && !pos.ignition) return 'offline';
  if (pos.speed > 3) return 'moving';
  if (pos.engineStatus || pos.ignition) return 'idle';
  return 'stopped';
}

/**
 * Validate GPS position data
 */
function isValidPosition(pos) {
  if (!pos.latitude || !pos.longitude) return false;
  if (pos.latitude < -90 || pos.latitude > 90) return false;
  if (pos.longitude < -180 || pos.longitude > 180) return false;
  if (pos.speed < 0 || pos.speed > 500) return false; // Unrealistic speed
  return true;
}

module.exports = { processGPSData };
