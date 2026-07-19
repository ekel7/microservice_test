# Admin Panel Guide

This guide covers the Admin Panel for the Tennis Court Rental App, which provides centralized management capabilities for system administrators to manage tenant accounts, users, and payments across all tenants.

## 🎯 Overview

The Admin Panel is a separate administration interface that operates independently of tenant-specific interfaces. It allows system administrators to:

- **Manage Tenant Accounts**: Create, configure, and monitor all tenant accounts
- **Cross-Tenant User Management**: View and manage users across all tenants
- **Payment Administration**: Handle payments, billing, and financial reporting
- **System Monitoring**: Track usage, performance, and audit activities

## 🚀 Quick Access

### URLs
- **Admin Login**: `/admin-login`
- **Admin Dashboard**: `/admin` (requires authentication)

### Default Credentials
```
Username: admin
Password: matrix25
```

**⚠️ CRITICAL**: Change the default password immediately after first login for security.

## 🌟 Key Features

### 1. Authentication & Security
- **Independent Login System**: Separate from tenant authentication
- **JWT-Based Security**: Secure token-based authentication
- **Session Management**: Automatic logout on token expiration (8 hours)
- **Audit Trail**: All admin actions are logged with IP and user agent

### 2. Account Management
- **Create New Accounts**: Set up tenant accounts with custom configurations
- **Account Status Control**: Enable, disable, or suspend tenant accounts
- **Usage Monitoring**: View account statistics (users, courts, rentals)
- **Subscription Management**: Manage plans, limits, and billing cycles

### 3. User Management
- **Cross-Tenant View**: See all users across all tenant accounts
- **Password Management**: Reset passwords for any user in the system
- **Status Control**: Activate or deactivate user accounts
- **Role Management**: Change user roles (admin/employee) across tenants

### 4. Payment Management
- **Payment Registration**: Manually register payments for accounts
- **Payment Tracking**: View comprehensive payment history
- **Billing Management**: Handle billing periods and payment methods
- **Financial Reporting**: Generate payment statistics and summaries

## 🏗️ Architecture

### Database Schema

#### New Admin Tables

**`super_admins` Table:**
```sql
CREATE TABLE super_admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`payments` Table:**
```sql
CREATE TABLE payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100),
    billing_period_start DATE,
    billing_period_end DATE,
    status VARCHAR(20) DEFAULT 'pending',
    processed_by UUID REFERENCES super_admins(id),
    processed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`admin_logs` Table:**
```sql
CREATE TABLE admin_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES super_admins(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### File Structure

#### Backend Components
```
backend/
├── middleware/
│   └── adminAuth.js          # Admin authentication middleware
├── routes/
│   ├── adminAuth.js          # Authentication endpoints
│   ├── adminAccounts.js      # Account management
│   ├── adminUsers.js         # User management
│   ├── adminPayments.js      # Payment management
│   └── adminLogs.js          # Audit log endpoints
└── server.js                 # Main server with admin routes
```

#### Frontend Components
```
frontend/src/
├── components/admin/
│   ├── AdminLoginForm.vue    # Login interface
│   ├── AdminDashboard.vue    # Main dashboard
│   ├── AdminOverview.vue     # System statistics
│   ├── AdminAccounts.vue     # Account management
│   ├── AdminUsers.vue        # User management
│   ├── AdminPayments.vue     # Payment management
│   ├── AdminLogs.vue         # Audit logs viewer
│   └── AdminNavigation.vue   # Navigation component
├── pages/
│   ├── admin-login.astro     # Login page
│   └── admin.astro           # Dashboard page
└── utils/
    └── adminApi.js           # Admin API utilities
```

## 🔌 API Reference

All admin endpoints are prefixed with `/api/admin/` and require admin authentication.

### Authentication Endpoints

#### Admin Login
```http
POST /api/admin/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your_password"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "admin": {
    "id": "uuid",
    "username": "admin",
    "full_name": "System Administrator"
  }
}
```

#### Get Current Admin
```http
GET /api/admin/auth/me
Authorization: Bearer <admin_token>
```

#### Admin Logout
```http
POST /api/admin/auth/logout
Authorization: Bearer <admin_token>
```

### Account Management Endpoints

#### List All Accounts
```http
GET /api/admin/accounts
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `status` - Filter by account status (active, suspended, trial)
- `plan` - Filter by subscription plan
- `page` - Page number for pagination
- `limit` - Results per page

