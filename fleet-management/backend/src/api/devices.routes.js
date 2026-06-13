const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT gd.*, v.name as vehicle_name, v.plate_number
      FROM gps_devices gd
      LEFT JOIN vehicles v ON gd.vehicle_id = v.id
      WHERE v.company_id = $1 OR gd.vehicle_id IS NULL
      ORDER BY gd.created_at DESC
    `, [req.companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authorize('super_admin', 'admin'), validate(schemas.createDevice), async (req, res) => {
  try {
    const { imei, vehicle_id, device_type, model, sim_number } = req.body;
    const id = uuidv4();

    const result = await query(`
      INSERT INTO gps_devices (id, imei, vehicle_id, device_type, model, sim_number)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, imei, vehicle_id, device_type, model, sim_number]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'IMEI already registered' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { vehicle_id, device_type, model, sim_number, is_active } = req.body;
    const result = await query(`
      UPDATE gps_devices SET
        vehicle_id = COALESCE($1, vehicle_id),
        device_type = COALESCE($2, device_type),
        model = COALESCE($3, model),
        sim_number = COALESCE($4, sim_number),
        is_active = COALESCE($5, is_active)
      WHERE id = $6
      RETURNING *
    `, [vehicle_id, device_type, model, sim_number, is_active, req.params.id]);

    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Device not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authorize('super_admin'), async (req, res) => {
  try {
    await query('DELETE FROM gps_devices WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
