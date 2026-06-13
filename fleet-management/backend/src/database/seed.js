require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./db');
const logger = require('../utils/logger');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    logger.info('Seeding database...');

    // Create default company
    const companyId = uuidv4();
    await client.query(`
      INSERT INTO companies (id, name, name_ar, email, phone, max_vehicles)
      VALUES ($1, 'Demo Fleet Company', 'شركة الأسطول التجريبية', 'demo@fleet.com', '+966500000000', 500)
      ON CONFLICT DO NOTHING
    `, [companyId]);

    // Create super admin
    const adminId = uuidv4();
    const hashedPassword = await bcrypt.hash('Admin@123456', 12);
    await client.query(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role)
      VALUES ($1, 'admin@fleet.com', $2, 'Super Administrator', '+966500000000', 'super_admin')
      ON CONFLICT (email) DO NOTHING
    `, [adminId, hashedPassword]);

    await client.query(`
      INSERT INTO user_companies (user_id, company_id, role)
      VALUES ($1, $2, 'super_admin')
      ON CONFLICT DO NOTHING
    `, [adminId, companyId]);

    // Create demo driver
    const driverId = uuidv4();
    await client.query(`
      INSERT INTO drivers (id, company_id, full_name, full_name_ar, phone, license_number, license_expiry)
      VALUES ($1, $2, 'Ahmed Al-Rashidi', 'أحمد الراشدي', '+966501234567', 'DL-123456', '2026-12-31')
      ON CONFLICT DO NOTHING
    `, [driverId, companyId]);

    // Create vehicle group
    const groupId = uuidv4();
    await client.query(`
      INSERT INTO vehicle_groups (id, company_id, name, name_ar, color)
      VALUES ($1, $2, 'Main Fleet', 'الأسطول الرئيسي', '#3B82F6')
      ON CONFLICT DO NOTHING
    `, [groupId, companyId]);

    // Create demo vehicles
    const vehicles = [
      { plate: 'ABC-1234', name: 'Toyota Camry 2023', make: 'Toyota', model: 'Camry', year: 2023 },
      { plate: 'XYZ-5678', name: 'Ford F-150 2022', make: 'Ford', model: 'F-150', year: 2022 },
      { plate: 'DEF-9012', name: 'Hyundai Sonata 2023', make: 'Hyundai', model: 'Sonata', year: 2023 }
    ];

    for (const v of vehicles) {
      const vehicleId = uuidv4();
      const deviceId = uuidv4();
      const imei = Math.floor(Math.random() * 900000000000000) + 100000000000000;

      await client.query(`
        INSERT INTO vehicles (id, company_id, group_id, driver_id, name, plate_number, make, model, year, max_speed)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 120)
        ON CONFLICT (plate_number) DO NOTHING
      `, [vehicleId, companyId, groupId, driverId, v.name, v.plate, v.make, v.model, v.year]);

      await client.query(`
        INSERT INTO gps_devices (id, vehicle_id, imei, device_type, model)
        VALUES ($1, $2, $3, 'Teltonika', 'FMB920')
        ON CONFLICT (imei) DO NOTHING
      `, [deviceId, vehicleId, imei.toString()]);

      // Seed latest position (Riyadh area)
      await client.query(`
        INSERT INTO vehicle_latest_position (vehicle_id, device_id, latitude, longitude, speed, status)
        VALUES ($1, $2, $3, $4, 0, 'offline')
        ON CONFLICT (vehicle_id) DO NOTHING
      `, [vehicleId, deviceId, 24.7136 + (Math.random() - 0.5) * 0.1, 46.6753 + (Math.random() - 0.5) * 0.1]);
    }

    await client.query('COMMIT');
    logger.info('Database seeded successfully');
    logger.info('Login credentials: admin@fleet.com / Admin@123456');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Seeding failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
