const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Super admin only — manage all companies
router.get('/', authorize('super_admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*,
        COUNT(DISTINCT v.id) as vehicle_count,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT d.id) as driver_count
      FROM companies c
      LEFT JOIN vehicles v ON c.id = v.company_id AND v.is_active = true
      LEFT JOIN user_companies uc ON c.id = uc.company_id
      LEFT JOIN users u ON uc.user_id = u.id
      LEFT JOIN drivers d ON c.id = d.company_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', authorize('super_admin'), async (req, res) => {
  try {
    const {
      name, name_ar, email, phone, address, city, country,
      max_vehicles, subscription_plan, subscription_expires,
      billing_email, whatsapp_number
    } = req.body;
    const id = uuidv4();

    const result = await query(`
      INSERT INTO companies (id, name, name_ar, email, phone, address, city, country,
        max_vehicles, subscription_plan, subscription_expires, billing_email, whatsapp_number)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [id, name, name_ar, email, phone, address, city, country || 'Oman',
       max_vehicles || 50, subscription_plan || 'basic', subscription_expires,
       billing_email, whatsapp_number]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:id', authorize('super_admin'), async (req, res) => {
  try {
    const {
      name, name_ar, email, phone, max_vehicles,
      subscription_plan, subscription_expires, is_active,
      whatsapp_number, whatsapp_enabled
    } = req.body;

    const result = await query(`
      UPDATE companies SET
        name = COALESCE($1, name),
        name_ar = COALESCE($2, name_ar),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        max_vehicles = COALESCE($5, max_vehicles),
        subscription_plan = COALESCE($6, subscription_plan),
        subscription_expires = COALESCE($7, subscription_expires),
        is_active = COALESCE($8, is_active),
        whatsapp_number = COALESCE($9, whatsapp_number),
        whatsapp_enabled = COALESCE($10, whatsapp_enabled)
      WHERE id = $11 RETURNING *`,
      [name, name_ar, email, phone, max_vehicles, subscription_plan,
       subscription_expires, is_active, whatsapp_number, whatsapp_enabled, req.params.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', authorize('super_admin'), async (req, res) => {
  try {
    await query('UPDATE companies SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Stats for super admin dashboard
router.get('/overview/stats', authorize('super_admin'), async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*) as total_companies,
        COUNT(*) FILTER (WHERE is_active = true) as active_companies,
        COUNT(*) FILTER (WHERE subscription_expires < CURRENT_DATE) as expired_subscriptions,
        COUNT(*) FILTER (WHERE subscription_plan = 'basic') as basic_plan,
        COUNT(*) FILTER (WHERE subscription_plan = 'pro') as pro_plan,
        COUNT(*) FILTER (WHERE subscription_plan = 'enterprise') as enterprise_plan
      FROM companies
    `);
    const vehicles = await query('SELECT COUNT(*) as total FROM vehicles WHERE is_active = true');
    res.json({ success: true, data: { ...result.rows[0], total_vehicles: vehicles.rows[0].total } });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
