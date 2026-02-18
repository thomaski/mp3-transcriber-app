/**
 * Seed Script for PostgreSQL
 * Creates default users with hashed passwords
 */

// Load environment variables
require('dotenv').config();

const bcrypt = require('bcrypt');
const { query, execute, initDatabase, closeDatabase } = require('./database-pg');
const { generateUserId } = require('../utils/generateShortId');

const SALT_ROUNDS = 12;

// Default users
const defaultUsers = [
  {
    username: 'tom',
    password: 'MT9#Detomaso',
    first_name: 'tom',
    last_name: '',
    email: 'thomas.kiesswetter@gmx.de',
    is_admin: true
  },
  {
    username: 'micha',
    password: 'MT9#Schutzengel',
    first_name: 'micha',
    last_name: '',
    email: 'michaelabrassat@gmx.de',
    is_admin: true
  },
  {
    username: 'test',
    password: 'test',
    first_name: 'test',
    last_name: '',
    email: null,
    is_admin: false
  }
];

async function seedUsers() {
  console.log('🌱 Seeding default users...');
  
  try {
    for (const user of defaultUsers) {
      // Check if user already exists
      const existing = await query(
        'SELECT id FROM users WHERE username = $1',
        [user.username]
      );
      
      if (existing.length > 0) {
        console.log(`⚠️  User '${user.username}' already exists, skipping...`);
        continue;
      }
      
      // Hash password
      const password_hash = await bcrypt.hash(user.password, SALT_ROUNDS);
      
      // Generate unique 6-character ID starting with digit
      const userId = generateUserId();
      
      // Insert user
      const result = await execute(
        `INSERT INTO users (id, username, password_hash, first_name, last_name, email, is_admin) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id`,
        [userId, user.username, password_hash, user.first_name, user.last_name, user.email, user.is_admin]
      );
      
      console.log(`✅ Created user '${user.username}' (ID: ${result.rows[0].id})`);
    }
    
    console.log('✅ Seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
}

// Run seed if called directly
if (require.main === module) {
  (async () => {
    try {
      await initDatabase();
      await seedUsers();
      await closeDatabase();
    } catch (error) {
      console.error('Seed failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { seedUsers };
