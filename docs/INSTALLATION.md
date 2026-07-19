# Installation Guide

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- Supabase project (PostgreSQL)

## For New Installations (Multi-Tenant)

### 1. Clone the Repository
```sh
git clone <your-repo-url>
cd alquiler-de-canchas
```

### 2. Backend Setup
1. Install dependencies:
   ```sh
   cd backend
   npm install
   ```

2. Create a `.env` file in `backend/`:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=24h
   PORT=3000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:4321
   ```

3. Update `SUPABASE_URL` and `SUPABASE_ANON_KEY` with your Supabase project credentials.

4. Start the backend server:
   ```sh
   node server.js
   ```

### 3. Database Setup (Supabase)
1. Open the Supabase dashboard
2. Run the SQL in `database/schema.sql` to create tables with multi-tenancy support
3. The schema includes sample data with demo accounts

### 4. Create Your First Account
Visit `/setup` or use the API directly:
```bash
curl -X POST http://localhost:3000/api/setup \
  -H "Content-Type: application/json" \
  -d '{
    "accountName": "Tennis Club ABC",
    "accountSlug": "tennis-club-abc", 
    "adminEmail": "admin@tennisclub.com",
    "adminPassword": "securepassword123",
    "adminFullName": "Admin User"
  }'
```

### 5. Frontend Setup
1. Install dependencies:
   ```sh
   cd ../frontend
   npm install
   ```

2. Start the frontend dev server:
   ```sh
   npm run dev
   ```

3. Visit [http://localhost:4321](http://localhost:4321)

## For Existing Installations (Migration)

### 1. Run Migration Script
If you have an existing single-tenant installation:
```sql
-- This will add account structure to your existing database
psql -d your_database < database/migration_add_accounts.sql
```

### 2. Data Migration
- All existing data will be automatically moved to a "Default Account"
- Your existing users can continue logging in normally
- You can then create additional accounts as needed

For detailed migration information, see the [Migration Guide](./MIGRATION.md).

## Environment Variables Reference

### Backend Environment Variables
| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `SUPABASE_URL` | Your Supabase project URL | Yes | `https://xyz.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | `eyJ...` |
| `JWT_SECRET` | Secret for JWT token signing | Yes | `your-secret-key` |
| `JWT_EXPIRES_IN` | JWT token expiration | No | `24h` |
| `PORT` | Server port | No | `3000` |
| `NODE_ENV` | Environment mode | No | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | Yes | `http://localhost:4321` |

## Project Structure
```
backend/            # Express API server
  config/           # Supabase config
  middleware/       # Auth middleware (with account context)
  routes/           # API routes (auth, accounts, setup, users, clients, courts, rentals)
  server.js         # Main server entry point
  .env              # Environment variables

database/           # Database schema and migration files
  schema.sql        # PostgreSQL schema with multi-tenancy
  migration_add_accounts.sql  # Migration script for existing databases

frontend/           # Astro frontend app
  src/              # Pages, components, layouts, styles, utils
    pages/setup.astro  # Account setup page
  public/           # Static assets
  package.json
```

## Next Steps

After installation:
1. Review the [Multi-Tenancy Architecture](./MULTI_TENANCY.md) documentation
2. Check the [API Reference](./API.md) for available endpoints
3. Review [Security Guide](./SECURITY.md) for production considerations
4. Set up [deployment](./VERCEL.md) when ready

## Troubleshooting

For common installation issues, see the [Troubleshooting Guide](./TROUBLESHOOTING.md).
