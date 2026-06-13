const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/db');
const { cache } = require('../utils/redis');
const { haversineDistance } = require('./geofence.service');
const logger = require('../utils/logger');

/**
 * Auto-detect and manage trips based on GPS data
 * A trip starts when engine turns ON and ends when engine turns OFF
 */
const updateTrip = async (vehicleId, position, status) => {
  try {
    const tripKey = `trip:active:${vehicleId}`;
    const activeTripData = await cache.get(tripKey);

    if (status === 'moving' || status === 'idle') {
      if (!activeTripData) {
        // Start new trip
        const tripId = uuidv4();
        const tripData = {
          id: tripId,
          vehicleId,
          startTime: new Date().toISOString(),
          startLat: position.latitude,
          startLng: position.longitude,
          lastLat: position.latitude,
          lastLng: position.longitude,
          distance: 0,
          maxSpeed: position.speed || 0,
          speedSum: position.speed || 0,
          speedCount: 1,
          idleTime: 0,
          lastStatus: status,
          lastUpdate: new Date().toISOString()
        };

        await query(`
          INSERT INTO trips (id, vehicle_id, start_time, start_lat, start_lng)
          VALUES ($1, $2, $3, $4, $5)
        `, [tripId, vehicleId, tripData.startTime, position.latitude, position.longitude]);

        await cache.set(tripKey, tripData, 86400);
      } else {
        // Update existing trip
        const timeDiff = (new Date() - new Date(activeTripData.lastUpdate)) / 1000; // seconds

        // Calculate distance from last point
        const segmentDistance = haversineDistance(
          activeTripData.lastLat, activeTripData.lastLng,
          position.latitude, position.longitude
        ) / 1000; // Convert to km

        // Only add distance if it's reasonable (< 1km per update to filter GPS jumps)
        const newDistance = segmentDistance < 1
          ? activeTripData.distance + segmentDistance
          : activeTripData.distance;

        const updatedTrip = {
          ...activeTripData,
          lastLat: position.latitude,
          lastLng: position.longitude,
          distance: newDistance,
          maxSpeed: Math.max(activeTripData.maxSpeed, position.speed || 0),
          speedSum: activeTripData.speedSum + (position.speed || 0),
          speedCount: activeTripData.speedCount + 1,
          idleTime: status === 'idle' ? activeTripData.idleTime + timeDiff : activeTripData.idleTime,
          lastStatus: status,
          lastUpdate: new Date().toISOString()
        };

        await cache.set(tripKey, updatedTrip, 86400);
      }
    } else if (status === 'offline' || status === 'stopped') {
      if (activeTripData) {
        // End the trip
        const duration = Math.round(
          (new Date() - new Date(activeTripData.startTime)) / 1000
        );
        const avgSpeed = activeTripData.speedCount > 0
          ? activeTripData.speedSum / activeTripData.speedCount
          : 0;

        await query(`
          UPDATE trips SET
            end_time = NOW(),
            end_lat = $1, end_lng = $2,
            distance = $3, duration = $4,
            max_speed = $5, avg_speed = $6,
            idle_time = $7, is_complete = true
          WHERE id = $8
        `, [
          position.latitude, position.longitude,
          activeTripData.distance, duration,
          activeTripData.maxSpeed, avgSpeed,
          activeTripData.idleTime, activeTripData.id
        ]);

        await cache.del(tripKey);
      }
    }
  } catch (error) {
    logger.error('Trip update error:', error.message);
  }
};

module.exports = { updateTrip };
