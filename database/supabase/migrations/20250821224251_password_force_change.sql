-- Migration: Add force_password_change column to users table
-- This column tracks when a user must change their password (e.g., after admin reset)

-- Add the force_password_change column
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;

-- Add a comment to document the purpose
COMMENT ON COLUMN users.force_password_change IS 'Indicates if the user must change their password before continuing to use the system';