-- Payment limits and grace period system migration
-- Adds grace period functionality for trial, basic, and premium accounts

-- Add new columns to accounts table for grace period tracking
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS grace_period_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS grace_period_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS payment_due_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- Update the status enum to include new status values
DO $$
BEGIN
    -- Add 'grace_period' value to account_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'grace_period' AND enumtypid = 'account_status'::regtype) THEN
        ALTER TYPE account_status ADD VALUE 'grace_period';
    END IF;

    -- Add 'locked' value to account_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'locked' AND enumtypid = 'account_status'::regtype) THEN
        ALTER TYPE account_status ADD VALUE 'locked';
    END IF;
END $$;

-- Drop the old check constraint if it exists (from non-enum version)
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_status_check;

-- Index for efficient grace period queries
CREATE INDEX IF NOT EXISTS idx_accounts_grace_period ON accounts(grace_period_end_date, is_locked);
CREATE INDEX IF NOT EXISTS idx_accounts_payment_due ON accounts(payment_due_date, subscription_plan);

-- Function to calculate grace period dates based on account type
CREATE OR REPLACE FUNCTION calculate_grace_period_dates(
    account_subscription_plan VARCHAR(50),
    account_created_at TIMESTAMP WITH TIME ZONE,
    last_payment TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(
    grace_start TIMESTAMP WITH TIME ZONE,
    grace_end TIMESTAMP WITH TIME ZONE,
    payment_due TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    CASE account_subscription_plan
        WHEN 'trial' THEN
            -- Trial: 5 days grace period after creation
            RETURN QUERY SELECT 
                account_created_at AS grace_start,
                account_created_at + INTERVAL '5 days' AS grace_end,
                account_created_at + INTERVAL '5 days' AS payment_due;
        WHEN 'basic', 'premium' THEN
            -- Basic/Premium: 5 days grace period after payment due date
            DECLARE
                payment_ref_date TIMESTAMP WITH TIME ZONE;
            BEGIN
                payment_ref_date := COALESCE(last_payment, account_created_at);
                RETURN QUERY SELECT 
                    payment_ref_date + INTERVAL '30 days' AS grace_start,
                    payment_ref_date + INTERVAL '35 days' AS grace_end,
                    payment_ref_date + INTERVAL '30 days' AS payment_due;
            END;
        ELSE
            -- Default case
            RETURN QUERY SELECT 
                account_created_at AS grace_start,
                account_created_at + INTERVAL '5 days' AS grace_end,
                account_created_at + INTERVAL '5 days' AS payment_due;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to check and update account status based on grace period
CREATE OR REPLACE FUNCTION check_account_grace_period_status()
RETURNS TRIGGER AS $$
DECLARE
    grace_dates RECORD;
BEGIN
    -- Calculate grace period dates for the account
    SELECT * INTO grace_dates 
    FROM calculate_grace_period_dates(NEW.subscription_plan, NEW.created_at, NEW.last_payment_date);
    
    -- Update grace period dates
    NEW.grace_period_start_date := grace_dates.grace_start;
    NEW.grace_period_end_date := grace_dates.grace_end;
    NEW.payment_due_date := grace_dates.payment_due;
    
    -- Update account status based on current date and subscription plan
    IF NEW.subscription_plan = 'trial' THEN
        -- For trial accounts: grace period starts immediately, ends after 5 days
        IF NOW() > grace_dates.grace_end THEN
            NEW.status := 'locked';
            NEW.is_locked := true;
        ELSE
            NEW.status := 'trial';
            NEW.is_locked := false;
        END IF;
    ELSE
        -- For basic/premium accounts: payment due after 30 days, grace period is 5 days after that
        IF NOW() > grace_dates.grace_end THEN
            -- Grace period expired, lock account
            NEW.status := 'locked';
            NEW.is_locked := true;
        ELSIF NOW() > grace_dates.payment_due THEN
            -- Payment is overdue but still in grace period
            NEW.status := 'grace_period';
            NEW.is_locked := false;
        ELSE
            -- Account is current (payment not yet due)
            NEW.status := 'active';
            NEW.is_locked := false;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update grace period status
DROP TRIGGER IF EXISTS update_account_grace_period_status ON accounts;
CREATE TRIGGER update_account_grace_period_status 
    BEFORE INSERT OR UPDATE ON accounts
    FOR EACH ROW 
    EXECUTE FUNCTION check_account_grace_period_status();

-- Function to update payment date and reset grace period
CREATE OR REPLACE FUNCTION update_account_payment_date(account_id UUID, payment_date TIMESTAMP WITH TIME ZONE)
RETURNS VOID AS $$
BEGIN
    -- Update the payment date and let the trigger handle status and grace period calculation
    UPDATE accounts 
    SET 
        last_payment_date = payment_date,
        is_locked = false,
        updated_at = NOW()
    WHERE id = account_id;
    
    -- Force trigger to recalculate by doing another update
    UPDATE accounts 
    SET updated_at = NOW()
    WHERE id = account_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get accounts in grace period or overdue
CREATE OR REPLACE FUNCTION get_accounts_requiring_warning()
RETURNS TABLE(
    account_id UUID,
    account_name VARCHAR(255),
    subscription_plan VARCHAR(50),
    status VARCHAR(20),
    grace_period_end_date TIMESTAMP WITH TIME ZONE,
    payment_due_date TIMESTAMP WITH TIME ZONE,
    days_until_lockout INTEGER
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        a.id,
        a.name,
        a.subscription_plan,
        a.status,
        a.grace_period_end_date,
        a.payment_due_date,
        EXTRACT(DAY FROM (a.grace_period_end_date - NOW()))::INTEGER as days_until_lockout
    FROM accounts a
    WHERE 
        a.status IN ('grace_period', 'trial') 
        AND a.grace_period_end_date > NOW()
        AND NOT a.is_locked;
END;
$$ LANGUAGE plpgsql;

-- Update existing accounts to have grace period dates calculated
UPDATE accounts 
SET updated_at = NOW()  -- This will trigger the grace period calculation
WHERE grace_period_start_date IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN accounts.grace_period_start_date IS 'Date when grace period starts (trial: creation date, basic/premium: payment due date)';
COMMENT ON COLUMN accounts.grace_period_end_date IS 'Date when grace period ends and account gets locked (5 days after grace period start)';
COMMENT ON COLUMN accounts.payment_due_date IS 'Date when payment is due for the account';
COMMENT ON COLUMN accounts.last_payment_date IS 'Date of the last successful payment';
COMMENT ON COLUMN accounts.is_locked IS 'Whether the account is currently locked due to overdue payment';