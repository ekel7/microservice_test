-- Create rental_exceptions table for tracking canceled and modified recurring event instances
CREATE TABLE IF NOT EXISTS rental_exceptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    exception_type VARCHAR(20) NOT NULL CHECK (exception_type IN ('cancelled', 'modified')),

    -- For modified instances - store the new values
    new_start_datetime TIMESTAMP WITH TIME ZONE,
    new_end_datetime TIMESTAMP WITH TIME ZONE,
    new_court_id UUID REFERENCES courts(id),
    new_total_amount DECIMAL(10,2),

    -- Additional metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure only one exception per date per rental
    CONSTRAINT unique_rental_exception UNIQUE(rental_id, exception_date),

    -- Validate that modified exceptions have required data
    CONSTRAINT modified_data_required CHECK (
        exception_type != 'modified' OR (
            new_start_datetime IS NOT NULL AND
            new_end_datetime IS NOT NULL AND
            new_court_id IS NOT NULL AND
            new_total_amount IS NOT NULL
        )
    )
);

-- Add index for faster lookups
CREATE INDEX idx_rental_exceptions_rental_id ON rental_exceptions(rental_id);
CREATE INDEX idx_rental_exceptions_date ON rental_exceptions(exception_date);

-- Add comments for documentation
COMMENT ON TABLE rental_exceptions IS 'Tracks exceptions (canceled or modified instances) in recurring rental series';
COMMENT ON COLUMN rental_exceptions.exception_type IS 'Type of exception: cancelled (skip this occurrence) or modified (use custom values)';
COMMENT ON COLUMN rental_exceptions.exception_date IS 'The date of the recurring instance that is being modified or cancelled';
COMMENT ON COLUMN rental_exceptions.new_start_datetime IS 'For modified instances: the new start time';
COMMENT ON COLUMN rental_exceptions.new_end_datetime IS 'For modified instances: the new end time';
COMMENT ON COLUMN rental_exceptions.new_court_id IS 'For modified instances: the new court (if changed)';
COMMENT ON COLUMN rental_exceptions.new_total_amount IS 'For modified instances: the recalculated total amount';

-- Add RLS policies to match rentals table security
ALTER TABLE rental_exceptions ENABLE ROW LEVEL SECURITY;

-- Users can view exceptions for rentals in their account
CREATE POLICY "Users can view rental exceptions in their account"
    ON rental_exceptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM rentals r
            WHERE r.id = rental_exceptions.rental_id
            AND r.account_id IN (
                SELECT account_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Users can create exceptions for rentals in their account
CREATE POLICY "Users can create rental exceptions in their account"
    ON rental_exceptions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM rentals r
            WHERE r.id = rental_exceptions.rental_id
            AND r.account_id IN (
                SELECT account_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Users can update exceptions for rentals in their account
CREATE POLICY "Users can update rental exceptions in their account"
    ON rental_exceptions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM rentals r
            WHERE r.id = rental_exceptions.rental_id
            AND r.account_id IN (
                SELECT account_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Users can delete exceptions for rentals in their account
CREATE POLICY "Users can delete rental exceptions in their account"
    ON rental_exceptions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM rentals r
            WHERE r.id = rental_exceptions.rental_id
            AND r.account_id IN (
                SELECT account_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rental_exceptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rental_exceptions_updated_at
    BEFORE UPDATE ON rental_exceptions
    FOR EACH ROW
    EXECUTE FUNCTION update_rental_exceptions_updated_at();

-- Add series end date and recurrence pattern to rentals table
ALTER TABLE rentals
ADD COLUMN series_end_date DATE,
ADD COLUMN recurrence_pattern JSONB DEFAULT '{"frequency": "weekly", "interval": 1}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN rentals.series_end_date IS 'For recurring rentals: the date when the series should stop repeating (null = indefinite)';
COMMENT ON COLUMN rentals.recurrence_pattern IS 'JSON object defining recurrence rules. Default: {"frequency": "weekly", "interval": 1}';

-- Add check constraint to ensure series_end_date is only set for recurring rentals
ALTER TABLE rentals
ADD CONSTRAINT series_end_date_requires_recurring CHECK (
    (is_recurring = FALSE AND series_end_date IS NULL) OR
    (is_recurring = TRUE)
);
