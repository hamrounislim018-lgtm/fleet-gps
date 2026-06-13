const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/sensors', async (req, res) => {
  try {
    const result = await query(`
      SELECT ts.*, v.name as vehicle_name, v.plate_number,
             (SELECT temperature FROM temperature_readings tr WHERE tr.sensor_id = ts.id ORDER BY created_at DESC LIMIT 1) as last_temp,
             (SELECT created_at FROM temperature_readings tr WHERE tr.sensor_id = ts.id ORDER BY created_at DESC LIMIT 1) as last_reading
      FROM temperature_sensors ts
      JOIN vehicles v ON ts.vehicle_id = v.id
      WHERE v.company_id = $1
      ORDER BY v.name
    `, [req.companyId]);
    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/sensors', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { vehicle_id, sensor_name, sensor_name_ar, min_temp, max_temp } = req.body;
    const id = uuidv4();
    const result = await query(
      'INSERT INTO temperature_sensors (id, vehicle_id, sensor_name, sensor_name_ar, min_temp, max_temp) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [id, vehicle_id, sensor_name, sensor_name_ar, min_temp ?? -20, max_temp ?? 8]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/readings/:sensorId', async (req, res) => {
  try {
    const { from, to, limit = 500 } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 3600000);
    const toDate = to ? new Date(to) : new Date();

    const result = await query(`
      SELECT temperature, humidity, is_alert, created_at
      FROM temperature_readings
      WHERE sensor_id = $1 AND created_at BETWEEN $2 AND $3
      ORDER BY created_at ASC
      LIMIT $4
    `, [req.params.sensorId, fromDate, toDate, limit]);

    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Receive temperature data (called by GPS processor or HTTP)
router.post('/readings', async (req, res) => {
  try {
    const { sensor_id, vehicle_id, temperature, humidity } = req.body;

    // Get sensor config
    const sensor = await query('SELECT * FROM temperature_sensors WHERE id = $1', [sensor_id]);
    if (!sensor.rows[0]) return res.status(404).json({ success: false, message: 'Sensor not found' });

    const s = sensor.rows[0];
    const isAlert = temperature < s.min_temp || temperature > s.max_temp;

    await query(
      'INSERT INTO temperature_readings (sensor_id, vehicle_id, temperature, humidity, is_alert) VALUES ($1,$2,$3,$4,$5)',
      [sensor_id, vehicle_id, temperature, humidity, isAlert]
    );

    res.json({ success: true, alert: isAlert });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/alerts', async (req, res) => {
  try {
    const result = await query(`
      SELECT tr.temperature, tr.created_at, ts.sensor_name, ts.min_temp, ts.max_temp,
             v.name as vehicle_name, v.plate_number
      FROM temperature_readings tr
      JOIN temperature_sensors ts ON tr.sensor_id = ts.id
      JOIN vehicles v ON tr.vehicle_id = v.id
      WHERE v.company_id = $1 AND tr.is_alert = true
      AND tr.created_at > NOW() - INTERVAL '24 hours'
      ORDER BY tr.created_at DESC
      LIMIT 100
    `, [req.companyId]);
    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
