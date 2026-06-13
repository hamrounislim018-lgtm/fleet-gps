const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/db');
const { cache } = require('../utils/redis');
const { sendEmail } = require('./notification.service');
const logger = require('../utils/logger');

/**
 * Check and trigger alerts based on GPS position
 */
const checkAlerts = async (device, position, vehicleMaxSpeed) => {
  try {
    // Get active alert configs for this vehicle
    const configs = await query(`
      SELECT * FROM alert_configs
      WHERE (vehicle_id = $1 OR vehicle_id IS NULL)
      AND company_id = $2
      AND is_active = true
    `, [device.vehicle_id, device.company_id]);

    for (const config of configs.rows) {
      await evaluateAlert(config, device, position, vehicleMaxSpeed);
    }

    // Always check disconnect (if last update was > 10 min ago, handled by cron)
  } catch (error) {
    logger.error('Alert check error:', error.message);
  }
};

const evaluateAlert = async (config, device, position, vehicleMaxSpeed) => {
  const alertType = config.alert_type;
  let shouldAlert = false;
  let title = '';
  let titleAr = '';
  let message = '';
  let severity = 'warning';

  switch (alertType) {
    case 'speed':
      const speedLimit = config.threshold_value || vehicleMaxSpeed || 120;
      if (position.speed > speedLimit) {
        // Debounce: don't alert if we already alerted in last 5 minutes
        const debounceKey = `alert:speed:${device.vehicle_id}`;
        const recentAlert = await cache.get(debounceKey);
        if (!recentAlert) {
          shouldAlert = true;
          title = `Speed Alert`;
          titleAr = `تنبيه السرعة`;
          message = `Vehicle exceeded speed limit: ${Math.round(position.speed)} km/h (limit: ${speedLimit} km/h)`;
          severity = position.speed > speedLimit * 1.3 ? 'critical' : 'warning';
          await cache.set(debounceKey, true, 300); // 5 min debounce
        }
      }
      break;

    case 'engine_on':
      if (position.engineStatus || position.ignition) {
        const key = `alert:engine_on:${device.vehicle_id}`;
        const recent = await cache.get(key);
        if (!recent) {
          shouldAlert = true;
          title = 'Engine Started';
          titleAr = 'تشغيل المحرك';
          message = 'Vehicle engine has been started';
          severity = 'info';
          await cache.set(key, true, 600);
        }
      }
      break;

    case 'engine_off':
      if (!position.engineStatus && !position.ignition) {
        const key = `alert:engine_off:${device.vehicle_id}`;
        const recent = await cache.get(key);
        if (!recent) {
          shouldAlert = true;
          title = 'Engine Stopped';
          titleAr = 'إيقاف المحرك';
          message = 'Vehicle engine has been stopped';
          severity = 'info';
          await cache.set(key, true, 600);
        }
      }
      break;

    case 'low_fuel':
      if (position.fuelLevel !== null && position.fuelLevel < (config.threshold_value || 20)) {
        const key = `alert:fuel:${device.vehicle_id}`;
        const recent = await cache.get(key);
        if (!recent) {
          shouldAlert = true;
          title = 'Low Fuel Warning';
          titleAr = 'تحذير انخفاض الوقود';
          message = `Fuel level is low: ${Math.round(position.fuelLevel)}%`;
          severity = 'warning';
          await cache.set(key, true, 3600); // 1 hour debounce
        }
      }
      break;
  }

  if (shouldAlert) {
    await createAlert({
      companyId: device.company_id,
      vehicleId: device.vehicle_id,
      alertType,
      severity,
      title,
      titleAr,
      message,
      latitude: position.latitude,
      longitude: position.longitude,
      speed: position.speed,
      config
    });
  }
};

const createAlert = async ({ companyId, vehicleId, alertType, severity, title, titleAr, message, latitude, longitude, speed, geofenceId, config }) => {
  try {
    const id = uuidv4();
    await query(`
      INSERT INTO alerts (id, company_id, vehicle_id, alert_type, severity, title, title_ar, message, latitude, longitude, speed, geofence_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [id, companyId, vehicleId, alertType, severity, title, titleAr, message, latitude, longitude, speed, geofenceId || null]);

    // Publish to Redis for real-time WebSocket push
    await cache.publish('alerts:new', { id, companyId, vehicleId, alertType, severity, title, message });

    // Send email notification if configured
    if (config && config.notify_email && config.recipients) {
      const recipients = typeof config.recipients === 'string'
        ? JSON.parse(config.recipients)
        : config.recipients;

      if (recipients.emails && recipients.emails.length > 0) {
        await sendEmail({
          to: recipients.emails,
          subject: `Fleet Alert: ${title}`,
          html: `<h3>${title}</h3><p>${message}</p><p>Location: ${latitude}, ${longitude}</p>`
        }).catch(err => logger.error('Email notification failed:', err.message));
      }
    }
  } catch (error) {
    logger.error('Create alert error:', error.message);
  }
};

module.exports = { checkAlerts, createAlert };
