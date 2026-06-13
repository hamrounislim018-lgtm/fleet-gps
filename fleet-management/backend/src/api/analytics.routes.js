const express = require('express');
const { query } = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── Heat Map Data ──────────────────────────────────────────
router.get('/heatmap', async (req, res) => {
  try {
    const { vehicle_id, from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    // Build from GPS positions, rounded to grid
    let where = 'WHERE vehicle_id IN (SELECT id FROM vehicles WHERE company_id = $1) AND created_at BETWEEN $2 AND $3';
    const params = [req.companyId, fromDate, toDate];

    if (vehicle_id) {
      where += ' AND vehicle_id = $4';
      params.push(vehicle_id);
    }

    const result = await query(`
      SELECT
        ROUND(latitude::numeric, 3) as lat,
        ROUND(longitude::numeric, 3) as lng,
        COUNT(*) as weight
      FROM gps_positions
      ${where}
      GROUP BY ROUND(latitude::numeric, 3), ROUND(longitude::numeric, 3)
      HAVING COUNT(*) > 2
      ORDER BY weight DESC
      LIMIT 2000
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Fleet Utilization ──────────────────────────────────────
router.get('/utilization', async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    const result = await query(`
      SELECT
        v.id, v.name, v.plate_number,
        COUNT(t.id) as trip_count,
        COALESCE(SUM(t.distance), 0) as total_distance,
        COALESCE(SUM(t.duration), 0) as total_engine_seconds,
        COALESCE(SUM(t.idle_time), 0) as total_idle_seconds,
        COALESCE(MAX(t.max_speed), 0) as max_speed,
        COALESCE(AVG(t.avg_speed), 0) as avg_speed,
        -- Utilization % (engine on / total period)
        CASE
          WHEN EXTRACT(EPOCH FROM ($3::timestamp - $2::timestamp)) > 0
          THEN ROUND((COALESCE(SUM(t.duration), 0) / EXTRACT(EPOCH FROM ($3::timestamp - $2::timestamp)) * 100)::numeric, 1)
          ELSE 0
        END as utilization_pct
      FROM vehicles v
      LEFT JOIN trips t ON v.id = t.vehicle_id
        AND t.start_time BETWEEN $2 AND $3
        AND t.is_complete = true
      WHERE v.company_id = $1 AND v.is_active = true
      GROUP BY v.id, v.name, v.plate_number
      ORDER BY total_distance DESC
    `, [req.companyId, fromDate, toDate]);

    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Daily Activity Chart ───────────────────────────────────
router.get('/daily-activity', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const result = await query(`
      SELECT
        DATE(t.start_time) as date,
        COUNT(t.id) as trips,
        COALESCE(SUM(t.distance), 0) as distance,
        COUNT(DISTINCT t.vehicle_id) as active_vehicles
      FROM trips t
      JOIN vehicles v ON t.vehicle_id = v.id
      WHERE v.company_id = $1
        AND t.start_time >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
        AND t.is_complete = true
      GROUP BY DATE(t.start_time)
      ORDER BY date ASC
    `, [req.companyId]);

    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Compliance Report ──────────────────────────────────────
router.get('/compliance', async (req, res) => {
  try {
    const { from, to, vehicle_id } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    let where = 'WHERE v.company_id = $1 AND t.start_time BETWEEN $2 AND $3';
    const params = [req.companyId, fromDate, toDate];
    if (vehicle_id) { where += ' AND t.vehicle_id = $4'; params.push(vehicle_id); }

    const result = await query(`
      SELECT
        v.name as vehicle_name, v.plate_number,
        d.full_name as driver_name,
        DATE(t.start_time) as work_date,
        SUM(t.duration) / 3600.0 as hours_worked,
        SUM(t.distance) as distance_km,
        COUNT(t.id) as trips,
        MAX(t.max_speed) as max_speed_recorded,
        -- Violations
        COUNT(a.id) FILTER (WHERE a.alert_type = 'speed') as speed_violations
      FROM trips t
      JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      LEFT JOIN alerts a ON a.vehicle_id = t.vehicle_id
        AND a.created_at BETWEEN t.start_time AND COALESCE(t.end_time, NOW())
      ${where}
      GROUP BY v.name, v.plate_number, d.full_name, DATE(t.start_time)
      ORDER BY work_date DESC, v.name
    `, params);

    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── WhatsApp notification ──────────────────────────────────
router.post('/whatsapp/send', async (req, res) => {
  try {
    const { phone, message, alert_id } = req.body;
    const id = require('uuid').v4();

    // Log the notification
    await query(
      'INSERT INTO whatsapp_logs (id, company_id, phone, message, alert_id, status) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, req.companyId, phone, message, alert_id, 'pending']
    );

    // In production: integrate with WhatsApp Business API (Twilio, Meta, etc.)
    // For now we log and return success
    // Example with Twilio WhatsApp:
    // await twilioClient.messages.create({ from: 'whatsapp:+14155238886', to: `whatsapp:${phone}`, body: message });

    await query('UPDATE whatsapp_logs SET status = $1, sent_at = NOW() WHERE id = $2', ['sent', id]);

    res.json({ success: true, message: 'WhatsApp notification queued' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/whatsapp/logs', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM whatsapp_logs WHERE company_id = $1 ORDER BY created_at DESC LIMIT 100',
      [req.companyId]
    );
    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
