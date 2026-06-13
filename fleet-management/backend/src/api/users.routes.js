const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();
router.use(authenticate);

/**
 * GET /api/users
 * List users in company (admin only)
 */
router.get('/', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.email, u.full_name, u.phone, u.role, u.is_active, u.last_login, u.created_at,
             uc.role as company_role
      FROM users u
      JOIN user_companies uc ON u.id = uc.user_id
      WHERE uc.company_id = $1
      ORDER BY u.created_at DESC
    `, [req.companyId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/users
 * Create new user
 */
router.post('/', authorize('super_admin', 'admin'), validate(schemas.createUser), async (req, res) => {
  try {
    const { email, password, full_name, phone, role } = req.body;
    const id = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 12);

    const userResult = await query(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, full_name, phone, role, created_at
    `, [id, email.toLowerCase(), hashedPassword, full_name, phone, role]);

    await query(
      'INSERT INTO user_companies (user_id, company_id, role) VALUES ($1, $2, $3)',
      [id, req.companyId, role]
    );

    res.status(201).json({ success: true, data: userResult.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/users/:id
 */
router.put('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { full_name, phone, role, is_active } = req.body;

    await query(`
      UPDATE users SET
        full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        role = COALESCE($3, role),
        is_active = COALESCE($4, is_active)
      WHERE id = $5
    `, [full_name, phone, role, is_active, req.params.id]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/users/:id
 */
router.delete('/:id', authorize('super_admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/users/audit-log
 */
router.get('/audit-log', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(`
      SELECT al.*, u.full_name, u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.company_id = $1
      ORDER BY al.created_at DESC
      LIMIT $2 OFFSET $3
    `, [req.companyId, limit, offset]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
