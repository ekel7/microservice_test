-- Super Admin Migration
-- This migration adds super admin functionality for administration panel

-- Create custom types for admin system
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('credit_card', 'bank_transfer', 'cash', 'check');
    END IF;
END $$;

-- Super Admins table (independent of tenant accounts)
CREATE TABLE IF NOT EXISTS super_admins (
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
CREATE TABLE IF NOT EXISTS payments (
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
CREATE TABLE IF NOT EXISTS admin_logs (
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
CREATE INDEX IF NOT EXISTS idx_payments_account_id ON payments(account_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_super_admin_id ON admin_logs(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);

-- Create default super admin (password: admin123 - should be changed immediately)
-- Password hash for 'admin123' using bcrypt with salt rounds 10
INSERT INTO super_admins (username, email, password_hash, full_name)
VALUES (
    'admin',
    'admin@system.local',
    '$2b$10$K7Z3LZ9mZHYzpOaX1K4qC.JX7K1qZQVGZR5XlWX2OXGz3lYXNJYcG', -- admin123
    'System Administrator'
)
ON CONFLICT (username) DO NOTHING;