#### Get Account Details
```http
GET /api/admin/accounts/:id
Authorization: Bearer <admin_token>
```

#### Create New Account
```http
POST /api/admin/accounts
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Tennis Club ABC",
  "slug": "tennis-club-abc",
  "subscription_plan": "standard",
  "limits": {
    "max_courts": 10,
    "max_users": 25
  },
  "admin_user": {
    "email": "admin@tennisclub.com",
    "password": "secure_password",
    "full_name": "Club Administrator"
  }
}
```

#### Update Account Status
```http
PATCH /api/admin/accounts/:id/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "suspended",
  "reason": "Payment overdue"
}
```

### User Management Endpoints

#### List All Users
```http
GET /api/admin/users
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `account_id` - Filter by specific account
- `role` - Filter by user role (admin, employee)
- `status` - Filter by active status
- `search` - Search by name or email

#### Reset User Password
```http
POST /api/admin/users/:id/reset-password
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "new_password": "new_secure_password"
}
```

#### Update User Status
```http
PATCH /api/admin/users/:id/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "is_active": false,
  "reason": "Account violation"
}
```

### Payment Management Endpoints

#### List Payments
```http
GET /api/admin/payments
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `account_id` - Filter by account
- `status` - Filter by payment status
- `method` - Filter by payment method
- `start_date` - Filter payments from date
- `end_date` - Filter payments to date

#### Register Payment
```http
POST /api/admin/payments
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "account_id": "uuid",
  "amount": 99.99,
  "currency": "USD",
  "payment_method": "credit_card",
  "transaction_id": "TXN123456",
  "billing_period_start": "2024-01-01",
  "billing_period_end": "2024-01-31",
  "notes": "Monthly subscription payment"
}
```

#### Payment Statistics
```http
GET /api/admin/payments/stats/summary
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "total_payments": 150,
  "total_amount": 12500.00,
  "pending_payments": 5,
  "monthly_revenue": 2500.00,
  "payment_methods": {
    "credit_card": 120,
    "bank_transfer": 25,
    "cash": 5
  }
}
```

## 🔐 Security Features

### Authentication Security
- **JWT Tokens**: 8-hour expiration for security
- **Password Hashing**: bcrypt with salt rounds
- **Session Management**: Automatic token refresh and logout
- **Rate Limiting**: Protection against brute force attacks

### Authorization Controls
- **Admin-Only Access**: All functionality restricted to authenticated admins
- **Token Validation**: Every request validates JWT token
- **Cross-Origin Security**: CORS protection for admin endpoints

### Audit & Compliance
- **Activity Logging**: All admin actions tracked with context
- **IP Address Logging**: Track access location and source
- **User Agent Tracking**: Device and browser information
- **Detailed Action Context**: Full context of changes made

## 📊 Usage Guide

### Initial Setup

1. **Access Admin Panel**: Navigate to `/admin-login`
2. **First Login**: Use default credentials (admin/matrix25)
3. **Change Password**: Immediately update the default password
4. **Verify Access**: Confirm all admin functions are working

### Creating Tenant Accounts

1. **Navigate to Accounts**: Click "Accounts" in admin dashboard
2. **Create New Account**: Click "Create Account" button
3. **Fill Account Details**:
   - **Name**: Display name for the organization
   - **Slug**: URL-friendly identifier (unique)
   - **Subscription Plan**: Choose appropriate plan
   - **Limits**: Set maximum courts and users allowed
4. **Set Admin User**: Create the first admin user for the account
5. **Activate Account**: Ensure account status is "active"

### Managing Users

1. **View All Users**: Access "Users" tab to see cross-tenant users
2. **Filter Users**: Use filters to find specific users or accounts
3. **Reset Passwords**: Use the key icon to reset user passwords
4. **Change Roles**: Modify user roles between admin and employee
5. **Deactivate Users**: Suspend problematic or inactive users

### Payment Management

