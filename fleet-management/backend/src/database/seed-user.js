const { query } = require('./db');
const bcrypt = require('bcryptjs');

async function seedUser() {
  try {
    const email = 'admin@fleet.com';
    const password = 'Admin@123456';
    const fullName = 'Admin User';
    const role = 'admin';
    const language = 'en';
    const theme = 'dark';

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      console.log('User already exists');
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert user
    await query(
      `INSERT INTO users (email, password_hash, full_name, role, language, theme, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())`,
      [email.toLowerCase(), passwordHash, fullName, role, language, theme]
    );

    console.log('Demo user created successfully');
    console.log('Email:', email);
    console.log('Password:', password);
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedUser();
