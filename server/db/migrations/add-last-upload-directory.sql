-- Migration: Add last_upload_directory column to users table
-- Date: 2026-02-18
-- Purpose: Store last used upload directory for admin users

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_upload_directory VARCHAR(500);

-- Add comment
COMMENT ON COLUMN users.last_upload_directory IS 'Last used upload directory (for admins) - stored for convenience';
