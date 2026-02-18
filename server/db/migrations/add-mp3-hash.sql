-- Migration: Add mp3_hash column to transcriptions table
-- Date: 2026-02-18
-- Purpose: Store SHA-256 hash of MP3 file to detect duplicates and prevent unnecessary updates

ALTER TABLE transcriptions
ADD COLUMN IF NOT EXISTS mp3_hash VARCHAR(64);

-- Add comment
COMMENT ON COLUMN transcriptions.mp3_hash IS 'SHA-256 hash of MP3 file (64 hex characters) - used to detect if MP3 data has changed';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_transcriptions_mp3_hash ON transcriptions(mp3_hash);
