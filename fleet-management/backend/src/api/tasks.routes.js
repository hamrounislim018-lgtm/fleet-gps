const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { status, vehicle_id, driver_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE t.company_id = $1';
    const params = [req.companyId];
    let idx = 2;

    if (status)    { where += ` AND t.status = $${idx++}`;     params.push(status); }
    if (vehicle_id){ where += ` AND t.vehicle_id = $${idx++}`; params.push(vehicle_id); }
    if (driver_id) { where += ` AND t.driver_id = $${idx++}`;  params.push(driver_id); }

    const result = await query(`
      SELECT t.*,
             v.name as vehicle_name, v.plate_number,
             d.full_name as driver_name, d.phone as driver_phone,
             u.full_name as assigned_by_name
      FROM tasks t
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      LEFT JOIN users u ON t.assigned_by = u.id
      ${where}
      ORDER BY
        CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
        t.created_at DESC
      LIMIT $${idx} OFFSET $${idx+1}
    `, [...params, limit, offset]);

    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'assigned') as assigned,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE) as completed_today,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
      FROM tasks WHERE company_id = $1
    `, [req.companyId]);
    res.json({ success: true, data: result.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [task, updates] = await Promise.all([
      query(`
        SELECT t.*, v.name as vehicle_name, v.plate_number,
               d.full_name as driver_name, d.phone as driver_phone
        FROM tasks t
        LEFT JOIN vehicles v ON t.vehicle_id = v.id
        LEFT JOIN drivers d ON t.driver_id = d.id
        WHERE t.id = $1 AND t.company_id = $2
      `, [req.params.id, req.companyId]),
      query('SELECT * FROM task_updates WHERE task_id = $1 ORDER BY created_at ASC', [req.params.id])
    ]);
    if (!task.rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: { ...task.rows[0], updates: updates.rows } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const {
      vehicle_id, driver_id, title, title_ar, description, priority,
      pickup_address, pickup_lat, pickup_lng, pickup_time,
      delivery_address, delivery_lat, delivery_lng, delivery_time,
      customer_name, customer_phone, notes
    } = req.body;
    const id = uuidv4();

    const result = await query(`
      INSERT INTO tasks (
        id, company_id, vehicle_id, driver_id, assigned_by,
        title, title_ar, description, priority,
        pickup_address, pickup_lat, pickup_lng, pickup_time,
        delivery_address, delivery_lat, delivery_lng, delivery_time,
        customer_name, customer_phone, notes, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'pending')
      RETURNING *`,
      [id, req.companyId, vehicle_id, driver_id, req.user.id,
       title, title_ar, description, priority || 'normal',
       pickup_address, pickup_lat, pickup_lng, pickup_time,
       delivery_address, delivery_lat, delivery_lng, delivery_time,
       customer_name, customer_phone, notes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { status, message, latitude, longitude } = req.body;
    const validStatuses = ['pending','assigned','in_progress','completed','cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updates = { status };
    if (status === 'in_progress') updates.started_at = new Date();
    if (status === 'completed')   updates.completed_at = new Date();

    await query(`
      UPDATE tasks SET status = $1,
        started_at = COALESCE($2, started_at),
        completed_at = COALESCE($3, completed_at)
      WHERE id = $4 AND company_id = $5`,
      [status, updates.started_at || null, updates.completed_at || null, req.params.id, req.companyId]
    );

    // Log update
    await query(
      'INSERT INTO task_updates (task_id, status, message, latitude, longitude) VALUES ($1,$2,$3,$4,$5)',
      [req.params.id, status, message, latitude, longitude]
    );

    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { vehicle_id, driver_id, title, priority, notes, delivery_time } = req.body;
    const result = await query(`
      UPDATE tasks SET
        vehicle_id = COALESCE($1, vehicle_id),
        driver_id = COALESCE($2, driver_id),
        title = COALESCE($3, title),
        priority = COALESCE($4, priority),
        notes = COALESCE($5, notes),
        delivery_time = COALESCE($6, delivery_time)
      WHERE id = $7 AND company_id = $8 RETURNING *`,
      [vehicle_id, driver_id, title, priority, notes, delivery_time, req.params.id, req.companyId]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    await query('DELETE FROM tasks WHERE id=$1 AND company_id=$2', [req.params.id, req.companyId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
