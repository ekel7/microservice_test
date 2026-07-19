# Migration Guide

This guide covers migrating from a single-tenant to multi-tenant architecture and general migration procedures for the Tennis Court Rental App.

## 🔄 Single-Tenant to Multi-Tenant Migration

### Pre-Migration Checklist

- [ ] **Backup your database** - Create a complete backup
- [ ] **Test environment** - Set up a testing environment with a copy of production data
- [ ] **Downtime planning** - Plan for brief application downtime during migration
- [ ] **Rollback plan** - Prepare rollback procedures in case of issues
- [ ] **User communication** - Notify users of scheduled maintenance

### Migration Overview

The migration process:
1. Adds the `accounts` table
2. Creates a "Default Account" for existing data
3. Adds `account_id` columns to all existing tables
4. Updates existing data to reference the default account
5. Applies account-scoped unique constraints
6. Enables Row Level Security (RLS)

### Step-by-Step Migration

#### 1. Database Backup
```bash
# Create a complete backup
pg_dump your_database_name > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
pg_restore --list backup_*.sql
```

#### 2. Stop Application Services
```bash
# Stop your application to prevent data changes during migration
sudo systemctl stop your-app-service
# or
docker-compose down
```

#### 3. Run Migration Script
```bash
# Run the migration script
psql -d your_database_name < database/migration_add_accounts.sql

# Check for errors
echo $? # Should return 0 for success
```

#### 4. Verify Migration
```sql
-- Connect to your database and run verification queries

-- 1. Check that accounts table was created
SELECT * FROM accounts;

-- 2. Verify all tables have account_id column
SELECT table_name 
FROM information_schema.columns 
WHERE column_name = 'account_id' 
AND table_schema = 'public';

-- 3. Check data integrity
SELECT 
    a.name as account_name,
    COUNT(DISTINCT u.id) as users_count,
    COUNT(DISTINCT c.id) as clients_count,
    COUNT(DISTINCT co.id) as courts_count,
    COUNT(DISTINCT r.id) as rentals_count
FROM accounts a
LEFT JOIN users u ON a.id = u.account_id
LEFT JOIN clients c ON a.id = c.account_id
LEFT JOIN courts co ON a.id = co.account_id
LEFT JOIN rentals r ON a.id = r.account_id
GROUP BY a.id, a.name;

-- 4. Verify no orphaned records
SELECT 'users' as table_name, COUNT(*) as orphaned_count
FROM users WHERE account_id IS NULL
UNION ALL
SELECT 'clients', COUNT(*) FROM clients WHERE account_id IS NULL
UNION ALL
SELECT 'courts', COUNT(*) FROM courts WHERE account_id IS NULL
UNION ALL
SELECT 'rentals', COUNT(*) FROM rentals WHERE account_id IS NULL;
```

#### 5. Update Application Configuration
Update your application to use the new multi-tenant API:

```javascript
// Update JWT token generation to include account context
const generateToken = (user) => {
  return jwt.sign({
    userId: user.id,
    email: user.email,
    role: user.role,
    account_id: user.account_id,        // New field
    account_slug: user.account.slug     // New field
  }, process.env.JWT_SECRET);
};
```

#### 6. Test Application
```bash
# Start your application
sudo systemctl start your-app-service
# or
docker-compose up -d

# Test basic functionality
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"existing@user.com","password":"password"}'

# Test data access
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/clients
```

### Migration Script Details

