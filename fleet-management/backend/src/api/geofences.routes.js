const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

/**
 * GET /api/geofences
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT g.*,
        COUNT(DISTINCT gv.vehicle_id) as vehicle_count
      FROM geofences g
      LEFT JOIN geofence_vehicles gv ON g.id = gv.geofence_id
      WHERE g.company_id = $1
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `, [req.companyId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/geofences/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const [geofence, vehicles] = await Promise.all([
      query('SELECT * FROM geofences WHERE id = $1 AND company_id = $2', [req.params.id, req.companyId]),
      query(`
        SELECT v.id, v.name, v.plate_number
        FROM geofence_vehicles gv
        JOIN vehicles v ON gv.vehicle_id = v.id
        WHERE gv.geofence_id = $1
      `, [req.params.id])
    ]);

    if (!geofence.rows[0]) {
      return res.status(404).json({ success: false, message: 'Geofence not found' });
    }

    res.json({ success: true, data: { ...geofence.rows[0], vehicles: vehicles.rows } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/geofences
 */
router.post('/', authorize('super_admin', 'admin'), validate(schemas.createGeofence), async (req, res) => {
  try {
    const { name, name_ar, type, coordinates, center_lat, center_lng, radius, color, alert_on_enter, alert_on_exit, vehicle_ids } = req.body;
    const id = uuidv4();

    const result = await query(`
      INSERT INTO geofences (id, company_id, name, name_ar, type, coordinates, center_lat, center_lng, radius, color, alert_on_enter, alert_on_exit, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [id, req.companyId, name, name_ar, type, JSON.stringify(coordinates), center_lat, center_lng, radius, color, alert_on_enter, alert_on_exit, req.user.id]);

    // Link vehicles
    if (vehicle_ids && vehicle_ids.length > 0) {
      for (const vehicleId of vehicle_ids) {
        await query(
          'INSERT INTO geofence_vehicles (geofence_id, vehicle_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, vehicleId]
        );
      }
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/geofences/:id
 */
router.put('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, name_ar, coordinates, color, alert_on_enter, alert_on_exit, is_active, vehicle_ids } = req.body;

    const result = await query(`
      UPDATE geofences SET
        name = COALESCE($1, name),
        name_ar = COALESCE($2, name_ar),
        coordinates = COALESCE($3, coordinates),
        color = COALESCE($4, color),
        alert_on_enter = COALESCE($5, alert_on_enter),
        alert_on_exit = COALESCE($6, alert_on_exit),
        is_active = COALESCE($7, is_active)
      WHERE id = $8 AND company_id = $9
      RETURNING *
    `, [name, name_ar, coordinates ? JSON.stringify(coordinates) : null, color, alert_on_enter, alert_on_exit, is_active, req.params.id, req.companyId]);

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Geofence not found' });
    }

    // Update vehicle links
    if (vehicle_ids !== undefined) {
      await query('DELETE FROM geofence_vehicles WHERE geofence_id = $1', [req.params.id]);
      for (const vehicleId of vehicle_ids) {
        await query(
          'INSERT INTO geofence_vehicles (geofence_id, vehicle_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [req.params.id, vehicleId]
        );
      }
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/geofences/:id
 */
router.delete('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    await query('DELETE FROM geofences WHERE id = $1 AND company_id = $2', [req.params.id, req.companyId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
