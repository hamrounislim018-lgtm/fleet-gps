const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

/**
 * GET /api/alerts
 * List alerts with filters
 */
router.get('/', async (req, res) => {
  try {
    const { is_read, alert_type, vehicle_id, from, to, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE a.company_id = $1';
    const params = [req.companyId];
    let idx = 2;

    if (is_read !== undefined) {
      whereClause += ` AND a.is_read = $${idx++}`;
      params.push(is_read === 'true');
    }
    if (alert_type) {
      whereClause += ` AND a.alert_type = $${idx++}`;
      params.push(alert_type);
    }
    if (vehicle_id) {
      whereClause += ` AND a.vehicle_id = $${idx++}`;
      params.push(vehicle_id);
    }
    if (from) {
      whereClause += ` AND a.created_at >= $${idx++}`;
      params.push(new Date(from));
    }
    if (to) {
      whereClause += ` AND a.created_at <= $${idx++}`;
      params.push(new Date(to));
    }

    const result = await query(`
      SELECT a.*, v.name as vehicle_name, v.plate_number
      FROM alerts a
      LEFT JOIN vehicles v ON a.vehicle_id = v.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limit, offset]);

    const countResult = await query(
      `SELECT COUNT(*) FROM alerts a ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: { total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/alerts/:id/read
 */
router.put('/:id/read', async (req, res) => {
  try {
    await query(
      'UPDATE alerts SET is_read = true WHERE id = $1 AND company_id = $2',
      [req.params.id, req.companyId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/alerts/read-all
 */
router.put('/read-all', async (req, res) => {
  try {
    await query(
      'UPDATE alerts SET is_read = true WHERE company_id = $1 AND is_read = false',
      [req.companyId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/alerts/configs
 * Get alert configurations
 */
router.get('/configs', async (req, res) => {
  try {
    const result = await query(`
      SELECT ac.*, v.name as vehicle_name, v.plate_number
      FROM alert_configs ac
      LEFT JOIN vehicles v ON ac.vehicle_id = v.id
      WHERE ac.company_id = $1
      ORDER BY ac.created_at DESC
    `, [req.companyId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/alerts/configs
 */
router.post('/configs', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { vehicle_id, alert_type, threshold_value, notify_email, notify_sms, notify_push, recipients } = req.body;
    const id = uuidv4();

    const result = await query(`
      INSERT INTO alert_configs (id, company_id, vehicle_id, alert_type, threshold_value, notify_email, notify_sms, notify_push, recipients)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [id, req.companyId, vehicle_id, alert_type, threshold_value, notify_email, notify_sms, notify_push, JSON.stringify(recipients)]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/alerts/configs/:id
 */
router.delete('/configs/:id', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    await query(
      'DELETE FROM alert_configs WHERE id = $1 AND company_id = $2',
      [req.params.id, req.companyId]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
