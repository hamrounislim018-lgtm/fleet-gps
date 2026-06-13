const express = require('express');
const { query } = require('../database/db');
const { authenticate } = require('../middleware/auth');
const { cache } = require('../utils/redis');

const router = express.Router();
router.use(authenticate);

/**
 * GET /api/tracking/live
 * Get real-time positions of all company vehicles
 */
router.get('/live', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        v.id, v.name, v.plate_number, v.make, v.model, v.color, v.max_speed,
        d.full_name as driver_name,
        vg.name as group_name, vg.color as group_color,
        vlp.latitude, vlp.longitude, vlp.speed, vlp.heading,
        vlp.engine_status, vlp.ignition, vlp.fuel_level,
        vlp.odometer, vlp.status, vlp.address, vlp.last_update
      FROM vehicles v
      LEFT JOIN vehicle_latest_position vlp ON v.id = vlp.vehicle_id
      LEFT JOIN drivers d ON v.driver_id = d.id
      LEFT JOIN vehicle_groups vg ON v.group_id = vg.id
      WHERE v.company_id = $1 AND v.is_active = true
      ORDER BY v.name
    `, [req.companyId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/tracking/vehicle/:id/live
 * Get single vehicle live position
 */
router.get('/vehicle/:id/live', async (req, res) => {
  try {
    // Try Redis cache first for lowest latency
    const cached = await cache.getVehiclePosition(req.params.id);
    if (cached) {
      return res.json({ success: true, data: cached, source: 'cache' });
    }

    const result = await query(`
      SELECT vlp.*, v.name, v.plate_number, v.max_speed
      FROM vehicle_latest_position vlp
      JOIN vehicles v ON vlp.vehicle_id = v.id
      WHERE vlp.vehicle_id = $1 AND v.company_id = $2
    `, [req.params.id, req.companyId]);

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    res.json({ success: true, data: result.rows[0], source: 'db' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/tracking/stats
 * Dashboard statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const cacheKey = `company:${req.companyId}:stats`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const [vehicleStats, alertStats, tripStats] = await Promise.all([
      query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN vlp.status = 'moving' THEN 1 END) as moving,
          COUNT(CASE WHEN vlp.status = 'stopped' THEN 1 END) as stopped,
          COUNT(CASE WHEN vlp.status = 'idle' THEN 1 END) as idle,
          COUNT(CASE WHEN vlp.status = 'offline' OR vlp.status IS NULL THEN 1 END) as offline
        FROM vehicles v
        LEFT JOIN vehicle_latest_position vlp ON v.id = vlp.vehicle_id
        WHERE v.company_id = $1 AND v.is_active = true
      `, [req.companyId]),

      query(`
        SELECT COUNT(*) as unread_alerts
        FROM alerts
        WHERE company_id = $1 AND is_read = false
        AND created_at > NOW() - INTERVAL '24 hours'
      `, [req.companyId]),

      query(`
        SELECT 
          COUNT(*) as trips_today,
          COALESCE(SUM(t.distance), 0) as distance_today
        FROM trips t
        JOIN vehicles v ON t.vehicle_id = v.id
        WHERE v.company_id = $1 
        AND t.start_time >= CURRENT_DATE
      `, [req.companyId])
    ]);

    const stats = {
      vehicles: vehicleStats.rows[0],
      alerts: alertStats.rows[0],
      trips: tripStats.rows[0]
    };

    await cache.set(cacheKey, stats, 30); // Cache for 30 seconds
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
