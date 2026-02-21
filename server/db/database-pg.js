/**
 * Database Setup & Connection - PostgreSQL
 * Migration from SQLite (better-sqlite3) to PostgreSQL (pg)
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const logger = require('../../logger');

// PostgreSQL connection configuration.
// Unterstützt zwei Modi:
//   1. DATABASE_URL (automatisch von Railway bereitgestellt wenn PostgreSQL Add-on aktiv)
//   2. Einzelne POSTGRES_* Variablen (für lokale Entwicklung)
let poolConfig;

if (process.env.DATABASE_URL) {
  // Railway-Mode: DATABASE_URL hat Vorrang
  logger.log('DATABASE', '✅ Verwende DATABASE_URL (Railway-Modus)');
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    // SSL ist auf Railway erforderlich; lokal deaktiviert
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  };
} else {
  // Lokaler Modus: individuelle POSTGRES_* Variablen
  if (!process.env.POSTGRES_PASSWORD) {
    logger.log('DATABASE', '⚠️ WARNING: POSTGRES_PASSWORD nicht in .env gesetzt. Verwende Fallback (nur für Development!)');
  }
  poolConfig = {
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'mp3_transcriber',
    password: process.env.POSTGRES_PASSWORD || 'postgres', // Fallback nur für Development
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  };
}

// Create connection pool
const pool = new Pool(poolConfig);

// Schema file path
const SCHEMA_PATH = path.join(__dirname, 'postgresql-schema.sql');

/**
 * Initialize database connection and create schema if needed
 */
async function initDatabase() {
  logger.log('DATABASE', '📦 Initializing PostgreSQL database...');
  
  try {
    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now');
    logger.log('DATABASE', '✅ Database connection successful!', result.rows[0].now);
    client.release();
    
    // Check if schema needs to be created
    const schemaExists = await checkSchemaExists();
    
    if (!schemaExists) {
      logger.log('DATABASE', '🆕 Schema not found. Creating database schema...');
      await createSchema();
    } else {
      logger.log('DATABASE', '✅ Database schema already exists.');
      // Migrations: Neue Spalten hinzufügen falls noch nicht vorhanden
      await runMigrations();
    }
    
    return pool;
  } catch (error) {
    logger.error('DATABASE', '❌ Error initializing database:', error.message);
    throw error;
  }
}

/**
 * Check if database schema exists (check for users table)
 */
async function checkSchemaExists() {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as exists
    `);
    return result.rows[0].exists;
  } catch (error) {
    logger.error('DATABASE', '❌ Error checking schema:', error.message);
    return false;
  }
}

/**
 * Create database schema from postgresql-schema.sql
 */
async function createSchema() {
  logger.log('DATABASE', '📝 Creating database schema...');
  
  try {
    // Read schema file
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    
    // Execute schema (PostgreSQL supports multiple statements)
    await pool.query(schema);
    
    logger.log('DATABASE', '✅ Database schema created successfully!');
  } catch (error) {
    logger.error('DATABASE', '❌ Error creating database schema:', error);
    throw error;
  }
}

/**
 * Migrations: Fügt fehlende Spalten und Constraints zu bestehenden Tabellen hinzu
 * Idempotent – kann bei jedem Server-Start ausgeführt werden
 */
async function runMigrations() {
  logger.log('DATABASE', '🔄 Prüfe DB-Migrationen...');

  try {
    // Migration: last_transcription_id in users Tabelle
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS last_transcription_id VARCHAR(6)
          REFERENCES transcriptions(id) ON DELETE SET NULL
    `);
    logger.log('DATABASE', '✅ Migration: last_transcription_id geprüft/hinzugefügt');
  } catch (error) {
    // Fehler nicht fatal – Spalte könnte in seltenen Fällen schon existieren
    logger.warn('DATABASE', '⚠️ Migration last_transcription_id:', error.message);
  }
}

/**
 * Get database pool instance
 */
function getDatabase() {
  return pool;
}

/**
 * Close all database connections
 */
async function closeDatabase() {
  await pool.end();
  logger.log('DATABASE', '🔒 Database connection pool closed.');
}

/**
 * Helper: Execute a query with parameters (prepared statement)
 * @param {string} sql SQL query
 * @param {Array} params Query parameters
 * @returns {Array} Query results
 */
async function query(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    logger.error('DATABASE', 'Query error:', error);
    throw error;
  }
}

/**
 * Helper: Execute a query and return first row
 * @param {string} sql SQL query
 * @param {Array} params Query parameters
 * @returns {Object|null} First row or null
 */
async function queryOne(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('DATABASE', 'Query error:', error);
    throw error;
  }
}

/**
 * Helper: Execute an INSERT/UPDATE/DELETE query
 * @param {string} sql SQL query
 * @param {Array} params Query parameters
 * @returns {Object} Query result info (rowCount, rows)
 */
async function execute(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return {
      rowCount: result.rowCount,
      rows: result.rows
    };
  } catch (error) {
    logger.error('DATABASE', 'Execute error:', error);
    throw error;
  }
}

/**
 * Helper: Execute multiple queries in a transaction
 * @param {Function} callback Async function that receives client instance
 * @returns {*} Result from callback
 */
async function transaction(callback) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('DATABASE', 'Transaction error:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Helper: Get a client from the pool (for manual transaction management)
 */
async function getClient() {
  return await pool.connect();
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  query,
  queryOne,
  execute,
  transaction,
  getClient
};
