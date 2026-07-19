-- Migration to add establishment hours to platform_settings
-- Date: 2025-08-28
-- Purpose: Add start_time and end_time fields to control agenda view time range

-- Add establishment hours columns
ALTER TABLE platform_settings
ADD COLUMN IF NOT EXISTS start_time TIME NOT NULL DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS end_time TIME NOT NULL DEFAULT '22:00:00';

-- Add comments for documentation
COMMENT ON COLUMN platform_settings.start_time IS 'Establishment opening time (24h format)';
COMMENT ON COLUMN platform_settings.end_time IS 'Establishment closing time (24h format)';

-- Update existing records to have default values if they don't have them
UPDATE platform_settings
SET
    start_time = '08:00:00',
    end_time = '22:00:00'
WHERE start_time IS NULL OR end_time IS NULL;
