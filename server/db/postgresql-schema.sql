-- ============================================
-- MP3 Transcriber App - PostgreSQL Schema
-- Version: 2.0.0
-- Date: 2026-02-18
-- Migration from SQLite to PostgreSQL
-- ============================================

-- ============================================
-- Extensions
-- ============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- For password hashing

-- ============================================
-- Table: users
-- Description: Stores user accounts (admin & standard users)
-- ID Format: 6-character alphanumeric starting with digit (0-9)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(6) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,       -- bcrypt hash (cost: 12)
  first_name VARCHAR(100) NOT NULL,           -- Vorname (mandatory, also used as password for public access)
  last_name VARCHAR(100),                     -- Nachname (optional)
  email VARCHAR(255) UNIQUE,                  -- Email (optional, must be valid if provided)
  is_admin BOOLEAN DEFAULT FALSE,
  last_upload_directory VARCHAR(500),         -- Last used upload directory (for admins)
  last_transcription_id VARCHAR(6),           -- Zuletzt bearbeitete Transkription (für Admins)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

-- ============================================
-- Table: transcriptions
-- Description: Stores MP3 files and transcriptions
-- ID Format: 6-character alphanumeric starting with letter (a-z)
-- ============================================
CREATE TABLE IF NOT EXISTS transcriptions (
  id VARCHAR(6) PRIMARY KEY,
  user_id VARCHAR(6) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mp3_filename VARCHAR(255) NOT NULL,
  mp3_data BYTEA,                             -- MP3 file stored as binary data
  mp3_size_bytes BIGINT,                      -- File size in bytes
  mp3_hash VARCHAR(64),                       -- SHA-256 hash of MP3 file (64 hex characters)
  transcription_text TEXT,                    -- Transcription content
  has_summary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcriptions_has_summary ON transcriptions(has_summary);
CREATE INDEX IF NOT EXISTS idx_transcriptions_mp3_hash ON transcriptions(mp3_hash);

-- ============================================
-- Table: access_tokens
-- Description: Tokens for secure MP3 sharing
-- ============================================
CREATE TABLE IF NOT EXISTS access_tokens (
  token VARCHAR(21) PRIMARY KEY,              -- nanoid (URL-safe)
  transcription_id VARCHAR(6) NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  expires_at TIMESTAMP,                       -- Optional: Token expiry
  access_count INTEGER DEFAULT 0,             -- Track number of accesses
  last_accessed_at TIMESTAMP,                 -- Last access timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster token lookups
CREATE INDEX IF NOT EXISTS idx_access_tokens_transcription_id ON access_tokens(transcription_id);
CREATE INDEX IF NOT EXISTS idx_access_tokens_expires_at ON access_tokens(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- Table: audit_logs
-- Description: Security audit trail for all access attempts
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,            -- 'login', 'access_token', 'user_create', etc.
  user_id VARCHAR(6) REFERENCES users(id),    -- User who performed the action (if authenticated)
  ip_address INET,                            -- Client IP address (native INET type)
  user_agent TEXT,                            -- Browser User-Agent
  details JSONB,                              -- JSON object with additional details
  success BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_details ON audit_logs USING gin(details); -- GIN index for JSONB queries

-- ============================================
-- Triggers: Auto-update updated_at timestamps
-- ============================================

-- Function for updating updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for transcriptions table
DROP TRIGGER IF EXISTS transcriptions_updated_at ON transcriptions;
CREATE TRIGGER transcriptions_updated_at
  BEFORE UPDATE ON transcriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Views: Helpful views for common queries
-- ============================================

-- View: User overview with transcription count
CREATE OR REPLACE VIEW v_user_overview AS
SELECT 
  u.id,
  u.username,
  u.first_name,
  u.last_name,
  u.is_admin,
  COUNT(t.id) as transcription_count,
  u.created_at,
  u.updated_at
FROM users u
LEFT JOIN transcriptions t ON u.id = t.user_id
GROUP BY u.id, u.username, u.first_name, u.last_name, u.is_admin, u.created_at, u.updated_at;

-- View: Transcriptions with access token info
CREATE OR REPLACE VIEW v_transcriptions_with_access AS
SELECT 
  t.id,
  t.user_id,
  t.mp3_filename,
  t.mp3_size_bytes,
  t.has_summary,
  t.created_at,
  t.updated_at,
  at.token as access_token,
  at.expires_at as token_expires_at,
  at.access_count
FROM transcriptions t
LEFT JOIN access_tokens at ON t.id = at.transcription_id;

-- ============================================
-- Seed Data: Default users
-- ============================================

-- Note: Passwords are hashed with bcrypt (cost: 12)
-- tom: MT9#Detomaso
-- micha: MT9#Schutzengel
-- test: MT9#Detomaso

-- These inserts should be run via the seed script after hashing passwords
-- Placeholder for documentation purposes only

/*
INSERT INTO users (username, password_hash, first_name, last_name, is_admin) VALUES
('tom', '$2b$12$...', 'Tom', 'Kiesewetter', TRUE),
('micha', '$2b$12$...', 'Michael', '', TRUE),
('test', '$2b$12$...', 'Test', 'User', FALSE);
*/

-- ============================================
-- Maintenance: Vacuum & Analyze
-- ============================================

-- Run periodically (can be automated with pg_cron extension)
-- VACUUM ANALYZE users;
-- VACUUM ANALYZE transcriptions;
-- VACUUM ANALYZE audit_logs;

-- ============================================
-- End of schema
-- ============================================
