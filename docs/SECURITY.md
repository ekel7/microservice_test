# Security Guide

This guide covers security features, best practices, and considerations for the Tennis Court Rental App's multi-tenant architecture.

## 🛡️ Security Overview

The Tennis Court Rental App implements multiple layers of security to ensure:
- **Data Isolation**: Complete segregation between tenant accounts
- **Secure Authentication**: JWT-based authentication with account context
- **Database Security**: Row Level Security (RLS) for data protection
- **API Security**: Comprehensive input validation and rate limiting
- **Network Security**: CORS, HTTPS, and secure headers

## 🔐 Authentication & Authorization

### JWT Token Security

#### Token Structure
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "admin|employee",
  "account_id": "uuid",
  "account_slug": "tenant-slug",
  "iat": 1640995200,
  "exp": 1641081600
}
```

#### Token Best Practices
```javascript
// Strong JWT secret generation
const generateJwtSecret = () => {
  return require('crypto').randomBytes(64).toString('hex');
};

// Token expiration
const JWT_EXPIRES_IN = process.env.NODE_ENV === 'production' ? '8h' : '24h';

// Secure token generation
const generateToken = (user) => {
  return jwt.sign({
    userId: user.id,
    email: user.email,
    role: user.role,
    account_id: user.account_id,
    account_slug: user.account.slug
  }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'tennis-court-app',
    audience: 'tennis-court-users'
  });
};
```

### Password Security
```javascript
const bcrypt = require('bcrypt');

// Secure password hashing
const hashPassword = async (password) => {
  const saltRounds = 12; // Higher for production
  return await bcrypt.hash(password, saltRounds);
};

// Password validation
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return password.length >= minLength && 
         hasUpperCase && hasLowerCase && 
         hasNumbers && hasSpecialChar;
};
```

### Role-Based Access Control
```javascript
// Middleware for role-based access
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Usage
router.delete('/api/users/:id', auth, requireRole(['admin']), deleteUser);
```

## 🏢 Multi-Tenant Security

### Data Isolation Mechanisms

#### Row Level Security (RLS)
```sql
-- Enable RLS on all tenant tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

-- Example RLS policy
CREATE POLICY tenant_isolation_policy ON clients
    FOR ALL USING (account_id = (
        SELECT u.account_id FROM users u WHERE u.id = auth.uid()
    ));
```

#### Application-Level Isolation
```javascript
// Middleware to ensure account context
const ensureAccountContext = (req, res, next) => {
  if (!req.user?.account_id) {
    return res.status(403).json({ 
      error: 'Account context required',
      code: 'MISSING_ACCOUNT_CONTEXT'
    });
  }
  next();
};

// Query helper for account filtering
const accountQuery = (baseQuery, accountId) => {
  return baseQuery.eq('account_id', accountId);
};

// Usage
const getClients = async (req, res) => {
  const { account_id } = req.user;
  const clients = await accountQuery(
    supabase.from('clients').select('*'),
    account_id
  );
  res.json(clients.data);
};
```

### Account Boundary Protection
```javascript
// Prevent cross-account operations
const validateAccountAccess = async (resourceId, accountId, tableName) => {
  const resource = await supabase
    .from(tableName)
    .select('account_id')
    .eq('id', resourceId)
    .single();
    
  if (!resource.data || resource.data.account_id !== accountId) {
    throw new Error('Resource not found or access denied');
  }
  
  return true;
};

// Usage in route handlers
router.put('/api/clients/:id', auth, async (req, res) => {
  try {
    await validateAccountAccess(req.params.id, req.user.account_id, 'clients');
    // Proceed with update
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
});
```

## 🗄️ Database Security

### Connection Security
```javascript
// Secure database configuration
const supabaseConfig = {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  db: {
    schema: process.env.DB_SCHEMA || 'public'
  },
  global: {
    headers: {
      'x-application-name': 'tennis-court-app'
    }
  }
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  supabaseConfig
);
```

### Query Security
```javascript
// Parameterized queries to prevent SQL injection
const searchClients = async (accountId, searchTerm) => {
  // Safe: uses parameterized query
  const clients = await supabase
    .from('clients')
    .select('*')
    .eq('account_id', accountId)
    .ilike('full_name', `%${searchTerm}%`);
    
  return clients.data;
};

// Input sanitization
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML
    .trim()
    .slice(0, 1000); // Limit length
};
```

### Sensitive Data Protection
```javascript
// Remove sensitive fields from responses
const sanitizeUser = (user) => {
  const { password_hash, ...safeUser } = user;
  return safeUser;
};

// Encrypt sensitive data at rest
const crypto = require('crypto');

