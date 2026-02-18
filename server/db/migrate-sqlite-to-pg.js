/**
 * Migration Script: SQLite → PostgreSQL
 * 
 * This script migrates data from the old SQLite database to PostgreSQL
 */

const Database = require('better-sqlite3');
const path = require('path');
const { execute, transaction, initDatabase, closeDatabase } = require('./database-pg');

// Path to old SQLite database
const SQLITE_DB_PATH = path.join(__dirname, '../../transcriber.db');

async function migrateUsers(sqliteDb) {
  console.log('\n📦 Migrating users...');
  
  try {
    // Get all users from SQLite
    const users = sqliteDb.prepare('SELECT * FROM users').all();
    
    console.log(`Found ${users.length} users in SQLite.`);
    
    for (const user of users) {
      // Insert into PostgreSQL
      await execute(
        `INSERT INTO users (id, username, password_hash, first_name, last_name, email, is_admin, created_at, updated_at) 
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (username) DO NOTHING
         RETURNING id`,
        [
          user.username,
          user.password_hash,
          user.first_name,
          user.last_name || null,
          user.email || null,
          user.is_admin === 1,
          user.created_at,
          user.updated_at
        ]
      );
      
      console.log(`  ✅ Migrated user: ${user.username}`);
    }
    
    console.log('✅ Users migration completed!');
  } catch (error) {
    console.error('❌ Error migrating users:', error);
    throw error;
  }
}

async function migrateTranscriptions(sqliteDb) {
  console.log('\n📦 Migrating transcriptions...');
  
  try {
    // Get all transcriptions from SQLite
    const transcriptions = sqliteDb.prepare('SELECT * FROM transcriptions').all();
    
    console.log(`Found ${transcriptions.length} transcriptions in SQLite.`);
    
    // Get user mapping (SQLite ID → PostgreSQL UUID)
    const users = sqliteDb.prepare('SELECT id as old_id, username FROM users').all();
    const userMapping = {};
    
    for (const user of users) {
      const pgUser = await execute(
        'SELECT id FROM users WHERE username = $1',
        [user.username]
      );
      if (pgUser.rows.length > 0) {
        userMapping[user.old_id] = pgUser.rows[0].id;
      }
    }
    
    let migratedCount = 0;
    
    for (const transcription of transcriptions) {
      const pgUserId = userMapping[transcription.user_id];
      
      if (!pgUserId) {
        console.log(`  ⚠️  Skipping transcription ${transcription.id}: User not found`);
        continue;
      }
      
      // Read MP3 data if it exists in filesystem
      let mp3Data = transcription.mp3_data; // BLOB from SQLite
      let mp3Size = 0;
      
      if (transcription.mp3_path) {
        const fs = require('fs');
        const fullPath = path.join(__dirname, '../../', transcription.mp3_path);
        
        if (fs.existsSync(fullPath)) {
          mp3Data = fs.readFileSync(fullPath);
          mp3Size = mp3Data.length;
          console.log(`  📁 Read MP3 from filesystem: ${transcription.mp3_filename} (${mp3Size} bytes)`);
        }
      } else if (mp3Data) {
        mp3Size = mp3Data.length;
      }
      
      // Insert into PostgreSQL
      await execute(
        `INSERT INTO transcriptions 
         (id, user_id, mp3_filename, mp3_data, mp3_size_bytes, transcription_text, has_summary, created_at, updated_at) 
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          pgUserId,
          transcription.mp3_filename,
          mp3Data, // PostgreSQL BYTEA
          mp3Size,
          transcription.transcription_text || null,
          transcription.has_summary === 1,
          transcription.created_at,
          transcription.updated_at
        ]
      );
      
      migratedCount++;
      console.log(`  ✅ Migrated transcription: ${transcription.mp3_filename}`);
    }
    
    console.log(`✅ Transcriptions migration completed! (${migratedCount}/${transcriptions.length})`);
  } catch (error) {
    console.error('❌ Error migrating transcriptions:', error);
    throw error;
  }
}

async function migrateAuditLogs(sqliteDb) {
  console.log('\n📦 Migrating audit logs...');
  
  try {
    const auditLogs = sqliteDb.prepare('SELECT * FROM audit_logs').all();
    
    console.log(`Found ${auditLogs.length} audit logs in SQLite.`);
    
    // Get user mapping
    const users = sqliteDb.prepare('SELECT id as old_id, username FROM users').all();
    const userMapping = {};
    
    for (const user of users) {
      const pgUser = await execute(
        'SELECT id FROM users WHERE username = $1',
        [user.username]
      );
      if (pgUser.rows.length > 0) {
        userMapping[user.old_id] = pgUser.rows[0].id;
      }
    }
    
    for (const log of auditLogs) {
      const pgUserId = log.user_id ? userMapping[log.user_id] : null;
      
      // Parse details as JSON (SQLite stores as TEXT)
      let details = null;
      if (log.details) {
        try {
          details = JSON.parse(log.details);
        } catch (e) {
          details = { raw: log.details };
        }
      }
      
      await execute(
        `INSERT INTO audit_logs 
         (event_type, user_id, ip_address, user_agent, details, success, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          log.event_type,
          pgUserId,
          log.ip_address || null,
          log.user_agent || null,
          details ? JSON.stringify(details) : null,
          log.success === 1,
          log.created_at
        ]
      );
    }
    
    console.log('✅ Audit logs migration completed!');
  } catch (error) {
    console.error('❌ Error migrating audit logs:', error);
    throw error;
  }
}

async function runMigration() {
  console.log('🔄 Starting SQLite → PostgreSQL Migration...\n');
  
  try {
    // Check if SQLite database exists
    const fs = require('fs');
    if (!fs.existsSync(SQLITE_DB_PATH)) {
      console.log('❌ SQLite database not found at:', SQLITE_DB_PATH);
      console.log('Nothing to migrate. Exiting.');
      return;
    }
    
    // Connect to SQLite
    console.log('📂 Opening SQLite database:', SQLITE_DB_PATH);
    const sqliteDb = new Database(SQLITE_DB_PATH, { readonly: true });
    
    // Connect to PostgreSQL
    await initDatabase();
    
    // Migrate data
    await migrateUsers(sqliteDb);
    await migrateTranscriptions(sqliteDb);
    await migrateAuditLogs(sqliteDb);
    
    // Close connections
    sqliteDb.close();
    await closeDatabase();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Verify data: psql -U postgres -d mp3_transcriber');
    console.log('   2. Backup old SQLite DB: cp transcriber.db transcriber.db.backup');
    console.log('   3. Update server/index.js to use database-pg.js');
    console.log('   4. Restart server');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
