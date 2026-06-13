const express = require('express');
const { query } = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── Driver Scores Leaderboard ──────────────────────────────
router.get('/scores', async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    const result = await query(`
      SELECT
        d.id, d.full_name, d.full_name_ar, d.phone,
        v.name as vehicle_name, v.plate_number,
        ROUND(AVG(ds.total_score)::numeric, 1) as avg_score,
        SUM(ds.speeding_events) as total_speeding,
        SUM(ds.harsh_brake_events) as total_harsh_brake,
        SUM(ds.harsh_accel_events) as total_harsh_accel,
        SUM(ds.idle_time_minutes) as total_idle_minutes,
        SUM(ds.total_distance) as total_distance,
        SUM(ds.total_trips) as total_trips,
        CASE
          WHEN AVG(ds.total_score) >= 90 THEN 'A'
          WHEN AVG(ds.total_score) >= 75 THEN 'B'
          WHEN AVG(ds.total_score) >= 60 THEN 'C'
          WHEN AVG(ds.total_score) >= 45 THEN 'D'
          ELSE 'F'
        END as grade
      FROM drivers d
      LEFT JOIN driver_scores ds ON d.id = ds.driver_id
        AND ds.score_date BETWEEN $2 AND $3
      LEFT JOIN vehicles v ON ds.vehicle_id = v.id
      WHERE d.company_id = $1
      GROUP BY d.id, d.full_name, d.full_name_ar, d.phone, v.name, v.plate_number
      ORDER BY avg_score DESC NULLS LAST
    `, [req.companyId, fromDate, toDate]);

    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Driver Events Timeline ─────────────────────────────────
router.get('/events', async (req, res) => {
  try {
    const { driver_id, vehicle_id, event_type, from, to, limit = 100 } = req.query;
    const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    let where = 'WHERE dbe.company_id = $1 AND dbe.created_at BETWEEN $2 AND $3';
    const params = [req.companyId, fromDate, toDate];
    let idx = 4;

    if (driver_id)  { where += ` AND dbe.driver_id = $${idx++}`;  params.push(driver_id); }
    if (vehicle_id) { where += ` AND dbe.vehicle_id = $${idx++}`; params.push(vehicle_id); }
    if (event_type) { where += ` AND dbe.event_type = $${idx++}`; params.push(event_type); }

    const result = await query(`
      SELECT dbe.*, d.full_name as driver_name, v.name as vehicle_name, v.plate_number
      FROM driver_behavior_events dbe
      LEFT JOIN drivers d ON dbe.driver_id = d.id
      LEFT JOIN vehicles v ON dbe.vehicle_id = v.id
      ${where}
      ORDER BY dbe.created_at DESC
      LIMIT $${idx}
    `, [...params, limit]);

    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Single driver detail ───────────────────────────────────
router.get('/driver/:id', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const fromDate = new Date(Date.now() - days * 86400000);

    const [scores, events] = await Promise.all([
      query(`
        SELECT score_date, total_score, speeding_events, harsh_brake_events,
               harsh_accel_events, idle_time_minutes, total_distance, grade
        FROM driver_scores
        WHERE driver_id = $1 AND score_date >= $2
        ORDER BY score_date ASC
      `, [req.params.id, fromDate]),
      query(`
        SELECT event_type, COUNT(*) as count, AVG(value) as avg_value
        FROM driver_behavior_events
        WHERE driver_id = $1 AND created_at >= $2 AND company_id = $3
        GROUP BY event_type
      `, [req.params.id, fromDate, req.companyId])
    ]);

    res.json({ success: true, data: { scores: scores.rows, events: events.rows } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