const encryptSensitiveData = (data, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-gcm', key);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};
```

## 🌐 API Security

### Input Validation
```javascript
const { body, param, query, validationResult } = require('express-validator');

// Comprehensive validation middleware
const validateCreateClient = [
  body('full_name')
    .isLength({ min: 2, max: 255 })
    .trim()
    .escape(),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .isLength({ max: 255 }),
  body('phone')
    .optional()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .isLength({ max: 20 }),
  body('membership_number')
    .optional()
    .isAlphanumeric()
    .isLength({ max: 50 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];
```

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limiting for authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many login attempts',
    retryAfter: '15 minutes'
  }
});

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
```

### CORS Configuration
```javascript
const cors = require('cors');

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'https://your-domain.com',
      'https://your-subdomain.vercel.app'
    ];
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
```

### Security Headers
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.SUPABASE_URL]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Additional security middleware
app.use((req, res, next) => {
  res.setHeader('X-Account-Context', 'required');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
```

## 🔒 Frontend Security

### Secure Token Storage
```javascript
// Secure token management
class TokenManager {
  static setToken(token) {
    // Use sessionStorage for better security
    sessionStorage.setItem('auth_token', token);
  }
  
  static getToken() {
    return sessionStorage.getItem('auth_token');
  }
  
  static removeToken() {
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('user_data');
  }
  
  static isTokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch (error) {
      return true;
    }
  }
}
```

### XSS Prevention
```javascript
// Sanitize user input in frontend
const sanitizeHtml = (html) => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

// Use in Vue components
export default {
  methods: {
    displayUserContent(content) {
      return sanitizeHtml(content);
    }
  }
};
```

### CSRF Protection
```javascript
// CSRF token handling
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

const apiCall = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
    ...options.headers
  };
  
  const token = TokenManager.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers
  });
};
```

## 👑 Admin Panel Security

### Super Admin Authentication
```javascript
// Separate admin authentication
const adminAuth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Admin token required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    
    // Verify admin still exists and is active
    const admin = await supabase
      .from('super_admins')
      .select('*')
      .eq('id', decoded.adminId)
      .eq('is_active', true)
      .single();
      
    if (!admin.data) {
      return res.status(401).json({ error: 'Invalid admin token' });
    }
    
    req.admin = admin.data;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid admin token' });
  }
};
```

### Admin Activity Logging
```javascript
// Log all admin actions
const logAdminAction = async (adminId, action, targetType, targetId, details, req) => {
  await supabase.from('admin_logs').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get('User-Agent')
  });
};

// Middleware to log admin actions
const auditLog = (action, targetType) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log successful actions
      if (res.statusCode < 400) {
        logAdminAction(
          req.admin.id,
          action,
          targetType,
          req.params.id,
          { body: req.body, params: req.params },
          req
        );
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};
```

## 🚨 Security Monitoring

### Error Handling & Logging
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Security event logging
const logSecurityEvent = (type, details, req) => {
  logger.warn('Security Event', {
    type,
    details,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
};

// Usage
app.use('/api/auth/login', (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (res.statusCode === 401) {
      logSecurityEvent('failed_login', {
        email: req.body.email,
        statusCode: res.statusCode
      }, req);
    }
    
    originalSend.call(this, data);
  };
  
  next();
});
```

### Security Metrics
```javascript
// Track security metrics
class SecurityMetrics {
  static async recordFailedLogin(email, ip) {
    await supabase.from('security_events').insert({
      event_type: 'failed_login',
      email,
      ip_address: ip,
      created_at: new Date()
    });
  }
  
  static async getFailedLoginAttempts(timeWindow = '1 hour') {
    const result = await supabase
      .from('security_events')
      .select('*')
      .eq('event_type', 'failed_login')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000));
      
    return result.data || [];
  }
  
  static async detectBruteForce(ip, threshold = 5) {
    const attempts = await this.getFailedLoginAttempts();
    const ipAttempts = attempts.filter(attempt => attempt.ip_address === ip);
    
    return ipAttempts.length >= threshold;
  }
}
```

## 🔧 Security Configuration

### Environment Variables
```bash
# Security-related environment variables
JWT_SECRET=your-very-long-and-random-jwt-secret-key
ADMIN_JWT_SECRET=different-secret-for-admin-tokens
BCRYPT_SALT_ROUNDS=12
SESSION_SECRET=session-secret-key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
CORS_ORIGIN=https://yourdomain.com
DATABASE_SSL=true
FORCE_HTTPS=true
```

### Production Security Checklist

#### Server Security
- [ ] Use HTTPS in production
- [ ] Configure secure headers (Helmet.js)
- [ ] Enable rate limiting
- [ ] Set up proper CORS
- [ ] Use environment variables for secrets
- [ ] Implement request logging
- [ ] Set up monitoring and alerts

#### Database Security
- [ ] Enable Row Level Security (RLS)
- [ ] Use connection pooling
- [ ] Encrypt sensitive data at rest
- [ ] Regular security updates
- [ ] Implement backup encryption
- [ ] Monitor for suspicious queries

#### Authentication Security
- [ ] Use strong JWT secrets
- [ ] Implement token expiration
- [ ] Add refresh token mechanism
- [ ] Enable two-factor authentication (future)
- [ ] Implement password policies
- [ ] Add account lockout mechanisms

#### Multi-Tenant Security
- [ ] Verify data isolation
- [ ] Test cross-account access prevention
- [ ] Implement account-scoped rate limiting
- [ ] Add tenant-specific security policies
- [ ] Monitor inter-tenant access attempts

## 🆘 Security Incident Response

### Incident Types
1. **Data Breach**: Unauthorized access to tenant data
2. **Account Compromise**: Compromised user or admin accounts
3. **System Intrusion**: Unauthorized system access
4. **DDoS Attack**: Service availability threats

### Response Procedures

#### Immediate Response
```javascript
// Emergency account lockdown
const emergencyLockdown = async (accountId, reason) => {
  await supabase
    .from('accounts')
    .update({ 
      status: 'suspended',
      suspension_reason: reason,
      suspended_at: new Date()
    })
    .eq('id', accountId);
    
  // Invalidate all tokens for the account
  await invalidateAccountTokens(accountId);
  
  // Log the incident
  logger.error('Emergency Lockdown', {
    accountId,
    reason,
    timestamp: new Date()
  });
};
```

#### Security Notifications
```javascript
// Notification system for security events
const sendSecurityAlert = async (type, details) => {
  const admins = await getSecurityAdmins();
  
  for (const admin of admins) {
    await sendEmail(admin.email, {
      subject: `Security Alert: ${type}`,
      body: `Security event detected: ${JSON.stringify(details)}`,
      priority: 'high'
    });
  }
};
```

This security guide provides comprehensive protection for the multi-tenant tennis court rental application. Regular security audits and updates are essential to maintain the security posture of the system.
