# Troubleshooting Guide

This guide covers common issues and their solutions for the Tennis Court Rental App.

## 🚨 Common Issues

### Installation Issues

#### Database Connection Problems
**Problem**: Cannot connect to Supabase database
```
Error: Failed to connect to Supabase
```

**Solutions:**
1. Check your `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env`
2. Verify Supabase project is active and accessible
3. Check network connectivity
4. Ensure RLS policies are properly configured

**Debug Commands:**
```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" "YOUR_SUPABASE_URL/rest/v1/"
```

#### JWT Token Issues
**Problem**: Authentication failing with JWT errors
```
Error: Invalid token
Error: Token expired
```

**Solutions:**
1. Check `JWT_SECRET` is set in environment variables
2. Verify token expiration settings (`JWT_EXPIRES_IN`)
3. Clear browser localStorage/cookies
4. Regenerate JWT secret if compromised

**Debug Commands:**
```javascript
// Check JWT token content
const jwt = require('jsonwebtoken');
const decoded = jwt.decode(token);
console.log(decoded);
```

### Multi-Tenancy Issues

#### Account Not Found Errors
**Problem**: Users getting "Account not found" errors
```
Error: Account not found for user
```

**Solutions:**
1. Check JWT token includes `account_id`
2. Verify user belongs to an active account
3. Check database for orphaned users
4. Ensure account migration completed successfully

**Debug Queries:**
```sql
-- Check user account assignments
SELECT u.email, u.account_id, a.name as account_name 
FROM users u 
LEFT JOIN accounts a ON u.account_id = a.id
WHERE u.email = 'user@example.com';

-- Find orphaned users
SELECT * FROM users WHERE account_id IS NULL;
```

#### Data Not Appearing
**Problem**: Users can't see their data
```
Empty results despite data existing
```

**Solutions:**
1. Ensure all queries include account filtering
2. Check RLS policies are properly configured
3. Verify account_id is correctly passed in requests
4. Check user permissions and role

**Debug Queries:**
```sql
-- Verify data isolation
SELECT account_id, count(*) as client_count
FROM clients 
GROUP BY account_id;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('users', 'clients', 'courts', 'rentals');
```

#### Unique Constraint Violations
**Problem**: Getting unique constraint errors for data that should be account-scoped
```
Error: duplicate key value violates unique constraint
```

**Solutions:**
1. Remember constraints are now account-scoped
2. Update any hardcoded assumptions about global uniqueness
3. Check migration scripts completed successfully
4. Verify constraint definitions in database

**Debug Queries:**
```sql
-- Check constraint definitions
SELECT conname, contype, consrc 
FROM pg_constraint 
WHERE conrelid = 'clients'::regclass;
```

### API Issues

#### CORS Errors
**Problem**: Frontend can't connect to backend API
```
Error: CORS policy blocked the request
```

**Solutions:**
1. Check `FRONTEND_URL` environment variable matches your frontend URL
2. Verify CORS middleware is properly configured
3. Ensure credentials are included in requests
4. Check for HTTPS/HTTP protocol mismatches

**Debug Steps:**
```javascript
// Check CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200
};
console.log('CORS Origin:', process.env.FRONTEND_URL);
```

#### Rate Limiting Issues
**Problem**: API requests being blocked by rate limiting
```
Error: Too Many Requests (429)
```

**Solutions:**
1. Implement exponential backoff in frontend
2. Check rate limiting configuration
3. Whitelist specific IPs if needed
4. Monitor API usage patterns

### Database Issues

#### Migration Failures
**Problem**: Database migration scripts failing
```
Error: relation "accounts" does not exist
```

**Solutions:**
1. Check migration script order and dependencies
2. Verify database permissions
3. Run migrations in correct sequence
4. Check for syntax errors in SQL

**Recovery Steps:**
```sql
-- Check if accounts table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'accounts'
);

-- Manual migration if needed
-- Run schema.sql manually
```

#### RLS Policy Issues
**Problem**: Row Level Security policies not working
```
Error: permission denied for table
```

**Solutions:**
1. Check if RLS is enabled on tables
2. Verify policy conditions are correct
3. Test policies with different user contexts
4. Check auth.uid() function availability

**Debug Queries:**
```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'clients', 'courts', 'rentals');

-- Test policy manually
SET role 'anon';
SELECT * FROM clients; -- Should filter by account
```

### Frontend Issues

#### Component Loading Errors
**Problem**: Vue components not loading or rendering
```
Error: Component failed to mount
```

**Solutions:**
1. Check component syntax and imports
2. Verify Astro configuration for Vue
3. Check browser console for JavaScript errors
4. Ensure all dependencies are installed

