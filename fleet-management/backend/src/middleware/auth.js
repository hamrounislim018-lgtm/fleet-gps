const jwt = require('jsonwebtoken');
const { query } = require('../database/db');
const logger = require('../utils/logger');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get fresh user data
    const result = await query(
      'SELECT id, email, full_name, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!result.rows[0] || !result.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    req.user = result.rows[0];
    req.companyId = decoded.companyId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

/**
 * Require specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    next();
  };
};

/**
 * Audit log middleware
 */
const auditLog = (action, entityType) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      if (data.success !== false && req.user) {
        try {
          await query(
            `INSERT INTO audit_logs (user_id, company_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              req.user.id,
              req.companyId,
              action,
              entityType,
              req.params.id || null,
              JSON.stringify(req.body),
              req.ip,
              req.headers['user-agent']
            ]
          );
        } catch (err) {
          logger.error('Audit log error:', err.message);
        }
      }
      return originalJson(data);
    };
    next();
  };
};

module.exports = { authenticate, authorize, auditLog };
