const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/db');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticate user and return JWT tokens
 */
router.post('/login', validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user with company info
    const result = await query(`
      SELECT u.*, uc.company_id, uc.role as company_role
      FROM users u
      LEFT JOIN user_companies uc ON u.id = uc.user_id
      WHERE u.email = $1 AND u.is_active = true
      LIMIT 1
    `, [email.toLowerCase()]);

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, companyId: user.company_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    const refreshToken = uuidv4();
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, refreshExpiry]
    );

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          companyId: user.company_id,
          language: user.language,
          theme: user.theme
        }
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const result = await query(`
      SELECT rt.*, u.id as user_id, u.role, uc.company_id
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      LEFT JOIN user_companies uc ON u.id = uc.user_id
      WHERE rt.token = $1 AND rt.expires_at > NOW() AND u.is_active = true
    `, [refreshToken]);

    if (!result.rows[0]) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    const tokenData = result.rows[0];
    const accessToken = jwt.sign(
      { userId: tokenData.user_id, companyId: tokenData.company_id, role: tokenData.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({ success: true, data: { accessToken } });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.email, u.full_name, u.phone, u.role, u.language, u.theme, u.last_login,
             c.id as company_id, c.name as company_name, c.name_ar as company_name_ar, c.logo_url
      FROM users u
      LEFT JOIN user_companies uc ON u.id = uc.user_id
      LEFT JOIN companies c ON uc.company_id = c.id
      WHERE u.id = $1
    `, [req.user.id]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { full_name, phone, language, theme } = req.body;
    await query(
      'UPDATE users SET full_name = $1, phone = $2, language = $3, theme = $4 WHERE id = $5',
      [full_name, phone, language, theme, req.user.id]
    );
    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * PUT /api/auth/change-password
 */
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    // Invalidate all refresh tokens
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
