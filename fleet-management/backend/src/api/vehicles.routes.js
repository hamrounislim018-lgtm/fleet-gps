const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { cache } = require('../utils/redis');

const router = express.Router();
router.use(authenticate);

/**
 * GET /api/vehicles
 * List all vehicles for the company
 */
router.get('/', async (req, res) => {
  try {
    const { group_id, status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE v.company_id = $1';
    const params = [req.companyId];
    let paramIndex = 2;

    if (group_id) {
      whereClause += ` AND v.group_id = $${paramIndex++}`;
      params.push(group_id);
    }
    if (search) {
      whereClause += ` AND (v.name ILIKE $${paramIndex} OR v.plate_number ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const result = await query(`
      SELECT 
        v.*,
        d.full_name as driver_name,
        d.phone as driver_phone,
        vg.name as group_name,
        vg.color as group_color,
        vlp.latitude, vlp.longitude, vlp.speed, vlp.heading,
        vlp.engine_status, vlp.fuel_level, vlp.status as gps_status,
        vlp.last_update, vlp.address,
        gd.imei, gd.device_type
      FROM vehicles v
      LEFT JOIN drivers d ON v.driver_id = d.id
      LEFT JOIN vehicle_groups vg ON v.group_id = vg.id
      LEFT JOIN vehicle_latest_position vlp ON v.id = vlp.vehicle_id
      LEFT JOIN gps_devices gd ON vlp.device_id = gd.id
      ${whereClause}
      ORDER BY v.name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const countResult = await query(
      `SELECT COUNT(*) FROM vehicles v ${whereClause}`,
      params.slice(0, paramIndex - 1)
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/vehicles/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT v.*, d.full_name as driver_name, d.phone as driver_phone,
             vg.name as group_name, vlp.*,
             gd.imei, gd.device_type, gd.model as device_model
      FROM vehicles v
      LEFT JOIN drivers d ON v.driver_id = d.id
      LEFT JOIN vehicle_groups vg ON v.group_id = vg.id
      LEFT JOIN vehicle_latest_position vlp ON v.id = vlp.vehicle_id
      LEFT JOIN gps_devices gd ON vlp.device_id = gd.id
      WHERE v.id = $1 AND v.company_id = $2
    `, [req.params.id, req.companyId]);

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/vehicles
 */
router.post('/', authorize('super_admin', 'admin'), validate(schemas.createVehicle), async (req, res) => {
  try {
    const id = uuidv4();
    const { name, plate_number, vin, make, model, year, color, fuel_type, max_speed, group_id, driver_id, notes } = req.body;

    const result = await query(`
      INSERT INTO vehicles (id, company_id, name, plate_number, vin, make, model, year, color, fuel_type, max_speed, group_id, driver_id, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [id, req.companyId, name, plate_number, vin, make, model, year, color, fuel_type, max_speed, group_id, driver_id, notes]);

    // Initialize latest position record
    await query(
      'INSERT INTO vehicle_latest_position (vehicle_id, status) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, 'offline']
    );

    await cache.del(`company:${req.companyId}:vehicles`);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Plate number already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/vehicles/:id
 */
router.put('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, plate_number, vin, make, model, year, color, fuel_type, max_speed, group_id, driver_id, notes, is_active } = req.body;

    const result = await query(`
      UPDATE vehicles SET
        name = COALESCE($1, name),
        plate_number = COALESCE($2, plate_number),
        vin = COALESCE($3, vin),
        make = COALESCE($4, make),
        model = COALESCE($5, model),
        year = COALESCE($6, year),
        color = COALESCE($7, color),
        fuel_type = COALESCE($8, fuel_type),
        max_speed = COALESCE($9, max_speed),
        group_id = $10,
        driver_id = $11,
        notes = COALESCE($12, notes),
        is_active = COALESCE($13, is_active)
      WHERE id = $14 AND company_id = $15
      RETURNING *
    `, [name, plate_number, vin, make, model, year, color, fuel_type, max_speed, group_id, driver_id, notes, is_active, req.params.id, req.companyId]);

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    await cache.del(`company:${req.companyId}:vehicles`);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/vehicles/:id
 */
router.delete('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM vehicles WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, req.companyId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    await cache.del(`company:${req.companyId}:vehicles`);
    res.json({ success: true, message: 'Vehicle deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/vehicles/:id/history
 * Get position history for a vehicle
 */
router.get('/:id/history', async (req, res) => {
  try {
    const { from, to, limit = 1000 } = req.query;

    const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const result = await query(`
      SELECT latitude, longitude, speed, heading, engine_status, fuel_level, 
             odometer, device_time, created_at
      FROM gps_positions
      WHERE vehicle_id = $1 AND created_at BETWEEN $2 AND $3
      ORDER BY created_at ASC
      LIMIT $4
    `, [req.params.id, fromDate, toDate, limit]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/vehicles/:id/trips
 */
router.get('/:id/trips', async (req, res) => {
  try {
    const { from, to, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const result = await query(`
      SELECT t.*, d.full_name as driver_name
      FROM trips t
      LEFT JOIN drivers d ON t.driver_id = d.id
      WHERE t.vehicle_id = $1 AND t.start_time BETWEEN $2 AND $3
      ORDER BY t.start_time DESC
      LIMIT $4 OFFSET $5
    `, [req.params.id, fromDate, toDate, limit, offset]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
