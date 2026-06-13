const { query } = require('../database/db');
const { cache } = require('../utils/redis');
const { createAlert } = require('./alert.service');
const logger = require('../utils/logger');

/**
 * Check if vehicle entered or exited any geofences
 */
const checkGeofences = async (device, position) => {
  try {
    // Get all active geofences for this vehicle
    const result = await query(`
      SELECT g.*
      FROM geofences g
      JOIN geofence_vehicles gv ON g.id = gv.geofence_id
      WHERE gv.vehicle_id = $1 AND g.is_active = true AND g.company_id = $2
    `, [device.vehicle_id, device.company_id]);

    for (const geofence of result.rows) {
      const isInside = isPointInGeofence(position.latitude, position.longitude, geofence);
      const stateKey = `geofence:state:${device.vehicle_id}:${geofence.id}`;
      const previousState = await cache.get(stateKey);

      if (previousState === null) {
        // First check - just store state, don't alert
        await cache.set(stateKey, isInside ? 'inside' : 'outside', 86400);
        continue;
      }

      const wasInside = previousState === 'inside';

      if (!wasInside && isInside && geofence.alert_on_enter) {
        // Vehicle entered geofence
        await createAlert({
          companyId: device.company_id,
          vehicleId: device.vehicle_id,
          alertType: 'geofence_enter',
          severity: 'info',
          title: `Entered: ${geofence.name}`,
          titleAr: `دخول: ${geofence.name_ar || geofence.name}`,
          message: `Vehicle entered geofence zone: ${geofence.name}`,
          latitude: position.latitude,
          longitude: position.longitude,
          speed: position.speed,
          geofenceId: geofence.id
        });
      } else if (wasInside && !isInside && geofence.alert_on_exit) {
        // Vehicle exited geofence
        await createAlert({
          companyId: device.company_id,
          vehicleId: device.vehicle_id,
          alertType: 'geofence_exit',
          severity: 'warning',
          title: `Exited: ${geofence.name}`,
          titleAr: `خروج: ${geofence.name_ar || geofence.name}`,
          message: `Vehicle exited geofence zone: ${geofence.name}`,
          latitude: position.latitude,
          longitude: position.longitude,
          speed: position.speed,
          geofenceId: geofence.id
        });
      }

      // Update state
      await cache.set(stateKey, isInside ? 'inside' : 'outside', 86400);
    }
  } catch (error) {
    logger.error('Geofence check error:', error.message);
  }
};

/**
 * Check if a point is inside a geofence
 */
function isPointInGeofence(lat, lng, geofence) {
  const coords = typeof geofence.coordinates === 'string'
    ? JSON.parse(geofence.coordinates)
    : geofence.coordinates;

  if (geofence.type === 'circle') {
    return isPointInCircle(lat, lng, geofence.center_lat, geofence.center_lng, geofence.radius);
  }

  if (geofence.type === 'polygon' || geofence.type === 'rectangle') {
    return isPointInPolygon(lat, lng, coords);
  }

  return false;
}

/**
 * Point in circle check using Haversine distance
 */
function isPointInCircle(lat, lng, centerLat, centerLng, radiusMeters) {
  const distance = haversineDistance(lat, lng, centerLat, centerLng);
  return distance <= radiusMeters;
}

/**
 * Ray casting algorithm for point in polygon
 */
function isPointInPolygon(lat, lng, polygon) {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Haversine distance in meters
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const toRad = (deg) => deg * Math.PI / 180;

module.exports = { checkGeofences, haversineDistance };
