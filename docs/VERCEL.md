# Vercel Deployment Guide

This guide covers deploying the Tennis Court Rental App to Vercel, including both automated deployment with GitHub Actions and manual deployment methods.

## 🚀 Method 1: Automated Deployment with GitHub Actions (Recommended)

### Prerequisites
1. **Vercel Account**: Make sure you have a Vercel account
2. **Vercel CLI**: Install Vercel CLI locally: `npm install -g vercel`
3. **GitHub Repository**: Your code should be in a GitHub repository

### Setup Steps

#### 1. Link Your Projects to Vercel
First, you need to link both your backend and frontend to Vercel projects:

```bash
# Link backend
cd backend
vercel link

# Link frontend
cd ../frontend
vercel link
```

#### 2. Get Vercel Information
You'll need these values for GitHub secrets:

**Get Vercel Token:**
1. Go to [Vercel Settings > Tokens](https://vercel.com/account/tokens)
2. Create a new token with scope "Full Access"
3. Copy the token

**Get Organization ID and Project IDs:**
After linking your projects, check the `.vercel/project.json` files:

```bash
# Backend project ID
cat backend/.vercel/project.json

# Frontend project ID  
cat frontend/.vercel/project.json
```

#### 3. Configure GitHub Repository Secrets
Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `VERCEL_TOKEN` | Vercel authentication token | From Vercel Settings > Tokens |
| `VERCEL_ORG_ID` | Your Vercel organization ID | From `*/.vercel/project.json` (either backend or frontend folder) |
| `VERCEL_PROJECT_ID_BACKEND` | Backend project ID | From `backend/.vercel/project.json` |
| `VERCEL_PROJECT_ID_FRONTEND` | Frontend project ID | From `frontend/.vercel/project.json` |

#### 4. Configure Environment Variables in Vercel
Make sure your environment variables are set in Vercel:

**For Backend Project:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `JWT_SECRET` - Secret key for JWT token signing
- `JWT_EXPIRES_IN` - JWT token expiration time (e.g., "24h")
- `NODE_ENV` - Set to "production"
- `FRONTEND_URL` - URL of your deployed frontend (update after frontend deployment)

**For Frontend Project:**
- Any frontend-specific environment variables (if needed)

#### 5. Deploy Automatically
Once configured, the deployment will automatically start when you:
1. Push to the `main` or `master` branch
2. Go to GitHub Actions tab in your repository
3. Watch the deployment process

### GitHub Actions Workflow Features

**✅ What the workflows do:**
- **Separate Deployments**: Backend and frontend deploy independently
- **Path-based Triggers**: Only deploys when relevant files change
  - Backend deploys when `backend/**` files change
  - Frontend deploys when `frontend/**` files change
- **Pull Request Preview**: Also runs on pull requests (you can modify this)
- **Dependency Caching**: Caches Node.js dependencies for faster builds
- **Build Artifacts**: Uses Vercel's build process for optimized deployments
- **Independent Success/Failure**: Each deployment can succeed or fail independently

**🔧 Workflow Files:**
- `.github/workflows/deploy-backend.yml` - Backend deployment
- `.github/workflows/deploy-frontend.yml` - Frontend deployment

### Workflow Customization Options

#### Deploy on Different Branches:
```yaml
on:
  push:
    branches: [main, develop, staging]
```

#### Deploy All Changes (not just path-specific):
```yaml
on:
  push:
    branches: [main, master]
  # Remove the paths section to deploy on any change
```

#### Production-only Deployments (remove preview):
```yaml
# Remove this section for production-only deployments
pull_request:
  branches: [main, master]
  paths:
    - 'backend/**'  # or 'frontend/**'
```

### Troubleshooting GitHub Actions

**Common Issues:**

1. **"Project not found"**
   - Make sure `VERCEL_PROJECT_ID_*` secrets are correct
   - Verify you've linked the projects with `vercel link`

2. **"Invalid token"**
   - Check that `VERCEL_TOKEN` is valid and has correct permissions
   - Make sure the token hasn't expired

3. **Build failures**
   - Check your `package.json` scripts
   - Verify all environment variables are set in Vercel

4. **Environment variables not working**
   - Set them in Vercel dashboard for each project
   - Make sure they're set for "Production" environment

**Debug Commands:**
```bash
# Check Vercel project status
vercel ls

# Check project settings
vercel env ls

# Test local build
vercel build
```

## 🛠️ Method 2: Manual Deployment

### Prerequisites for Manual Deployment
1. Install Vercel CLI globally:
   ```sh
   npm install -g vercel
   ```
2. Login to your Vercel account:
   ```sh
   vercel login
   ```

### Environment Variables Setup
Configure the environment variables in your Vercel project dashboard (same as listed above for GitHub Actions method).

### Automated Deployment Script
Use the provided deployment script for easy manual deployment:

```sh
./deploy.sh
```

This script will:
1. Install dependencies for both frontend and backend
2. Deploy the backend to Vercel
3. Deploy the frontend to Vercel

### Manual Step-by-Step Deployment
If you prefer to deploy manually:

1. **Deploy Backend:**
   ```sh
   cd backend
   npm install
   vercel --prod
   ```

2. **Deploy Frontend:**
   ```sh
   cd frontend
   npm install
   vercel --prod
   ```

## 🔧 Post-Deployment Configuration

### Update Environment Variables
1. Update the `FRONTEND_URL` environment variable in your backend Vercel project with the deployed frontend URL
2. Update any CORS settings if needed
3. Verify that both services can communicate properly

### Custom Domain Setup (Optional)
1. Go to your Vercel project dashboard
2. Navigate to Settings > Domains
3. Add your custom domain
4. Configure DNS records as instructed

### SSL/TLS Configuration
Vercel automatically provides SSL certificates for all deployments. No additional configuration needed.

## 🔍 Monitoring and Debugging

### Vercel Analytics
Enable Vercel Analytics for performance monitoring:
1. Go to your project dashboard
2. Navigate to Analytics tab
3. Enable analytics for both frontend and backend

### Log Monitoring
View deployment and runtime logs:
```bash
# View deployment logs
vercel logs <deployment-url>

# View function logs
vercel logs --follow
```

### Health Checks
Set up health check endpoints:
```javascript
// backend/routes/health.js
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version 
  });
});
```

## 🔒 Security Notes for Deployment

### Environment Variables
- Never commit `.vercel` folders to your repository
- Keep your Vercel token secure
- Use environment variables for sensitive data
- Review permissions when creating Vercel tokens

### CORS Configuration
Ensure CORS is properly configured for production:
```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200
};
```

### Rate Limiting
Implement rate limiting for production:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## 🚀 Performance Optimization

### Backend Optimization
- Enable gzip compression
- Implement API response caching
- Optimize database queries
- Use connection pooling

### Frontend Optimization
- Enable Astro's built-in optimizations
- Implement lazy loading for components
- Optimize images and assets
- Use CDN for static assets

### Vercel-Specific Optimizations
- Use Vercel Edge Functions for geographically distributed logic
- Implement ISR (Incremental Static Regeneration) where applicable
- Use Vercel's built-in caching features

## 📊 Cost Management

### Vercel Pricing Tiers
- **Hobby**: Free tier with basic features
- **Pro**: $20/month with enhanced features
- **Enterprise**: Custom pricing for large deployments

### Cost Optimization Tips
1. Monitor function execution time and invocations
2. Implement efficient caching strategies
3. Optimize bundle sizes
4. Use edge functions strategically

## 🔄 Rollback Strategy

### Quick Rollback
```bash
# List deployments
vercel ls

# Promote a previous deployment
vercel promote <deployment-url>
```

### Automated Rollback
Implement health checks in your GitHub Actions workflow to automatically rollback failed deployments.

## 📝 Deployment Checklist

Before deploying to production:

- [ ] Environment variables configured in Vercel
- [ ] Database migrations applied
- [ ] CORS settings updated for production URLs
- [ ] Rate limiting implemented
- [ ] Health check endpoints created
- [ ] SSL/TLS certificates validated
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring and analytics enabled
- [ ] Backup and rollback strategy tested

## 🆘 Troubleshooting

### Common Deployment Issues

1. **Build Failures**
   - Check build logs in Vercel dashboard
   - Verify all dependencies are listed in package.json
   - Ensure build scripts are correct

2. **Runtime Errors**
   - Check function logs in Vercel dashboard
   - Verify environment variables are set
   - Test API endpoints individually

3. **CORS Issues**
   - Verify FRONTEND_URL matches deployed frontend
   - Check CORS middleware configuration
   - Test cross-origin requests

For additional troubleshooting, see the [Troubleshooting Guide](./TROUBLESHOOTING.md).
