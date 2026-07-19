-- Add trigger to automatically update account status when payments are processed

-- Function to handle payment processing and account status updates
CREATE OR REPLACE FUNCTION handle_payment_processing()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process completed payments
    IF NEW.payment_status = 'completed' THEN
        -- Update the account payment date and reset grace period
        PERFORM update_account_payment_date(NEW.account_id, NEW.processed_at);
        
        -- Log the payment processing
        RAISE NOTICE 'Payment processed for account %, amount: %, date: %', 
            NEW.account_id, NEW.amount, NEW.processed_at;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on payments table for INSERT and UPDATE
DROP TRIGGER IF EXISTS payment_processing_trigger ON payments;
CREATE TRIGGER payment_processing_trigger
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    WHEN (NEW.payment_status = 'completed')
    EXECUTE FUNCTION handle_payment_processing();

-- Also create a manual function to fix accounts that missed the trigger
CREATE OR REPLACE FUNCTION fix_account_after_payment(payment_id UUID)
RETURNS VOID AS $$
DECLARE
    payment_record RECORD;
BEGIN
    -- Get payment details
    SELECT account_id, processed_at, payment_status
    INTO payment_record
    FROM payments
    WHERE id = payment_id AND payment_status = 'completed';
    
    IF FOUND THEN
        -- Update account status
        PERFORM update_account_payment_date(
            payment_record.account_id, 
            COALESCE(payment_record.processed_at, NOW())
        );
        
        RAISE NOTICE 'Fixed account % for payment %', 
            payment_record.account_id, payment_id;
    ELSE
        RAISE NOTICE 'Payment % not found or not completed', payment_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to fix all accounts with recent completed payments
CREATE OR REPLACE FUNCTION fix_all_recent_payments()
RETURNS INTEGER AS $$
DECLARE
    payment_record RECORD;
    fixed_count INTEGER := 0;
BEGIN
    -- Process all completed payments from the last 30 days
    FOR payment_record IN 
        SELECT DISTINCT p.account_id, MAX(p.processed_at) as latest_payment
        FROM payments p
        WHERE p.payment_status = 'completed'
        AND p.processed_at >= NOW() - INTERVAL '30 days'
        GROUP BY p.account_id
    LOOP
        -- Update account status for each account
        PERFORM update_account_payment_date(
            payment_record.account_id, 
            payment_record.latest_payment
        );
        
        fixed_count := fixed_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Fixed % accounts with recent payments', fixed_count;
    RETURN fixed_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION handle_payment_processing() IS 'Automatically updates account status when payments are completed';
COMMENT ON FUNCTION fix_account_after_payment(UUID) IS 'Manually fix account status for a specific payment';
COMMENT ON FUNCTION fix_all_recent_payments() IS 'Fix all accounts with recent completed payments';