/**
 * Database Setup & Connection - PostgreSQL
 * Migration from SQLite (better-sqlite3) to PostgreSQL (pg)
 */

// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// PostgreSQL connection configuration
const poolConfig = {
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'mp3_transcriber',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  
  // Connection pool settings
  max: 20,                      // Maximum number of clients in pool
  idleTimeoutMillis: 30000,     // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000 // Return error after 2 seconds if unable to connect
};

// Create connection pool
const pool = new Pool(poolConfig);

// Schema file path
const SCHEMA_PATH = path.join(__dirname, 'postgresql-schema.sql');

/**
 * Initialize database connection and create schema if needed
 */
async function initDatabase() {
  console.log('📦 Initializing PostgreSQL database...');
  
  try {
    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now');
    console.log('✅ Database connection successful!', result.rows[0].now);
    client.release();
    
    // Check if schema needs to be created
    const schemaExists = await checkSchemaExists();
    
    if (!schemaExists) {
      console.log('🆕 Schema not found. Creating database schema...');
      await createSchema();
    } else {
      console.log('✅ Database schema already exists.');
    }
    
    return pool;
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
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
    console.error('❌ Error checking schema:', error.message);
    return false;
  }
}

/**
 * Create database schema from postgresql-schema.sql
 */
async function createSchema() {
  console.log('📝 Creating database schema...');
  
  try {
    // Read schema file
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    
    // Execute schema (PostgreSQL supports multiple statements)
    await pool.query(schema);
    
    console.log('✅ Database schema created successfully!');
  } catch (error) {
    console.error('❌ Error creating database schema:', error);
    throw error;
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
  console.log('🔒 Database connection pool closed.');
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
    console.error('Query error:', error);
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
    console.error('Query error:', error);
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
    console.error('Execute error:', error);
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
    console.error('Transaction error:', error);
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
