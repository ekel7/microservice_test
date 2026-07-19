# Database Schema and Migration Guide

## 📊 Database Overview

The Tennis Court Rental App uses PostgreSQL (via Supabase) with a multi-tenant architecture. Each table includes an `account_id` field to ensure complete data isolation between different organizations.

## 🏗️ Schema Structure

### Core Tables

#### Accounts Table
```sql
CREATE TABLE accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    settings JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{"max_courts": 10, "max_users": 5}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Users Table
```sql
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, email)
);
```

#### Clients Table
```sql
CREATE TABLE clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    membership_number VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, email),
    UNIQUE(account_id, membership_number)
);
```

#### Courts Table
```sql
CREATE TABLE courts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    surface_type VARCHAR(50),
    hourly_rate DECIMAL(10,2) DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, name)
);
```

#### Rentals Table
```sql
CREATE TABLE rentals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    court_id UUID NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    total_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent overlapping rentals per account
    CONSTRAINT no_overlapping_rentals EXCLUDE USING gist (
        account_id WITH =,
        court_id WITH =, 
        tstzrange(start_datetime, end_datetime) WITH &&
    ) WHERE (status != 'cancelled')
);
```

## 🔒 Row Level Security (RLS)

### Enabling RLS
```sql
-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
```

### RLS Policies

#### Users Table Policies
```sql
-- Users can only see users from their account
CREATE POLICY users_account_isolation_policy ON users
    FOR ALL USING (account_id = (
        SELECT u.account_id FROM users u WHERE u.id = auth.uid()
    ));

-- Allow insert for new account setup
CREATE POLICY users_insert_policy ON users
    FOR INSERT WITH CHECK (true);
```

#### Clients Table Policies
```sql
CREATE POLICY clients_account_isolation_policy ON clients
    FOR ALL USING (account_id = (
        SELECT u.account_id FROM users u WHERE u.id = auth.uid()
    ));
```

#### Courts Table Policies
```sql
CREATE POLICY courts_account_isolation_policy ON courts
    FOR ALL USING (account_id = (
        SELECT u.account_id FROM users u WHERE u.id = auth.uid()
    ));
```

#### Rentals Table Policies
```sql
CREATE POLICY rentals_account_isolation_policy ON rentals
    FOR ALL USING (account_id = (
        SELECT u.account_id FROM users u WHERE u.id = auth.uid()
    ));
```

## 📁 Migration Files

### Migration from Single-Tenant

#### File: `database/migration_add_accounts.sql`
```sql
-- Migration script for existing single-tenant installations
BEGIN;

-- 1. Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    settings JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{"max_courts": 10, "max_users": 5}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create default account for existing data
INSERT INTO accounts (name, slug) 
VALUES ('Default Account', 'default-account');

-- 3. Add account_id columns to existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS account_id UUID;

-- 4. Update existing data with default account
UPDATE users SET account_id = (SELECT id FROM accounts WHERE slug = 'default-account') WHERE account_id IS NULL;
UPDATE clients SET account_id = (SELECT id FROM accounts WHERE slug = 'default-account') WHERE account_id IS NULL;
UPDATE courts SET account_id = (SELECT id FROM accounts WHERE slug = 'default-account') WHERE account_id IS NULL;
UPDATE rentals SET account_id = (SELECT id FROM accounts WHERE slug = 'default-account') WHERE account_id IS NULL;

-- 5. Add NOT NULL constraints
ALTER TABLE users ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE clients ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE courts ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE rentals ALTER COLUMN account_id SET NOT NULL;

-- 6. Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT users_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE clients ADD CONSTRAINT clients_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE courts ADD CONSTRAINT courts_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE rentals ADD CONSTRAINT rentals_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- 7. Update unique constraints to be account-scoped
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users ADD CONSTRAINT users_account_email_unique 
    UNIQUE (account_id, email);

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_email_key;
ALTER TABLE clients ADD CONSTRAINT clients_account_email_unique 
    UNIQUE (account_id, email);

ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_membership_number_key;
ALTER TABLE clients ADD CONSTRAINT clients_account_membership_unique 
    UNIQUE (account_id, membership_number);

ALTER TABLE courts DROP CONSTRAINT IF EXISTS courts_name_key;
ALTER TABLE courts ADD CONSTRAINT courts_account_name_unique 
    UNIQUE (account_id, name);

COMMIT;
```

## 🔧 Database Functions

### Account Context Function
```sql
-- Function to get current user's account_id
CREATE OR REPLACE FUNCTION get_current_account_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT u.account_id 
        FROM users u 
        WHERE u.id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Rental Overlap Check Function
```sql
-- Function to check for rental overlaps
CREATE OR REPLACE FUNCTION check_rental_overlap(
    p_account_id UUID,
    p_court_id UUID,
    p_start_datetime TIMESTAMPTZ,
    p_end_datetime TIMESTAMPTZ,
    p_exclude_rental_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM rentals r
        WHERE r.account_id = p_account_id
        AND r.court_id = p_court_id
        AND r.status != 'cancelled'
        AND (p_exclude_rental_id IS NULL OR r.id != p_exclude_rental_id)
        AND tstzrange(r.start_datetime, r.end_datetime) && 
            tstzrange(p_start_datetime, p_end_datetime)
    );
END;
$$ LANGUAGE plpgsql;
```

