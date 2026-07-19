-- Add new_status column to rental_exceptions for status-only modifications
-- This allows changing the status (pending/confirmed/completed) of a single recurring instance

-- Add new_status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rental_exceptions'
        AND column_name = 'new_status'
    ) THEN
        ALTER TABLE rental_exceptions
        ADD COLUMN new_status VARCHAR(20) CHECK (new_status IN ('pending', 'confirmed', 'cancelled', 'completed'));
    END IF;
END $$;

-- Drop old constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'modified_data_required'
        AND table_name = 'rental_exceptions'
    ) THEN
        ALTER TABLE rental_exceptions DROP CONSTRAINT modified_data_required;
    END IF;
END $$;

-- Add new constraint that allows either status change OR data change (or both)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'modified_data_check'
        AND table_name = 'rental_exceptions'
    ) THEN
        ALTER TABLE rental_exceptions
        ADD CONSTRAINT modified_data_check CHECK (
            exception_type = 'cancelled' OR
            (exception_type = 'modified' AND (
                -- Status-only modification
                new_status IS NOT NULL OR
                -- Data modification (all 4 fields required together)
                (new_start_datetime IS NOT NULL AND
                 new_end_datetime IS NOT NULL AND
                 new_court_id IS NOT NULL AND
                 new_total_amount IS NOT NULL)
            ))
        );
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN rental_exceptions.new_status IS 'For modified instances: the new status (pending/confirmed/cancelled/completed). Allows status-only changes for single occurrences.';