#### Complete Migration Script
```sql
-- File: database/migration_add_accounts.sql
BEGIN;

-- Step 1: Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    settings JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{"max_courts": 10, "max_users": 50}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create default account for existing data
INSERT INTO accounts (name, slug, settings) 
VALUES (
    'Default Account', 
    'default-account',
    '{"migrated_from_single_tenant": true}'
) ON CONFLICT (slug) DO NOTHING;

-- Step 3: Add account_id columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS account_id UUID;

-- Step 4: Populate account_id for existing data
UPDATE users 
SET account_id = (SELECT id FROM accounts WHERE slug = 'default-account')
WHERE account_id IS NULL;

UPDATE clients 
SET account_id = (SELECT id FROM accounts WHERE slug = 'default-account')
WHERE account_id IS NULL;

UPDATE courts 
SET account_id = (SELECT id FROM accounts WHERE slug = 'default-account')
WHERE account_id IS NULL;

UPDATE rentals 
SET account_id = (SELECT id FROM accounts WHERE slug = 'default-account')
WHERE account_id IS NULL;

-- Step 5: Add NOT NULL constraints
ALTER TABLE users ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE clients ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE courts ALTER COLUMN account_id SET NOT NULL;
ALTER TABLE rentals ALTER COLUMN account_id SET NOT NULL;

-- Step 6: Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT users_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE clients ADD CONSTRAINT clients_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE courts ADD CONSTRAINT courts_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
ALTER TABLE rentals ADD CONSTRAINT rentals_account_id_fkey 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

-- Step 7: Update unique constraints to be account-scoped
-- Users email constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users ADD CONSTRAINT users_account_email_unique 
    UNIQUE (account_id, email);

-- Clients email constraint
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_email_key;
ALTER TABLE clients ADD CONSTRAINT clients_account_email_unique 
    UNIQUE (account_id, email);

-- Clients membership number constraint
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_membership_number_key;
ALTER TABLE clients ADD CONSTRAINT clients_account_membership_unique 
    UNIQUE (account_id, membership_number);

-- Courts name constraint
ALTER TABLE courts DROP CONSTRAINT IF EXISTS courts_name_key;
ALTER TABLE courts ADD CONSTRAINT courts_account_name_unique 
    UNIQUE (account_id, name);

-- Step 8: Update rental overlap constraint
ALTER TABLE rentals DROP CONSTRAINT IF EXISTS no_overlapping_rentals;
ALTER TABLE rentals ADD CONSTRAINT no_overlapping_rentals 
    EXCLUDE USING gist (
        account_id WITH =,
        court_id WITH =, 
        tstzrange(start_datetime, end_datetime) WITH &&
    ) WHERE (status != 'cancelled');

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_account_id ON users(account_id);
CREATE INDEX IF NOT EXISTS idx_clients_account_id ON clients(account_id);
CREATE INDEX IF NOT EXISTS idx_courts_account_id ON courts(account_id);
CREATE INDEX IF NOT EXISTS idx_rentals_account_id ON rentals(account_id);

-- Step 10: Enable Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

-- Step 11: Create RLS policies
-- Users policies
CREATE POLICY users_account_isolation_policy ON users
    FOR ALL USING (account_id = (
        SELECT u.account_id FROM users u WHERE u.id = auth.uid()
    ));

CREATE POLICY users_insert_policy ON users
    FOR INSERT WITH CHECK (true);

-- Clients policies
CREATE POLICY clients_account_isolation_policy ON clients
    FOR ALL USING (account_id = (
        SELECT u.account_id FROM users u WHERE u.id = auth.uid()
    ));

-- Courts policies
CREATE POLICY courts_account_isolation_policy ON courts
    FOR ALL USING (account_id = (
        SELECT u.account_id FROM users u WHERE u.id = auth.uid()
    ));

-- Rentals policies
CREATE POLICY rentals_account_isolation_policy ON rentals
    FOR ALL USING (account_id = (
        SELECT u.account_id FROM users u WHERE u.id = auth.uid()
    ));

-- Accounts policies
CREATE POLICY accounts_user_access_policy ON accounts
    FOR ALL USING (id = (
        SELECT u.account_id FROM users u WHERE u.id = auth.uid()
    ));

COMMIT;
```

## 🔄 Data Migration Between Accounts

### Moving Data Between Accounts
Sometimes you may need to move data from one account to another:

```sql
-- Example: Move a client from one account to another
UPDATE clients 
SET account_id = 'new-account-uuid'
WHERE id = 'client-uuid' 
AND account_id = 'old-account-uuid';

-- Move all related rentals
UPDATE rentals 
SET account_id = 'new-account-uuid'
WHERE client_id = 'client-uuid';
```

### Bulk Account Migration
```sql
-- Create a new account for migration
INSERT INTO accounts (name, slug) 
VALUES ('Migrated Account', 'migrated-account');

-- Move specific data to new account
WITH new_account AS (
    SELECT id FROM accounts WHERE slug = 'migrated-account'
)
UPDATE users 
SET account_id = (SELECT id FROM new_account)
WHERE email IN ('user1@example.com', 'user2@example.com');
```

## 🚨 Rollback Procedures

### Emergency Rollback
If the migration fails and you need to rollback:

