-- Migration script to add multi-tenancy support
-- Run this script on existing databases to add account segregation

-- Create the accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('active', 'suspended', 'trial')),
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    max_courts INTEGER DEFAULT 5,
    max_users INTEGER DEFAULT 10,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create default account for existing data
INSERT INTO accounts (name, slug, status, subscription_plan) 
VALUES ('Default Account', 'default', 'active', 'premium')
ON CONFLICT (slug) DO NOTHING;

-- Get the default account ID
DO $$
DECLARE
    default_account_id UUID;
BEGIN
    SELECT id INTO default_account_id FROM accounts WHERE slug = 'default';
    
    -- Add account_id column to existing tables
    ALTER TABLE users ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;
    ALTER TABLE clients ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;
    ALTER TABLE courts ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;
    ALTER TABLE rentals ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;
    
    -- Update existing records to belong to the default account
    UPDATE users SET account_id = default_account_id WHERE account_id IS NULL;
    UPDATE clients SET account_id = default_account_id WHERE account_id IS NULL;
    UPDATE courts SET account_id = default_account_id WHERE account_id IS NULL;
    UPDATE rentals SET account_id = default_account_id WHERE account_id IS NULL;
    
    -- Make account_id NOT NULL after data migration
    ALTER TABLE users ALTER COLUMN account_id SET NOT NULL;
    ALTER TABLE clients ALTER COLUMN account_id SET NOT NULL;
    ALTER TABLE courts ALTER COLUMN account_id SET NOT NULL;
    ALTER TABLE rentals ALTER COLUMN account_id SET NOT NULL;
END $$;

-- Drop the old unique constraint on users.email
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- Drop the old unique constraint on clients.email  
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_email_key;

-- Add new unique constraints that are scoped to account
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_account_email_unique') THEN
        ALTER TABLE users ADD CONSTRAINT users_account_email_unique UNIQUE(account_id, email);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_account_email_unique') THEN
        ALTER TABLE clients ADD CONSTRAINT clients_account_email_unique UNIQUE(account_id, email);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_account_membership_unique') THEN
        ALTER TABLE clients ADD CONSTRAINT clients_account_membership_unique UNIQUE(account_id, membership_number);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'courts_account_name_unique') THEN
        ALTER TABLE courts ADD CONSTRAINT courts_account_name_unique UNIQUE(account_id, name);
    END IF;
END $$;

-- Update the overlap constraint for rentals to include account_id
ALTER TABLE rentals DROP CONSTRAINT IF EXISTS no_overlapping_rentals;
ALTER TABLE rentals ADD CONSTRAINT no_overlapping_rentals EXCLUDE USING gist (
    account_id WITH =,
    court_id WITH =,
    tstzrange(start_datetime, end_datetime) WITH &&
) WHERE (status != 'cancelled');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_accounts_slug ON accounts(slug);
CREATE INDEX IF NOT EXISTS idx_users_account_id ON users(account_id);
CREATE INDEX IF NOT EXISTS idx_users_email_account ON users(account_id, email);
CREATE INDEX IF NOT EXISTS idx_clients_account_id ON clients(account_id);
CREATE INDEX IF NOT EXISTS idx_clients_email_account ON clients(account_id, email);
CREATE INDEX IF NOT EXISTS idx_courts_account_id ON courts(account_id);
CREATE INDEX IF NOT EXISTS idx_rentals_account_id ON rentals(account_id);

-- Add trigger for accounts updated_at
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on accounts table
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Update RLS policies to include account isolation
DROP POLICY IF EXISTS account_isolation_policy ON accounts;
DROP POLICY IF EXISTS users_account_isolation_policy ON users;
DROP POLICY IF EXISTS clients_account_isolation_policy ON clients;
DROP POLICY IF EXISTS courts_account_isolation_policy ON courts;
DROP POLICY IF EXISTS rentals_account_isolation_policy ON rentals;

-- Note: RLS policies should be configured based on your authentication system
-- The policies in the main schema.sql are examples and may need adjustment
-- for your specific Supabase setup

COMMIT;