#### API Request Failures
**Problem**: Frontend API calls failing
```
Error: Network request failed
```

**Solutions:**
1. Check backend server is running
2. Verify API endpoints and URLs
3. Check authentication headers
4. Monitor network tab in browser DevTools

### Docker Issues

#### Container Build Failures
**Problem**: Docker containers failing to build
```
Error: failed to build docker image
```

**Solutions:**
1. Check Dockerfile syntax
2. Verify all required files are in build context
3. Check for permission issues
4. Clear Docker cache and rebuild

**Debug Commands:**
```bash
# Clear Docker cache
docker system prune -a

# Build with verbose output
docker build --no-cache --progress=plain .

# Check build context
docker build --dry-run .
```

#### Container Communication Issues
**Problem**: Services can't communicate between containers
```
Error: Connection refused
```

**Solutions:**
1. Check Docker network configuration
2. Verify service names in docker-compose.yml
3. Check port mappings
4. Test network connectivity between containers

**Debug Commands:**
```bash
# Test container connectivity
docker exec -it backend_container ping frontend_container

# Check container networks
docker network ls
docker network inspect bridge
```

### Deployment Issues

#### Vercel Deployment Failures
**Problem**: Vercel deployment failing
```
Error: Build failed
Error: Function timeout
```

**Solutions:**
1. Check build logs in Vercel dashboard
2. Verify environment variables are set
3. Check function size and timeout limits
4. Test build locally first

**Debug Steps:**
```bash
# Test local build
npm run build

# Check Vercel project settings
vercel env ls

# View deployment logs
vercel logs
```

#### Environment Variable Issues
**Problem**: Environment variables not working in production
```
Error: undefined environment variable
```

**Solutions:**
1. Verify variables are set in deployment platform
2. Check variable names match exactly
3. Ensure variables are set for correct environment (production/preview)
4. Check for typos in variable names

## 🔧 Debug Tools and Commands

### Database Debugging
```sql
-- Check account data integrity
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

-- Check for data inconsistencies
SELECT 'orphaned_users' as issue, COUNT(*) as count
FROM users WHERE account_id IS NULL
UNION ALL
SELECT 'orphaned_clients', COUNT(*)
FROM clients WHERE account_id IS NULL;
```

### API Testing
```bash
# Test authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Test account-filtered endpoint
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/clients

# Test account setup
curl -X POST http://localhost:3000/api/setup \
  -H "Content-Type: application/json" \
  -d '{
    "accountName": "Test Club",
    "accountSlug": "test-club",
    "adminEmail": "admin@test.com",
    "adminPassword": "testpass123",
    "adminFullName": "Test Admin"
  }'
```

### Frontend Debugging
```javascript
// Check localStorage for tokens and account data
console.log('JWT Token:', localStorage.getItem('token'));
console.log('User Data:', localStorage.getItem('user'));

// Test API calls
fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(console.log);
```

## 🚨 Emergency Procedures

### Database Recovery
If database becomes corrupted or inaccessible:
1. Check Supabase dashboard for service status
2. Review recent database changes
3. Restore from backup if available
4. Contact Supabase support if needed

### Account Data Recovery
If account data is lost or corrupted:
1. Check database for account existence
2. Verify RLS policies haven't changed
3. Check for recent migrations that might have affected data
4. Restore from backup or recreate account

### Production Rollback
If production deployment fails:
1. **Vercel**: Use `vercel --prod` to promote previous deployment
2. **Docker**: Revert to previous image version
3. **Database**: Rollback recent migrations if needed
4. **Monitor**: Check logs and metrics after rollback

## 📞 Getting Help

### Before Asking for Help
1. Check this troubleshooting guide
2. Review relevant documentation sections
3. Check application logs
4. Test with minimal reproduction case

### What to Include in Support Requests
1. **Error message**: Full error text and stack trace
2. **Environment**: Development/production, OS, versions
3. **Steps to reproduce**: Minimal steps to trigger the issue
4. **Expected vs actual behavior**: What should happen vs what happens
5. **Logs**: Relevant application and system logs
6. **Configuration**: Relevant environment variables (without secrets)

### Community Resources
- GitHub Issues: Report bugs and feature requests
- Documentation: Check for updates and clarifications
- Discord/Slack: Community support channels (if available)

## 🔄 Regular Maintenance

### Daily Checks
- Monitor application logs for errors
- Check database connection health
- Verify backup systems are working
- Monitor API response times

### Weekly Maintenance
- Review and clean up logs
- Check for security updates
- Monitor resource usage
- Review rate limiting metrics

### Monthly Tasks
- Update dependencies
- Review security configurations
- Backup verification tests
- Performance optimization review
