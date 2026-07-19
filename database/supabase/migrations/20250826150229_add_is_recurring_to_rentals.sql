-- Add is_recurring column to rentals table
ALTER TABLE rentals
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN rentals.is_recurring IS 'Indicates if this rental repeats weekly on the same day';
