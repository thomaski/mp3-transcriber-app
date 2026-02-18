/**
 * Run All Migrations: Execute all SQL migration files in migrations folder
 */

require('dotenv').config();
const { execute, initDatabase, closeDatabase } = require('./database-pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  try {
    console.log('🔄 Starting migrations...');
    
    // Initialize database connection
    await initDatabase();
    
    // Get all SQL migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort alphabetically
    
    console.log(`📁 Found ${files.length} migration file(s)`);
    
    for (const file of files) {
      const migrationPath = path.join(migrationsDir, file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      console.log(`\n📄 Executing migration: ${file}`);
      console.log('─'.repeat(60));
      
      // Execute migration
      await execute(migrationSQL);
      
      console.log(`✅ Migration ${file} completed successfully!`);
    }
    
    console.log('\n✅ All migrations completed successfully!');
    
    // Close database connection
    await closeDatabase();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

runMigrations();