## 📈 Indexes for Performance

### Core Indexes
```sql
-- Account-based indexes for fast filtering
CREATE INDEX idx_users_account_id ON users(account_id);
CREATE INDEX idx_clients_account_id ON clients(account_id);
CREATE INDEX idx_courts_account_id ON courts(account_id);
CREATE INDEX idx_rentals_account_id ON rentals(account_id);

-- Composite indexes for common queries
CREATE INDEX idx_rentals_account_court_datetime ON rentals(account_id, court_id, start_datetime);
CREATE INDEX idx_rentals_account_client ON rentals(account_id, client_id);
CREATE INDEX idx_clients_account_email ON clients(account_id, email);
```

### GiST Index for Rental Overlaps
```sql
-- Enable btree_gist extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Index for efficient overlap checking
CREATE INDEX idx_rentals_overlap ON rentals 
USING gist (account_id, court_id, tstzrange(start_datetime, end_datetime))
WHERE status != 'cancelled';
```

## 🔄 Migration Scripts

### New Installation
For new installations, use `database/schema.sql` which includes the complete multi-tenant schema.

### Existing Installation Migration
For existing single-tenant installations:

1. **Backup your database**:
   ```bash
   pg_dump your_database > backup_before_migration.sql
   ```

2. **Run migration**:
   ```bash
   psql -d your_database < database/migration_add_accounts.sql
   ```

3. **Verify migration**:
   ```sql
   -- Check that all tables have account_id
   SELECT table_name 
   FROM information_schema.columns 
   WHERE column_name = 'account_id';
   
   -- Check data integrity
   SELECT a.name, COUNT(u.id) as users_count
   FROM accounts a
   LEFT JOIN users u ON a.id = u.account_id
   GROUP BY a.id, a.name;
   ```

## 🧪 Sample Data

### Development Sample Data
```sql
-- Insert sample accounts for development
INSERT INTO accounts (name, slug) VALUES 
    ('Tennis Club Alpha', 'tennis-club-alpha'),
    ('Tennis Club Beta', 'tennis-club-beta');

-- Sample users (passwords should be hashed in real implementation)
INSERT INTO users (account_id, email, password_hash, full_name, role) VALUES 
    ((SELECT id FROM accounts WHERE slug = 'tennis-club-alpha'), 
     'admin@alpha.com', '$2b$10$...', 'Alpha Admin', 'admin'),
    ((SELECT id FROM accounts WHERE slug = 'tennis-club-beta'), 
     'admin@beta.com', '$2b$10$...', 'Beta Admin', 'admin');
```

## 🔍 Database Maintenance

### Regular Maintenance Queries
```sql
-- Check account data distribution
SELECT 
    a.name as account_name,
    COUNT(DISTINCT u.id) as users,
    COUNT(DISTINCT c.id) as clients,
    COUNT(DISTINCT co.id) as courts,
    COUNT(DISTINCT r.id) as rentals
FROM accounts a
LEFT JOIN users u ON a.id = u.account_id
LEFT JOIN clients c ON a.id = c.account_id
LEFT JOIN courts co ON a.id = co.account_id
LEFT JOIN rentals r ON a.id = r.account_id
GROUP BY a.id, a.name
ORDER BY a.name;

-- Check for orphaned records
SELECT 'orphaned_users' as issue, COUNT(*) as count
FROM users WHERE account_id NOT IN (SELECT id FROM accounts)
UNION ALL
SELECT 'orphaned_clients', COUNT(*)
FROM clients WHERE account_id NOT IN (SELECT id FROM accounts);
```

### Cleanup Queries
```sql
-- Remove cancelled rentals older than 1 year
DELETE FROM rentals 
WHERE status = 'cancelled' 
AND created_at < NOW() - INTERVAL '1 year';

-- Update account statistics
UPDATE accounts 
SET settings = jsonb_set(
    settings, 
    '{stats}', 
    jsonb_build_object(
        'last_updated', NOW(),
        'total_rentals', (
            SELECT COUNT(*) FROM rentals WHERE account_id = accounts.id
        )
    )
);
```

## 🚨 Troubleshooting Database Issues

### Common Database Problems

1. **RLS Policy Issues**: If users can't see their data, check RLS policies
2. **Constraint Violations**: Remember constraints are account-scoped
3. **Migration Failures**: Ensure proper sequence and dependencies
4. **Performance Issues**: Check indexes and query patterns

For detailed troubleshooting, see the [Troubleshooting Guide](./TROUBLESHOOTING.md).

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL GIST Indexes](https://www.postgresql.org/docs/current/gist.html)
- [Multi-Tenancy Patterns](https://docs.microsoft.com/en-us/azure/sql-database/saas-tenancy-app-design-patterns)