1. **View Payments**: Access "Payments" tab for payment overview
2. **Register Payment**: Manually add payment records
3. **Update Status**: Mark payments as completed, failed, or refunded
4. **Generate Reports**: Use payment statistics for financial reporting
5. **Track Billing**: Monitor billing periods and payment schedules

### Monitoring & Auditing

1. **System Overview**: Check the dashboard for system health
2. **Usage Statistics**: Monitor account usage and growth
3. **Audit Logs**: Review admin activity logs for compliance
4. **Performance Metrics**: Track system performance indicators

## 🚨 Troubleshooting

### Common Issues

#### Cannot Access Admin Panel
**Problem**: Getting 404 or access denied errors

**Solutions:**
1. Verify the URL is `/admin-login` for login
2. Check that admin routes are properly configured
3. Ensure JWT_SECRET environment variable is set
4. Confirm super_admins table exists in database

#### Token Expired Errors
**Problem**: Getting "Token expired" messages

**Solutions:**
1. Login again to get a new token
2. Check system clock synchronization
3. Verify JWT_SECRET hasn't changed
4. Clear browser cache and cookies

#### Database Permission Errors
**Problem**: Cannot create accounts or modify data

**Solutions:**
1. Check database user permissions
2. Verify Supabase RLS policies allow admin access
3. Ensure admin tables exist and are accessible
4. Check foreign key constraints

#### Payment Registration Issues
**Problem**: Cannot register or update payments

**Solutions:**
1. Verify account_id exists and is valid
2. Check decimal precision for amounts
3. Ensure required fields are provided
4. Verify admin has payment management permissions

### Debug Commands

#### Check Admin User
```sql
SELECT * FROM super_admins WHERE username = 'admin';
```

#### Verify Admin Tables
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('super_admins', 'payments', 'admin_logs');
```

#### Check Recent Admin Activity
```sql
SELECT al.action, al.target_type, al.created_at, sa.username
FROM admin_logs al
JOIN super_admins sa ON al.admin_id = sa.id
ORDER BY al.created_at DESC
LIMIT 10;
```

## 🔧 Development & Customization

### Adding New Admin Features

1. **Backend Route**: Create new route in `backend/routes/admin*.js`
2. **Add to Server**: Include route in server.js with `/api/admin/` prefix
3. **Frontend Component**: Create Vue component in `src/components/admin/`
4. **Update Navigation**: Add to AdminNavigation.vue and AdminDashboard.vue
5. **Test Functionality**: Verify admin authentication and permissions

### Database Schema Changes

1. **Update Schema**: Modify `database/schema.sql`
2. **Create Migration**: Add migration file in `database/supabase/migrations/`
3. **Apply Migration**: Run migration on database
4. **Update Documentation**: Document new tables or fields
5. **Test Changes**: Verify new functionality works correctly

### Security Enhancements

1. **Multi-Factor Authentication**: Add 2FA for admin accounts
2. **IP Whitelisting**: Restrict admin access by IP address
3. **Enhanced Logging**: Add more detailed audit trails
4. **Role-Based Access**: Create different admin permission levels
5. **Session Security**: Implement session fixation protection

## 📝 Best Practices

### Security Best Practices
1. **Strong Passwords**: Use complex passwords with regular updates
2. **Regular Audits**: Review admin logs and activities frequently
3. **Principle of Least Privilege**: Limit admin access to necessary functions
4. **Secure Environment**: Ensure HTTPS and secure server configuration
5. **Backup Strategy**: Regular backups of admin data and configurations

### Operational Best Practices
1. **Documentation**: Keep admin procedures well-documented
2. **Training**: Ensure admin users understand all functionality
3. **Change Management**: Track and approve all system changes
4. **Monitoring**: Set up alerts for critical admin activities
5. **Recovery Planning**: Have procedures for admin account recovery

## 📞 Support & Maintenance

For admin panel issues:
1. Check the [Troubleshooting Guide](./TROUBLESHOOTING.md) for common solutions
2. Review admin logs for error details
3. Verify database connectivity and permissions
4. Ensure all environment variables are properly configured
5. Contact system administrators for advanced issues

The Admin Panel is a powerful tool for managing the multi-tenant system. Use it responsibly and maintain security best practices at all times.
