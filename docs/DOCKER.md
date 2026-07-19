# Docker Deployment Guide

This guide covers running the Tennis Court Rental App using Docker and Docker Compose for local development and production deployment.

## 🐳 Docker Overview

The application includes Docker configurations for both frontend and backend services, making it easy to run the entire stack in containers.

## Prerequisites

- Docker (v20.0+)
- Docker Compose (v2.0+)

## Project Docker Structure

```
├── docker-compose.yml      # Multi-service orchestration
├── backend/
│   └── Dockerfile         # Backend container configuration
└── frontend/
    └── Dockerfile         # Frontend container configuration
```

## 🚀 Quick Start with Docker Compose

### 1. Environment Setup
Create a `.env` file in the `backend/` directory:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:4321
```

### 2. Build and Run All Services
```bash
# Build and start all services
docker-compose up --build

# Run in detached mode (background)
docker-compose up -d --build
```

### 3. Access the Application
- **Frontend**: http://localhost:4321
- **Backend API**: http://localhost:3000

### 4. Stop the Containers
```bash
docker-compose down
```

## 🔧 Docker Compose Configuration

### Services Overview
The `docker-compose.yml` defines:

**Backend Service:**
- **Port**: 3000
- **Environment**: Loads from backend/.env
- **Health Check**: Built-in health monitoring
- **Restart Policy**: Automatic restart on failure

**Frontend Service:**
- **Port**: 4321  
- **Dependencies**: Waits for backend to be ready
- **Build Context**: Optimized for Astro builds

### Sample docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    env_file:
      - ./backend/.env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "4321:4321"
    depends_on:
      - backend
    restart: unless-stopped
```

## 🏗️ Individual Container Builds

### Backend Container

**Dockerfile Features:**
- Node.js 18+ Alpine base image
- Multi-stage build for optimization
- Non-root user for security
- Health check endpoint

**Build and Run:**
```bash
cd backend

# Build the image
docker build -t tennis-backend .

# Run the container
docker run -p 3000:3000 --env-file .env tennis-backend
```

### Frontend Container

**Dockerfile Features:**
- Node.js build stage for dependencies
- Nginx serve stage for production
- Optimized asset serving
- Security headers

**Build and Run:**
```bash
cd frontend

# Build the image
docker build -t tennis-frontend .

# Run the container
docker run -p 4321:4321 tennis-frontend
```

## 🌐 Production Deployment

### Production Docker Compose
For production, use a separate `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - ./backend/.env.production
    restart: always
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

**Deploy to Production:**
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### Environment Variables for Production
Update your production `.env` file:
```env
SUPABASE_URL=https://your-prod-supabase-url.supabase.co
SUPABASE_ANON_KEY=your_production_anon_key
JWT_SECRET=your_very_secure_production_secret
JWT_EXPIRES_IN=24h
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
```

## 🔍 Container Management

### View Running Containers
```bash
# List all running containers
docker-compose ps

# View logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View logs for specific service
docker-compose logs backend
```

### Container Debugging
```bash
# Execute commands inside running container
docker-compose exec backend sh
docker-compose exec frontend sh

# Inspect container details
docker inspect tennis-backend

# View container resource usage
docker stats
```

### Updates and Rebuilds
```bash
# Rebuild specific service
docker-compose build backend

# Rebuild all services
docker-compose build

# Update and restart services
docker-compose up -d --build
```

## 🔧 Development with Docker

### Development Override
Create `docker-compose.override.yml` for development:
```yaml
version: '3.8'

services:
  backend:
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    command: npm run dev

  frontend:
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev
```

### Hot Reloading
Enable hot reloading for development:
```bash
# Start with development override
docker-compose up --build

# Changes to source code will automatically reload
```

## 📦 Multi-Stage Builds

### Backend Dockerfile Example
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:18-alpine AS production
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
USER nodejs
EXPOSE 3000
CMD ["node", "server.js"]
```

### Frontend Dockerfile Example
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 4321
CMD ["nginx", "-g", "daemon off;"]
```

## 🔒 Security Best Practices

### Container Security
- Use non-root users in containers
- Implement health checks
- Use minimal base images (Alpine)
- Scan images for vulnerabilities
- Keep base images updated

### Network Security
```yaml
# Isolate services with custom networks
networks:
  frontend-network:
    driver: bridge
  backend-network:
    driver: bridge
    internal: true
```

### Secrets Management
```yaml
# Use Docker secrets for sensitive data
secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
services:
  backend:
    secrets:
      - jwt_secret
```

## 📊 Monitoring and Logging

### Container Monitoring
```yaml
# Add monitoring labels
services:
  backend:
    labels:
      - "monitoring=enabled"
      - "service=tennis-backend"
  
  frontend:
    labels:
      - "monitoring=enabled" 
      - "service=tennis-frontend"
```

### Log Management
```yaml
# Configure logging drivers
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 🚀 Container Orchestration

### Docker Swarm (Simple Orchestration)
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml tennis-app

# Scale services
docker service scale tennis-app_backend=3
```

### Kubernetes (Advanced Orchestration)
Create Kubernetes manifests for production deployment:
- Deployment manifests
- Service manifests  
- ConfigMap for environment variables
- Ingress for load balancing

## 🔧 Troubleshooting Docker

### Common Issues

**Container Won't Start:**
```bash
# Check container logs
docker-compose logs backend

# Inspect container
docker inspect tennis-backend

# Check port conflicts
netstat -tulpn | grep :3000
```

**Build Failures:**
```bash
# Clear Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache

# Check Dockerfile syntax
docker build --no-cache .
```

**Performance Issues:**
```bash
# Monitor resource usage
docker stats

# Check disk usage
docker system df

# Clean up unused containers/images
docker system prune
```

### Container Health Checks
Implement health checks in your application:
```javascript
// backend/routes/health.js
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## 📝 Docker Best Practices

1. **Use .dockerignore** to exclude unnecessary files
2. **Multi-stage builds** for smaller images
3. **Layer caching** for faster builds
4. **Health checks** for monitoring
5. **Non-root users** for security
6. **Resource limits** to prevent resource exhaustion
7. **Proper logging** for debugging

## 🆘 Getting Help

For more detailed troubleshooting and Docker-specific issues, see the [Troubleshooting Guide](./TROUBLESHOOTING.md).
