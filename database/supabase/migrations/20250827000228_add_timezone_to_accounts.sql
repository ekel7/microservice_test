-- Migration: Add timezone field to accounts table
-- File: add_timezone_to_accounts.sql

-- Add timezone column to accounts table
ALTER TABLE accounts
ADD COLUMN timezone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires';

-- Add a comment to document the field
COMMENT ON COLUMN accounts.timezone IS 'IANA timezone identifier for the account (e.g., America/Argentina/Buenos_Aires, America/New_York, etc.)';

-- Create an index for better performance if needed
CREATE INDEX idx_accounts_timezone ON accounts(timezone);

-- Update any existing accounts to have the default timezone
UPDATE accounts
SET timezone = 'America/Argentina/Buenos_Aires'
WHERE timezone IS NULL;

-- Add a constraint to ensure timezone is never null
ALTER TABLE accounts
ALTER COLUMN timezone SET NOT NULL;
