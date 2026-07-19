# Tennis Court Rental App Documentation

This folder contains comprehensive documentation for the Tennis Court Rental App (Multi-Tenant).

## 📖 Documentation Index

### Core Documentation
- **[Installation Guide](./INSTALLATION.md)** - Complete setup instructions for new and existing installations
- **[Multi-Tenancy Architecture](./MULTI_TENANCY.md)** - Detailed explanation of the multi-tenant system
- **[API Reference](./API.md)** - Complete API endpoint documentation
- **[Database Schema](./DATABASE.md)** - Database structure and migration information
- **[Super Admin Panel](./ADMIN_PANEL.md)** - Centralized administration interface for managing all tenants

### Deployment & Operations
- **[Docker Deployment](./DOCKER.md)** - Running the application with Docker
- **[Vercel Deployment](./VERCEL.md)** - Complete Vercel deployment guide with GitHub Actions
- **[Azure Deployment](./AZURE.md)** - Deploying to Azure cloud services

### Development & Maintenance
- **[Development Guide](./DEVELOPMENT.md)** - Development tips and best practices
- **[Security Guide](./SECURITY.md)** - Security features and considerations
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[Migration Guide](./MIGRATION.md)** - Migrating from single-tenant to multi-tenant

## 🚀 Quick Start

For a quick start, see the [Installation Guide](./INSTALLATION.md).

For detailed architecture information, see [Multi-Tenancy Architecture](./MULTI_TENANCY.md).

## 🏗️ Project Structure Overview

```
backend/            # Express API server
frontend/           # Astro frontend app  
database/           # Database schema and migrations
docs/               # Comprehensive documentation
```

## 🔧 Key Features Summary

- **Multi-tenancy**: Complete data isolation between organizations
- **User Management**: Admin and employee roles per account
- **Court Management**: Tennis court inventory per account
- **Rental System**: Booking management with overlap prevention
- **Secure API**: JWT authentication with account context
- **Modern Frontend**: Astro with Vue.js components

## 📝 Contributing

When adding new features or making changes:
1. Update relevant documentation
2. Test multi-tenancy isolation
3. Update API documentation if endpoints change
4. Follow security best practices

## 📞 Support

For issues or questions:
1. Check [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Review [API Reference](./API.md)
3. Consult [Multi-Tenancy Architecture](./MULTI_TENANCY.md)
