const Joi = require('joi');

/**
 * Validate request body against a Joi schema
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const errors = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    req.body = value;
    next();
  };
};

// Validation schemas
const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  createUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
      .messages({ 'string.pattern.base': 'Password must contain uppercase, lowercase, and number' }),
    full_name: Joi.string().min(2).max(255).required(),
    phone: Joi.string().optional().allow(''),
    role: Joi.string().valid('admin', 'user').default('user')
  }),

  createVehicle: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    plate_number: Joi.string().min(2).max(50).required(),
    vin: Joi.string().optional().allow(''),
    make: Joi.string().optional().allow(''),
    model: Joi.string().optional().allow(''),
    year: Joi.number().integer().min(1990).max(2030).optional(),
    color: Joi.string().optional().allow(''),
    fuel_type: Joi.string().valid('gasoline', 'diesel', 'electric', 'hybrid').default('gasoline'),
    max_speed: Joi.number().integer().min(50).max(250).default(120),
    group_id: Joi.string().uuid().optional().allow(null),
    driver_id: Joi.string().uuid().optional().allow(null),
    notes: Joi.string().optional().allow('')
  }),

  createDriver: Joi.object({
    full_name: Joi.string().min(2).max(255).required(),
    full_name_ar: Joi.string().optional().allow(''),
    phone: Joi.string().optional().allow(''),
    email: Joi.string().email().optional().allow(''),
    license_number: Joi.string().optional().allow(''),
    license_expiry: Joi.date().optional().allow(null),
    notes: Joi.string().optional().allow('')
  }),

  createGeofence: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    name_ar: Joi.string().optional().allow(''),
    type: Joi.string().valid('circle', 'polygon', 'rectangle').required(),
    coordinates: Joi.array().required(),
    center_lat: Joi.number().optional(),
    center_lng: Joi.number().optional(),
    radius: Joi.number().optional(),
    color: Joi.string().optional().default('#EF4444'),
    alert_on_enter: Joi.boolean().default(true),
    alert_on_exit: Joi.boolean().default(true),
    vehicle_ids: Joi.array().items(Joi.string().uuid()).optional()
  }),

  createDevice: Joi.object({
    imei: Joi.string().min(10).max(20).required(),
    vehicle_id: Joi.string().uuid().optional().allow(null),
    device_type: Joi.string().optional().allow(''),
    model: Joi.string().optional().allow(''),
    sim_number: Joi.string().optional().allow('')
  })
};

module.exports = { validate, schemas };