```sql
-- Remove multi-tenant structures (BE VERY CAREFUL)
BEGIN;

-- Disable RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE courts DISABLE ROW LEVEL SECURITY;
ALTER TABLE rentals DISABLE ROW LEVEL SECURITY;

-- Drop RLS policies
DROP POLICY IF EXISTS users_account_isolation_policy ON users;
DROP POLICY IF EXISTS clients_account_isolation_policy ON clients;
DROP POLICY IF EXISTS courts_account_isolation_policy ON courts;
DROP POLICY IF EXISTS rentals_account_isolation_policy ON rentals;

-- Remove foreign key constraints
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_id_fkey;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_account_id_fkey;
ALTER TABLE courts DROP CONSTRAINT IF EXISTS courts_account_id_fkey;
ALTER TABLE rentals DROP CONSTRAINT IF EXISTS rentals_account_id_fkey;

-- Remove account_id columns
ALTER TABLE users DROP COLUMN IF EXISTS account_id;
ALTER TABLE clients DROP COLUMN IF EXISTS account_id;
ALTER TABLE courts DROP COLUMN IF EXISTS account_id;
ALTER TABLE rentals DROP COLUMN IF EXISTS account_id;

-- Restore original unique constraints
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE clients ADD CONSTRAINT clients_email_key UNIQUE (email);
-- Add others as needed...

-- Drop accounts table
DROP TABLE IF EXISTS accounts;

COMMIT;
```

### Restore from Backup
If rollback scripts don't work:

```bash
# Stop application
sudo systemctl stop your-app-service

# Restore from backup
pg_restore --clean --if-exists --no-owner --no-privileges \
  -d your_database_name backup_file.sql

# Start application
sudo systemctl start your-app-service
```

## 🧪 Testing Migration

### Pre-Migration Testing
1. **Clone Production Database**:
   ```bash
   pg_dump production_db | psql test_migration_db
   ```

2. **Run Migration on Test Database**:
   ```bash
   psql test_migration_db < database/migration_add_accounts.sql
   ```

3. **Verify Data Integrity**:
   ```sql
   -- Compare row counts before and after
   SELECT 'users' as table_name, COUNT(*) as count FROM users
   UNION ALL
   SELECT 'clients', COUNT(*) FROM clients
   UNION ALL
   SELECT 'courts', COUNT(*) FROM courts
   UNION ALL
   SELECT 'rentals', COUNT(*) FROM rentals;
   ```

### Post-Migration Testing
1. **Login Test**: Verify existing users can still log in
2. **Data Access Test**: Check that all data is accessible
3. **Multi-Tenancy Test**: Create a new account and verify isolation
4. **API Test**: Test all API endpoints with existing and new accounts

## 📊 Migration Monitoring

### Migration Progress Tracking
```sql
-- Create a migration log table
CREATE TABLE migration_log (
    id SERIAL PRIMARY KEY,
    step VARCHAR(100),
    status VARCHAR(20),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Log migration steps
INSERT INTO migration_log (step, status, message) 
VALUES ('create_accounts_table', 'completed', 'Accounts table created successfully');
```

### Performance Monitoring
Monitor database performance during and after migration:
```sql
-- Check query performance
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Monitor table sizes
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables 
WHERE schemaname = 'public';
```

## 🔧 Troubleshooting Migration Issues

### Common Migration Problems

#### Foreign Key Constraint Errors
```sql
-- If FK constraints fail, check for orphaned records
SELECT u.* FROM users u 
LEFT JOIN accounts a ON u.account_id = a.id 
WHERE a.id IS NULL;
```

#### Unique Constraint Violations
```sql
-- Find duplicate emails within the same account
SELECT account_id, email, COUNT(*) 
FROM users 
GROUP BY account_id, email 
HAVING COUNT(*) > 1;
```

#### RLS Policy Issues
```sql
-- Test RLS policies
SET row_security = on;
SET ROLE 'test_user';
SELECT * FROM clients; -- Should only show account-specific data
RESET ROLE;
```

### Migration Recovery Steps

1. **Identify the Issue**: Check PostgreSQL logs and error messages
2. **Isolate the Problem**: Test queries on a copy of the data
3. **Fix Data Issues**: Clean up inconsistent data
4. **Retry Migration**: Run the migration script again
5. **Verify Results**: Run all verification queries

## 📝 Migration Best Practices

1. **Always backup** before migration
2. **Test thoroughly** on non-production data
3. **Plan for downtime** during the migration window
4. **Monitor performance** after migration
5. **Have a rollback plan** ready
6. **Communicate** with users about the maintenance
7. **Verify data integrity** after migration
8. **Update documentation** to reflect changes

## 📞 Getting Help

If you encounter issues during migration:
1. Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Review PostgreSQL logs for specific error messages
3. Ensure you have proper database permissions
4. Verify all prerequisites are met
5. Test the migration on a copy of your data first

For complex migration scenarios or if you need assistance, consider consulting with a database expert or the project maintainers.
