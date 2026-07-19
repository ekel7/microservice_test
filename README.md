# Tennis Court Rental App

A full-stack web application for managing tennis court rentals, clients, users, and court schedules with **multi-tenancy support**. Multiple tennis clubs or organizations can use the same application while keeping their data completely separate. Built with Node.js (Express), Supabase (PostgreSQL), and Astro (Vue.js components).

## 🌟 Key Features
- **Multi-tenancy**: Complete data isolation between different organizations
- **Account Management**: Separate accounts for different tennis clubs/organizations  
- **User authentication**: Admin and employee roles per account
- **Client Management**: Customer database per account
- **Court Management**: Tennis court inventory per account
- **Rental System**: Booking management with overlap prevention per account
- **Secure API**: JWT authentication with account context and CORS
- **Row Level Security (RLS)**: Database-level data isolation
- **Modern Frontend**: Astro with Vue.js components

## Admin Panel

The application includes a **centralized Admin Panel** for system administrators to manage all tenant accounts, users, and payments across the entire system.

### Quick Access
- **Admin Login**: `/admin-login`
- **Admin Dashboard**: `/admin` (requires authentication)
- **Default Credentials**: `admin` / `matrix25` (⚠️ Change immediately)

### Key Admin Features
- **Account Management**: Create and manage tenant accounts
- **Cross-Tenant User Management**: Administer users across all accounts
- **Payment Management**: Handle billing and payment registration
- **System Monitoring**: Audit logs and usage statistics
- **Security Controls**: Account status management and access control

### Quick Setup
```bash
# The admin panel is included by default
# Access at: http://localhost:3000/admin-login
# Use default credentials: admin / matrix25
```

**📖 For complete admin documentation**: See **[👑 Admin Panel Guide](./docs/ADMIN_PANEL.md)**

## �🚀 Quick Start

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- Supabase project (PostgreSQL)

### Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd alquiler-de-canchas

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies  
cd ../frontend && npm install
```

For complete setup instructions, see **[📖 Installation Guide](./docs/INSTALLATION.md)**.

## 🏗️ Project Structure
```
backend/            # Express API server
frontend/           # Astro frontend app  
database/           # Database schema and migrations
docs/               # 📚 Comprehensive documentation
```

## 📖 Documentation

### Core Documentation
- **[📦 Installation Guide](./docs/INSTALLATION.md)** - Complete setup instructions
- **[🏢 Multi-Tenancy Architecture](./docs/MULTI_TENANCY.md)** - Detailed architecture explanation
- **[🔌 API Reference](./docs/API.md)** - Complete API endpoint documentation
- **[🗄️ Database Schema](./docs/DATABASE.md)** - Database structure and migrations
- **[👑 Super Admin Panel](./docs/ADMIN_PANEL.md)** - Centralized administration interface

### Deployment & Operations
- **[🐳 Docker Deployment](./docs/DOCKER.md)** - Running with Docker
- **[▲ Vercel Deployment](./docs/VERCEL.md)** - Deploy to Vercel with GitHub Actions
- **[☁️ Azure Deployment](./docs/AZURE.md)** - Deploy to Azure cloud services

### Development & Maintenance
- **[⚙️ Development Guide](./docs/DEVELOPMENT.md)** - Development tips and best practices
- **[🔒 Security Guide](./docs/SECURITY.md)** - Security features and considerations
- **[🚨 Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[🔄 Migration Guide](./docs/MIGRATION.md)** - Migrating from single-tenant

## 🎯 Use Cases

- **Single Organization**: Tennis club management
- **Multi-Location Business**: Separate accounts per location  
- **SaaS Provider**: Tennis court management as a service

## 🔐 Security & Isolation

- **Row Level Security (RLS)**: Database-level data isolation
- **JWT Authentication**: Account-aware token system
- **Account-Scoped Constraints**: Prevent cross-account data access
- **Multi-tenant API**: All endpoints automatically filter by account

## 🚀 Quick Deploy

### Docker (Recommended for Development)
```bash
docker-compose up --build
```

### Vercel (Recommended for Production)
See **[▲ Vercel Deployment Guide](./docs/VERCEL.md)** for automated GitHub Actions setup.

## 📊 API Overview

All API endpoints are account-aware and automatically filter data:

### User/Tenant API
- `POST /api/auth/login` — User login with account context
- `GET /api/accounts/current` — Current account info
- `GET /api/clients` — Account-filtered clients
- `GET /api/courts` — Account-filtered courts  
- `GET /api/rentals` — Account-filtered rentals

### Super Admin API
- `POST /api/admin/auth/login` — Admin login (separate system)
- `GET /api/admin/accounts` — Manage all tenant accounts
- `GET /api/admin/users` — Cross-tenant user management
- `GET /api/admin/payments` — Payment management across accounts

For complete API documentation, see **[🔌 API Reference](./docs/API.md)**.

## 🆘 Need Help?

1. **Quick Issues**: Check **[🚨 Troubleshooting Guide](./docs/TROUBLESHOOTING.md)**
2. **Setup Problems**: Review **[📦 Installation Guide](./docs/INSTALLATION.md)**
3. **Architecture Questions**: See **[🏢 Multi-Tenancy Architecture](./docs/MULTI_TENANCY.md)**
4. **API Questions**: Check **[🔌 API Reference](./docs/API.md)**

## 📝 Contributing

When contributing:
1. Update relevant documentation in `/docs`
2. Test multi-tenancy isolation
3. Follow security best practices
4. Update API docs for endpoint changes

## 📄 License
MIT

---

**💡 Tip**: Start with the [📖 Installation Guide](./docs/INSTALLATION.md) for setup, then explore the [🏢 Multi-Tenancy Architecture](./docs/MULTI_TENANCY.md) to understand the system design.