# Multi-Tenancy Architecture

## 🏗️ Overview

This application implements a **true multi-tenant architecture** where multiple tennis clubs or organizations can use the same application while keeping their data completely isolated. Each tenant (account) has their own set of users, clients, courts, and rentals.

## Architecture Components

### Database Schema
- **New `accounts` table**: Central table for managing different organizations
- **Account ID foreign keys**: Added to all main tables (users, clients, courts, rentals)
- **Row Level Security (RLS)**: Ensures data isolation between accounts
- **Unique constraints**: Updated to be account-scoped (e.g., emails can be reused across accounts)

### Backend Changes
- **Authentication**: JWT tokens now include account context
- **API Endpoints**: All routes now filter data by account ID automatically
- **New Routes**: Added `/api/accounts` and `/api/setup` endpoints

### Data Segregation
Each account has completely isolated:
- ✅ **Users** (admin/employee staff)
- ✅ **Clients** (customers making reservations)  
- ✅ **Courts** (tennis courts managed)
- ✅ **Rentals** (bookings and reservations)

## Account Structure

### Account Table Schema
```sql
CREATE TABLE accounts (
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
```

### Account Settings
- **Name**: Display name for the organization
- **Slug**: URL-friendly identifier (used for routing/subdomains)
- **Status**: active, suspended, or trial
- **Subscription Plan**: basic, premium, etc.
- **Limits**: Max courts, max users (configurable per plan)

## Authentication & Authorization

### User Roles per Account
- **Admin**: Full access to account management, users, courts, clients, and rentals
- **Employee**: Access to clients and rentals (cannot manage users or courts)

### JWT Token Structure
```json
{
  "userId": "uuid",
  "email": "user@example.com", 
  "role": "admin",
  "account_id": "uuid",
  "account_slug": "tennis-club-abc"
}
```

### Data Isolation Mechanisms

#### 1. Row Level Security (RLS)
Policies ensure users can only access data from their account:
```sql
-- Example policy for clients table
CREATE POLICY clients_account_isolation_policy ON clients
    FOR ALL USING (account_id = (
        SELECT u.account_id FROM users u WHERE u.id = auth.uid()
    ));
```

#### 2. Account-Scoped Unique Constraints
- User emails: unique per account
- Client emails: unique per account  
- Client membership numbers: unique per account
- Court names: unique per account

#### 3. Overlap Prevention (Account-Scoped)
Rental conflicts are prevented per account:
```sql
CONSTRAINT no_overlapping_rentals EXCLUDE USING gist (
    account_id WITH =,
    court_id WITH =, 
    tstzrange(start_datetime, end_datetime) WITH &&
) WHERE (status != 'cancelled')
```

## Multi-Tenant Data Flow

### 1. User Authentication
```
User Login → JWT with account_id → All API calls include account context
```

### 2. Database Queries
```
API Request → Middleware extracts account_id → Database query filtered by account_id
```

### 3. Data Response
```
Database → Account-filtered results → JSON response to frontend
```

## Use Cases

### Single Organization
- Use one account for your tennis club
- Manage multiple courts and staff
- Handle customer bookings

### Multi-Location Business  
- Create separate accounts for each location
- Maintain independent operations
- Centralized management possible through admin accounts

### SaaS Provider
- Offer tennis court management as a service
- Each customer gets their own isolated account
- Scalable architecture for growth

## Security Considerations

### Database Level Security
- **RLS Policies**: Automatic data filtering at database level
- **Account-scoped constraints**: Prevent data leakage
- **Audit trails**: All changes tracked per account

### Application Level Security
- **JWT account context**: All requests validated for account access
- **Middleware protection**: Account isolation enforced in code
- **API rate limiting**: Per-account rate limiting

### Network Security
- **CORS configuration**: Account-aware CORS policies
- **Environment isolation**: Production accounts completely separate

## Testing Multi-Tenancy

### Test Account Setup
```bash
# Create test account
curl -X POST http://localhost:3000/api/setup \
  -H "Content-Type: application/json" \
  -d '{
    "accountName": "Test Tennis Club",
    "accountSlug": "test-club", 
    "adminEmail": "test@example.com",
    "adminPassword": "testpass123",
    "adminFullName": "Test Admin"
  }'
```

### Verify Data Isolation
1. Create two test accounts
2. Add data to each account  
3. Verify users can only see their account's data

### Debug Queries
```sql
-- Check account assignments
SELECT u.email, a.name as account_name 
FROM users u 
JOIN accounts a ON u.account_id = a.id;

-- Verify data isolation
SELECT account_id, count(*) 
FROM clients 
GROUP BY account_id;
```

## Performance Considerations

### Database Optimization
- **Indexes on account_id**: All tables have indexes on account_id
- **Partition by account**: Consider partitioning large tables
- **Query optimization**: Account filtering happens early in query execution

### Caching Strategy
- **Per-account caching**: Cache keys include account_id
- **Cache invalidation**: Account-aware cache invalidation
- **Session storage**: Account context stored in user sessions

## Scalability

### Horizontal Scaling
- **Database sharding**: Shard by account_id for large deployments
- **Microservices**: Account service can be separated
- **Load balancing**: Account-aware load balancing possible

### Resource Management
- **Account limits**: Configurable limits per account
- **Resource quotas**: CPU/memory quotas per account
- **Billing integration**: Usage tracking per account

## Migration Considerations

When migrating from single-tenant to multi-tenant:
1. **Backup all data** before migration
2. **Run migration scripts** to add account structure
3. **Test thoroughly** with multiple accounts
4. **Update application code** to handle account context
5. **Verify data isolation** works correctly

For detailed migration steps, see the [Migration Guide](./MIGRATION.md).

## Troubleshooting Multi-Tenancy

### Common Issues

**"Account not found" errors**:
- Check JWT token includes `account_id`
- Verify user belongs to an active account

**Data not appearing**:
- Ensure all queries include account filtering
- Check RLS policies are properly configured

**Unique constraint violations**:
- Remember constraints are now account-scoped
- Update any hardcoded assumptions about global uniqueness

For more troubleshooting information, see the [Troubleshooting Guide](./TROUBLESHOOTING.md).
