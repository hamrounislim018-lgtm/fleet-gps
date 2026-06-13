const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── Fuel Logs ──────────────────────────────────────────────
router.get('/logs', async (req, res) => {
  try {
    const { vehicle_id, from, to, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    let where = 'WHERE fl.company_id = $1 AND fl.fuel_date BETWEEN $2 AND $3';
    const params = [req.companyId, fromDate, toDate];
    let idx = 4;

    if (vehicle_id) { where += ` AND fl.vehicle_id = $${idx++}`; params.push(vehicle_id); }

    const result = await query(`
      SELECT fl.*, v.name as vehicle_name, v.plate_number, d.full_name as driver_name
      FROM fuel_logs fl
      LEFT JOIN vehicles v ON fl.vehicle_id = v.id
      LEFT JOIN drivers d ON fl.driver_id = d.id
      ${where}
      ORDER BY fl.fuel_date DESC
      LIMIT $${idx} OFFSET $${idx+1}
    `, [...params, limit, offset]);

    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/logs', async (req, res) => {
  try {
    const { vehicle_id, driver_id, liters, cost_per_liter, total_cost, odometer, station_name, fuel_type, receipt_number, notes } = req.body;
    const id = uuidv4();
    const result = await query(`
      INSERT INTO fuel_logs (id, vehicle_id, company_id, driver_id, liters, cost_per_liter, total_cost, odometer, station_name, fuel_type, receipt_number, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [id, vehicle_id, req.companyId, driver_id, liters, cost_per_liter, total_cost || (liters * cost_per_liter), odometer, station_name, fuel_type || 'gasoline', receipt_number, notes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Fuel Stats ─────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    const result = await query(`
      SELECT
        v.id, v.name, v.plate_number,
        COUNT(fl.id) as fill_count,
        COALESCE(SUM(fl.liters), 0) as total_liters,
        COALESCE(SUM(fl.total_cost), 0) as total_cost,
        COALESCE(AVG(fl.cost_per_liter), 0) as avg_cost_per_liter,
        -- Consumption per 100km (if odometer data available)
        CASE
          WHEN MAX(fl.odometer) - MIN(fl.odometer) > 0
          THEN ROUND((SUM(fl.liters) / (MAX(fl.odometer) - MIN(fl.odometer)) * 100)::numeric, 2)
          ELSE 0
        END as consumption_per_100km
      FROM vehicles v
      LEFT JOIN fuel_logs fl ON v.id = fl.vehicle_id
        AND fl.fuel_date BETWEEN $2 AND $3
      WHERE v.company_id = $1
      GROUP BY v.id, v.name, v.plate_number
      ORDER BY total_cost DESC
    `, [req.companyId, fromDate, toDate]);

    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Theft Alerts ───────────────────────────────────────────
router.get('/theft-alerts', async (req, res) => {
  try {
    const result = await query(`
      SELECT fta.*, v.name as vehicle_name, v.plate_number
      FROM fuel_theft_alerts fta
      JOIN vehicles v ON fta.vehicle_id = v.id
      WHERE fta.company_id = $1
      ORDER BY fta.detected_at DESC
      LIMIT 100
    `, [req.companyId]);
    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/theft-alerts/:id/confirm', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    await query('UPDATE fuel_theft_alerts SET is_confirmed = true, notes = $1 WHERE id = $2', [req.body.notes, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
