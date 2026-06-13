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
      SELECT d.*, v.name as current_vehicle, v.plate_number
      FROM drivers d
      LEFT JOIN vehicles v ON d.id = v.driver_id AND v.is_active = true
      WHERE d.company_id = $1
      ORDER BY d.full_name
    `, [req.companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM drivers WHERE id = $1 AND company_id = $2',
      [req.params.id, req.companyId]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', authorize('super_admin', 'admin'), validate(schemas.createDriver), async (req, res) => {
  try {
    const { full_name, full_name_ar, phone, email, license_number, license_expiry, notes } = req.body;
    const id = uuidv4();

    const result = await query(`
      INSERT INTO drivers (id, company_id, full_name, full_name_ar, phone, email, license_number, license_expiry, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [id, req.companyId, full_name, full_name_ar, phone, email, license_number, license_expiry, notes]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { full_name, full_name_ar, phone, email, license_number, license_expiry, notes, is_active } = req.body;

    const result = await query(`
      UPDATE drivers SET
        full_name = COALESCE($1, full_name),
        full_name_ar = COALESCE($2, full_name_ar),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        license_number = COALESCE($5, license_number),
        license_expiry = COALESCE($6, license_expiry),
        notes = COALESCE($7, notes),
        is_active = COALESCE($8, is_active)
      WHERE id = $9 AND company_id = $10
      RETURNING *
    `, [full_name, full_name_ar, phone, email, license_number, license_expiry, notes, is_active, req.params.id, req.companyId]);

    if (!result.rows[0]) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', authorize('super_admin', 'admin'), async (req, res) => {
  try {
    await query('DELETE FROM drivers WHERE id = $1 AND company_id = $2', [req.params.id, req.companyId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
