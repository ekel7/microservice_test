# API Reference

## Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-backend-url.vercel.app/api`

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### JWT Token Structure
```json
{
  "userId": "uuid",
  "email": "user@example.com", 
  "role": "admin|employee",
  "account_id": "uuid",
  "account_slug": "tennis-club-abc"
}
```

## Account Management

### Get Current Account Info
```http
GET /api/accounts/current
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Tennis Club ABC",
  "slug": "tennis-club-abc",
  "status": "active",
  "subscription_plan": "basic",
  "settings": {},
  "limits": {
    "max_courts": 10,
    "max_users": 5
  }
}
```

### Update Account Settings (Admin Only)
```http
PUT /api/accounts/current
Content-Type: application/json

{
  "name": "Updated Club Name",
  "settings": {"theme": "dark"}
}
```

### Get Account Statistics  
```http
GET /api/accounts/stats
```

**Response:**
```json
{
  "users_count": 3,
  "clients_count": 25,
  "courts_count": 4,
  "rentals_count": 150,
  "active_rentals": 5
}
```

## Setup New Account

### Create New Account
```http
POST /api/setup
Content-Type: application/json

{
  "accountName": "Tennis Club Name",
  "accountSlug": "unique-slug",
  "adminEmail": "admin@email.com", 
  "adminPassword": "password",
  "adminFullName": "Admin Name"
}
```

**Response:**
```json
{
  "success": true,
  "account": {
    "id": "uuid",
    "name": "Tennis Club Name",
    "slug": "unique-slug"
  },
  "admin": {
    "id": "uuid",
    "email": "admin@email.com",
    "full_name": "Admin Name"
  }
}
```

## Authentication Endpoints

### User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "User Name",
    "role": "admin",
    "account_id": "uuid"
  }
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Refresh JWT Token
```http
POST /api/auth/refresh
Authorization: Bearer <token>
```

## Users Management

### List Users (Account-Filtered)
```http
GET /api/users
Authorization: Bearer <token>
```

### Create User (Admin Only)
```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password",
  "full_name": "New User",
  "role": "employee"
}
```

### Update User (Admin Only)
```http
PUT /api/users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "Updated Name",
  "role": "admin"
}
```

### Delete User (Admin Only)
```http
DELETE /api/users/:id
Authorization: Bearer <token>
```

## Clients Management

### List Clients (Account-Filtered)
```http
GET /api/clients
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 50)
- `search` - Search by name or email

### Get Client by ID
```http
GET /api/clients/:id
Authorization: Bearer <token>
```

### Create Client
```http
POST /api/clients
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "Client Name",
  "email": "client@example.com",
  "phone": "+1234567890",
  "membership_number": "MEM001"
}
```

### Update Client
```http
PUT /api/clients/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "Updated Name",
  "phone": "+0987654321"
}
```

### Delete Client
```http
DELETE /api/clients/:id
Authorization: Bearer <token>
```

## Courts Management

### List Courts (Account-Filtered)
```http
GET /api/courts
Authorization: Bearer <token>
```

### Get Court by ID
```http
GET /api/courts/:id
Authorization: Bearer <token>
```

### Create Court (Admin Only)
```http
POST /api/courts
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Court 1",
  "surface_type": "clay",
  "hourly_rate": 25.00,
  "description": "Professional clay court"
}
```

### Update Court (Admin Only)
```http
PUT /api/courts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Court Name",
  "hourly_rate": 30.00
}
```

### Delete Court (Admin Only)
```http
DELETE /api/courts/:id
Authorization: Bearer <token>
```

## Rentals Management

### List Rentals (Account-Filtered)
```http
GET /api/rentals
Authorization: Bearer <token>
```

**Query Parameters:**
- `court_id` - Filter by court
- `client_id` - Filter by client
- `start_date` - Filter rentals from date (YYYY-MM-DD)
- `end_date` - Filter rentals to date (YYYY-MM-DD)
- `status` - Filter by status (active, completed, cancelled)

### Get Rental by ID
```http
GET /api/rentals/:id
Authorization: Bearer <token>
```

### Create Rental
```http
POST /api/rentals
Authorization: Bearer <token>
Content-Type: application/json

{
  "court_id": "uuid",
  "client_id": "uuid",
  "start_datetime": "2024-01-15T10:00:00Z",
  "end_datetime": "2024-01-15T11:00:00Z",
  "total_amount": 25.00,
  "notes": "Regular booking"
}
```

### Update Rental
```http
PUT /api/rentals/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "start_datetime": "2024-01-15T10:30:00Z",
  "end_datetime": "2024-01-15T11:30:00Z",
  "notes": "Updated booking time"
}
```

### Cancel Rental
```http
DELETE /api/rentals/:id
Authorization: Bearer <token>
```

## Error Responses

### Standard Error Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., overlapping rentals)
- `422` - Unprocessable Entity (validation errors)
- `500` - Internal Server Error

### Account-Specific Errors
- `ACCOUNT_NOT_FOUND` - Account doesn't exist
- `ACCOUNT_SUSPENDED` - Account is suspended
- `ACCOUNT_LIMIT_EXCEEDED` - Account limit reached
- `INSUFFICIENT_PERMISSIONS` - User role doesn't allow action

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- **Authentication**: 5 requests per minute per IP
- **General API**: 100 requests per minute per account
- **Setup endpoint**: 3 requests per hour per IP

## Data Filtering

All endpoints automatically filter data by the authenticated user's account. You cannot access data from other accounts.

### Multi-Tenant Behavior
- All GET requests return only data from your account
- All POST/PUT requests create/update data in your account
- All DELETE requests only affect data in your account
- Cross-account operations are not possible

## Webhook Support (Future)

The API is designed to support webhooks for:
- New account creation
- Rental confirmations
- Payment processing
- Account limit notifications

## API Versioning

The current API version is `v1`. Future versions will be supported at:
- `/api/v2/...`
- With backward compatibility maintained

## SDK and Client Libraries

Official client libraries are planned for:
- JavaScript/TypeScript
- Python
- PHP
- C#

For now, use standard HTTP clients with the documented endpoints.
