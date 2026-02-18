/**
 * Database Migration: Add email column to users table
 * Version: 2.1.0
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../transcriber.db');

function migrate() {
  console.log('🔄 Starting migration: Add email column...');
  
  const db = new Database(DB_PATH);
  
  try {
    // Check if email column already exists
    const tableInfo = db.prepare('PRAGMA table_info(users)').all();
    const hasEmail = tableInfo.some(col => col.name === 'email');
    
    if (hasEmail) {
      console.log('✅ Email column already exists, skipping migration.');
      return;
    }
    
    // Add email column
    db.prepare('ALTER TABLE users ADD COLUMN email TEXT').run();
    
    // Create index for email
    db.prepare('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)').run();
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate };
