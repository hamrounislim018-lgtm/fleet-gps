const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── Maintenance Types ──────────────────────────────────────

router.get('/types', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM maintenance_types WHERE company_id = $1 ORDER BY name',
      [req.companyId]
    );
    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/types', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { name, name_ar, interval_km, interval_days, estimated_cost } = req.body;
    const id = uuidv4();
    const result = await query(
      `INSERT INTO maintenance_types (id, company_id, name, name_ar, interval_km, interval_days, estimated_cost)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, req.companyId, name, name_ar, interval_km, interval_days, estimated_cost]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Maintenance Records ────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const { vehicle_id, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE mr.company_id = $1';
    const params = [req.companyId];
    let idx = 2;

    if (vehicle_id) { where += ` AND mr.vehicle_id = $${idx++}`; params.push(vehicle_id); }
    if (status)     { where += ` AND mr.status = $${idx++}`;     params.push(status); }

    const result = await query(`
      SELECT mr.*, v.name as vehicle_name, v.plate_number,
             mt.name as type_name, mt.name_ar as type_name_ar
      FROM maintenance_records mr
      LEFT JOIN vehicles v ON mr.vehicle_id = v.id
      LEFT JOIN maintenance_types mt ON mr.maintenance_type_id = mt.id
      ${where}
      ORDER BY mr.scheduled_date DESC
      LIMIT $${idx} OFFSET $${idx+1}
    `, [...params, limit, offset]);

    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const {
      vehicle_id, maintenance_type_id, title, title_ar, description,
      status, priority, scheduled_date, cost, workshop, technician,
      next_service_km, next_service_date, notes
    } = req.body;
    const id = uuidv4();

    const result = await query(`
      INSERT INTO maintenance_records
        (id, vehicle_id, company_id, maintenance_type_id, title, title_ar, description,
         status, priority, scheduled_date, cost, workshop, technician,
         next_service_km, next_service_date, notes, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [id, vehicle_id, req.companyId, maintenance_type_id, title, title_ar, description,
       status || 'scheduled', priority || 'normal', scheduled_date, cost, workshop, technician,
       next_service_km, next_service_date, notes, req.user.id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { status, completed_date, cost, odometer_at_service, notes, workshop } = req.body;
    const result = await query(`
      UPDATE maintenance_records SET
        status = COALESCE($1, status),
        completed_date = COALESCE($2, completed_date),
        cost = COALESCE($3, cost),
        odometer_at_service = COALESCE($4, odometer_at_service),
        notes = COALESCE($5, notes),
        workshop = COALESCE($6, workshop)
      WHERE id = $7 AND company_id = $8 RETURNING *`,
      [status, completed_date, cost, odometer_at_service, notes, workshop, req.params.id, req.companyId]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    await query('DELETE FROM maintenance_records WHERE id=$1 AND company_id=$2', [req.params.id, req.companyId]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Due soon (vehicles needing maintenance) ────────────────
router.get('/due-soon', async (req, res) => {
  try {
    const result = await query(`
      SELECT v.id, v.name, v.plate_number, vlp.odometer,
             mr.title, mr.scheduled_date, mr.next_service_km, mr.next_service_date,
             CASE
               WHEN mr.next_service_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'overdue'
               WHEN mr.next_service_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'due_soon'
               ELSE 'ok'
             END as urgency
      FROM vehicles v
      LEFT JOIN vehicle_latest_position vlp ON v.id = vlp.vehicle_id
      LEFT JOIN maintenance_records mr ON v.id = mr.vehicle_id AND mr.status != 'completed'
      WHERE v.company_id = $1 AND mr.id IS NOT NULL
      ORDER BY mr.scheduled_date ASC
    `, [req.companyId]);
    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── Stats ──────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE scheduled_date < CURRENT_DATE AND status NOT IN ('completed','cancelled')) as overdue,
        COALESCE(SUM(cost) FILTER (WHERE status = 'completed'), 0) as total_cost
      FROM maintenance_records WHERE company_id = $1
    `, [req.companyId]);
    res.json({ success: true, data: result.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
