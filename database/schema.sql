-- Tennis Court Rental App Database Schema
CREATE EXTENSION btree_gist;

-- Enable RLS (Row Level Security)
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'employee');
CREATE TYPE rental_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE court_status AS ENUM ('available', 'maintenance', 'unavailable');
CREATE TYPE account_status AS ENUM ('active', 'suspended', 'trial');

-- Accounts table (multi-tenancy)
CREATE TABLE accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- for subdomain/routing
    status account_status DEFAULT 'trial',
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    max_courts INTEGER DEFAULT 5,
    max_users INTEGER DEFAULT 10,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (admin, employee)
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    force_password_change BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique email per account (allows same email across different accounts)
    UNIQUE(account_id, email)
);

-- Clients table (customers who make reservations)
CREATE TABLE clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    date_of_birth DATE,
    membership_number VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique email per account
    UNIQUE(account_id, email),
    -- Unique membership number per account
    UNIQUE(account_id, membership_number)
);

-- Tennis courts table
CREATE TABLE courts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    hourly_rate DECIMAL(10,2) NOT NULL,
    status court_status DEFAULT 'available',
    surface_type VARCHAR(50), -- clay, grass, hard, synthetic
    is_covered BOOLEAN DEFAULT false,
    max_capacity INTEGER DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique court name per account
    UNIQUE(account_id, name)
);

-- Rentals table
CREATE TABLE rentals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- who processed the rental
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status rental_status DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure no overlapping rentals for the same court within the same account
    CONSTRAINT no_overlapping_rentals EXCLUDE USING gist (
        account_id WITH =,
        court_id WITH =,
        tstzrange(start_datetime, end_datetime) WITH &&
    ) WHERE (status != 'cancelled')
);

-- Indexes for better performance
CREATE INDEX idx_accounts_slug ON accounts(slug);
CREATE INDEX idx_users_account_id ON users(account_id);
CREATE INDEX idx_users_email_account ON users(account_id, email);
CREATE INDEX idx_clients_account_id ON clients(account_id);
CREATE INDEX idx_clients_email_account ON clients(account_id, email);
CREATE INDEX idx_courts_account_id ON courts(account_id);
CREATE INDEX idx_rentals_account_id ON rentals(account_id);
CREATE INDEX idx_rentals_datetime ON rentals(start_datetime, end_datetime);
CREATE INDEX idx_rentals_court_id ON rentals(court_id);
CREATE INDEX idx_rentals_client_id ON rentals(client_id);
CREATE INDEX idx_rentals_status ON rentals(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courts_updated_at BEFORE UPDATE ON courts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rentals_updated_at BEFORE UPDATE ON rentals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for account isolation
-- Accounts: Users can only see their own account
CREATE POLICY account_isolation_policy ON accounts
    FOR ALL USING (auth.uid()::text = (
        SELECT u.id::text FROM users u WHERE u.account_id = accounts.id AND u.id = auth.uid()
    ));

-- Users: Can only see users from their own account
CREATE POLICY users_account_isolation_policy ON users
    FOR ALL USING (account_id = (
        SELECT u.account_id FROM users u WHERE u.id = auth.uid()
    ));

-- Clients: Can only see clients from their own account
CREATE POLICY clients_account_isolation_policy ON clients
    FOR ALL USING (account_id = (
        SELECT u.account_id FROM users u WHERE u.id = auth.uid()
    ));

-- Courts: Can only see courts from their own account
CREATE POLICY courts_account_isolation_policy ON courts
    FOR ALL USING (account_id = (
        SELECT u.account_id FROM users u WHERE u.id = auth.uid()
    ));

-- Rentals: Can only see rentals from their own account
CREATE POLICY rentals_account_isolation_policy ON rentals
    FOR ALL USING (account_id = (
        SELECT u.account_id FROM users u WHERE u.id = auth.uid()
    ));

-- Sample data
-- Create sample accounts
INSERT INTO accounts (name, slug, status, subscription_plan) VALUES
('Tennis Club Demo', 'tennis-club-demo', 'active', 'premium'),
('Sports Center ABC', 'sports-center-abc', 'active', 'basic');

-- Get account IDs for sample data
WITH account_ids AS (
    SELECT id as demo_account_id FROM accounts WHERE slug = 'tennis-club-demo'
)
INSERT INTO users (account_id, email, password_hash, full_name, role, phone) 
SELECT demo_account_id, 'admin@tennisclub.com', '$2b$10$example_hash_here', 'Admin User', 'admin'::user_role, '+1234567890'
FROM account_ids
UNION ALL
SELECT demo_account_id, 'employee@tennisclub.com', '$2b$10$example_hash_here', 'Employee User', 'employee'::user_role, '+1234567891'
FROM account_ids;

WITH account_ids AS (
    SELECT id as demo_account_id FROM accounts WHERE slug = 'tennis-club-demo'
)
INSERT INTO courts (account_id, name, description, hourly_rate, surface_type, is_covered) 
SELECT demo_account_id, 'Court 1', 'Main tournament court', 25.00, 'hard', false
FROM account_ids
UNION ALL
SELECT demo_account_id, 'Court 2', 'Practice court', 20.00, 'clay', false
FROM account_ids
UNION ALL
SELECT demo_account_id, 'Court 3', 'Indoor court', 30.00, 'synthetic', true
FROM account_ids;

WITH account_ids AS (
    SELECT id as demo_account_id FROM accounts WHERE slug = 'tennis-club-demo'
)
INSERT INTO clients (account_id, full_name, email, phone, membership_number) 
SELECT demo_account_id, 'John Doe', 'john@example.com', '+1234567892', 'MEM001'
FROM account_ids
UNION ALL
SELECT demo_account_id, 'Jane Smith', 'jane@example.com', '+1234567893', 'MEM002'
FROM account_ids;

-- Super Admin tables for administration panel
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('credit_card', 'bank_transfer', 'cash', 'check');

-- Super Admins table (independent of tenant accounts)
CREATE TABLE super_admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table for tracking account payments
CREATE TABLE payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method payment_method NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    transaction_id VARCHAR(255),
    description TEXT,
    billing_period_start DATE,
    billing_period_end DATE,
    processed_by UUID REFERENCES super_admins(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin activity logs
CREATE TABLE admin_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    super_admin_id UUID NOT NULL REFERENCES super_admins(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50), -- 'account', 'user', 'payment'
    target_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_payments_account_id ON payments(account_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_admin_logs_super_admin_id ON admin_logs(super_admin_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at);
CREATE INDEX idx_admin_logs_action ON admin_logs(action);

-- Create default super admin (password: admin123 - should be changed)
INSERT INTO super_admins (username, email, password_hash, full_name) 
VALUES (
    'admin', 
    'admin@system.local', 
    '$2b$10$K7Z3LZ9mZHYzpOaX1K4qC.JX7K1qZQVGZR5XlWX2OXGz3lYXNJYcG', -- admin123
    'System Administrator'
);
