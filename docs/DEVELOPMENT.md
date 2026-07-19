# Development Guide

This guide covers development best practices, coding standards, and workflow recommendations for the Tennis Court Rental App.

## 🛠️ Development Environment Setup

### Prerequisites
- Node.js (v18+ recommended)
- Git
- VS Code or your preferred IDE
- Docker (optional, for containerized development)
- Supabase CLI (optional, for local database management)

### Initial Setup
```bash
# Clone the repository
git clone https://github.com/your-org/alquiler-de-canchas.git
cd alquiler-de-canchas

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Setup environment variables
cp backend/.env.example backend/.env
# Edit .env with your configuration
```

### Development Workflow
```bash
# Start backend development server
cd backend
npm run dev

# In another terminal, start frontend
cd frontend
npm run dev

# Access the application
# Frontend: http://localhost:4321
# Backend API: http://localhost:3000
```

## 🏗️ Project Architecture

### Technology Stack
- **Backend**: Node.js, Express.js, JWT Authentication
- **Frontend**: Astro, Vue.js 3, TypeScript
- **Database**: PostgreSQL (via Supabase)
- **Deployment**: Vercel, Docker
- **Version Control**: Git with conventional commits

### Directory Structure
```
├── backend/              # Express API server
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── routes/          # API route handlers
│   ├── utils/           # Utility functions
│   └── server.js        # Main server file
├── frontend/            # Astro frontend
│   ├── src/
│   │   ├── components/  # Vue components
│   │   ├── layouts/     # Astro layouts
│   │   ├── pages/       # Astro pages
│   │   ├── styles/      # CSS styles
│   │   └── utils/       # Frontend utilities
│   └── public/          # Static assets
├── database/            # Database schemas and migrations
├── docs/                # Documentation
└── docker-compose.yml   # Docker configuration
```

## 📝 Coding Standards

### JavaScript/TypeScript Standards
```javascript
// Use ES6+ features
const getUserById = async (id) => {
  try {
    const user = await User.findById(id);
    return user;
  } catch (error) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
};

// Use destructuring
const { email, password } = req.body;

// Use arrow functions for callbacks
users.map(user => ({
  id: user.id,
  name: user.full_name,
  email: user.email
}));
```

### Vue.js Component Standards
```vue
<template>
  <div class="component-name">
    <h2>{{ title }}</h2>
    <button @click="handleClick" :disabled="loading">
      {{ loading ? 'Processing...' : 'Submit' }}
    </button>
  </div>
</template>

<script>
export default {
  name: 'ComponentName',
  props: {
    title: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      loading: false
    };
  },
  methods: {
    async handleClick() {
      this.loading = true;
      try {
        await this.processAction();
      } catch (error) {
        this.$emit('error', error.message);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.component-name {
  padding: 1rem;
}
</style>
```

### API Route Standards
```javascript
// routes/users.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/users - List users (account-filtered)
router.get('/', auth, async (req, res) => {
  try {
    const { account_id } = req.user;
    const users = await supabase
      .from('users')
      .select('*')
      .eq('account_id', account_id);
    
    res.json(users.data);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch users',
      message: error.message 
    });
  }
});

// POST /api/users - Create user
router.post('/', [
  auth,
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').notEmpty().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Implementation...
});

module.exports = router;
```

## 🔐 Multi-Tenancy Development Guidelines

### Account Context Awareness
Always ensure account isolation in your code:

```javascript
// ✅ Good - Account-aware query
const getClients = async (req, res) => {
  const { account_id } = req.user;
  const clients = await supabase
    .from('clients')
    .select('*')
    .eq('account_id', account_id);
  res.json(clients.data);
};

// ❌ Bad - Missing account filter
const getClients = async (req, res) => {
  const clients = await supabase
    .from('clients')
    .select('*');
  res.json(clients.data);
};
```

### JWT Token Handling
```javascript
// Always include account context in JWT
const generateToken = (user) => {
  return jwt.sign({
    userId: user.id,
    email: user.email,
    role: user.role,
    account_id: user.account_id,    // Essential for multi-tenancy
    account_slug: user.account.slug
  }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};
```

### Database Query Patterns
```javascript
// Use account_id in all queries
const createRental = async (rentalData, user) => {
  const rental = await supabase
    .from('rentals')
    .insert({
      ...rentalData,
      account_id: user.account_id  // Always set account context
    });
  return rental;
};

// Check for data overlap within account scope
const checkCourtAvailability = async (courtId, startTime, endTime, accountId) => {
  const overlap = await supabase
    .from('rentals')
    .select('id')
    .eq('account_id', accountId)  // Account-scoped check
    .eq('court_id', courtId)
    .overlaps('time_range', `[${startTime},${endTime})`);
  
  return overlap.data.length === 0;
};
```

## 🧪 Testing Guidelines

### Unit Testing
```javascript
// tests/routes/users.test.js
const request = require('supertest');
const app = require('../server');

describe('Users API', () => {
  let authToken;
  let testAccount;

  beforeEach(async () => {
    // Setup test account and auth token
    testAccount = await createTestAccount();
    authToken = generateTestToken(testAccount.admin);
  });

  afterEach(async () => {
    // Cleanup test data
    await cleanupTestAccount(testAccount.id);
  });

  it('should return only users from authenticated account', async () => {
    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].account_id).toBe(testAccount.id);
  });
});
```

### Multi-Tenancy Testing
```javascript
// Always test data isolation
it('should not return data from other accounts', async () => {
  // Create two test accounts
  const account1 = await createTestAccount('Account 1');
  const account2 = await createTestAccount('Account 2');
  
  // Create data in each account
  await createTestClient(account1.id, 'Client A');
  await createTestClient(account2.id, 'Client B');
  
  // Test that each account only sees its own data
  const token1 = generateTestToken(account1.admin);
  const response1 = await request(app)
    .get('/api/clients')
    .set('Authorization', `Bearer ${token1}`)
    .expect(200);
  
  expect(response1.body).toHaveLength(1);
  expect(response1.body[0].full_name).toBe('Client A');
});
```

### Frontend Testing
```javascript
// tests/components/ClientsManager.test.js
import { mount } from '@vue/test-utils';
import ClientsManager from '@/components/managers/ClientsManager.vue';

describe('ClientsManager', () => {
  it('should display clients for current account only', async () => {
    const wrapper = mount(ClientsManager, {
      global: {
        mocks: {
          $api: {
            get: jest.fn().mockResolvedValue({
              data: [
                { id: '1', full_name: 'John Doe', account_id: 'account-1' }
              ]
            })
          }
        }
      }
    });

    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('John Doe');
  });
});
```

## 🔍 Debugging Techniques

### Backend Debugging
```javascript
// Add debugging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    user: req.user?.email,
    account: req.user?.account_id,
    body: req.body
  });
  next();
});

// Database query debugging
const debugQuery = async (query, params) => {
  console.log('Query:', query);
  console.log('Params:', params);
  const result = await supabase.rpc(query, params);
  console.log('Result:', result.data);
  return result;
};
```

### Frontend Debugging
```javascript
// Debug API calls
const api = {
  async get(url) {
    console.log('API GET:', url);
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    console.log('API Response:', data);
    return data;
  }
};
```

## 📊 Performance Optimization

### Database Optimization
```sql
-- Add indexes for account-based queries
CREATE INDEX idx_clients_account_id ON clients(account_id);
CREATE INDEX idx_rentals_account_court_date ON rentals(account_id, court_id, start_datetime);

-- Use EXPLAIN ANALYZE to check query performance
EXPLAIN ANALYZE SELECT * FROM rentals WHERE account_id = 'uuid' AND court_id = 'uuid';
```

### Frontend Optimization
```javascript
// Lazy load components
const ClientsManager = defineAsyncComponent(() => 
  import('@/components/managers/ClientsManager.vue')
);

// Implement pagination
const loadClients = async (page = 1, limit = 50) => {
  const response = await api.get(`/api/clients?page=${page}&limit=${limit}`);
  return response;
};

// Cache API responses
const cache = new Map();
const getCachedClients = async () => {
  if (cache.has('clients')) {
    return cache.get('clients');
  }
  const clients = await api.get('/api/clients');
  cache.set('clients', clients);
  return clients;
};
```

## 🚀 Deployment Best Practices

### Environment Configuration
```bash
# .env.example
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-key
FRONTEND_URL=http://localhost:4321
```

### Build Process
```json
{
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js",
    "build": "npm run build:frontend && npm run build:backend",
    "test": "jest",
    "lint": "eslint . --ext .js,.vue",
    "lint:fix": "eslint . --ext .js,.vue --fix"
  }
}
```

## 🔄 Git Workflow

### Branch Strategy
```bash
# Main branches
main        # Production-ready code
develop     # Integration branch

# Feature branches
feature/user-management
feature/payment-system
feature/multi-tenancy

# Hotfix branches
hotfix/security-patch
hotfix/critical-bug
```

### Commit Messages
```bash
# Use conventional commits
feat: add user management functionality
fix: resolve JWT token expiration issue
docs: update API documentation
test: add unit tests for rental system
refactor: improve database query performance
```

### Pull Request Process
1. Create feature branch from `develop`
2. Implement feature with tests
3. Update documentation
4. Create pull request to `develop`
5. Code review and approval
6. Merge to `develop`
7. Deploy to staging for testing
8. Merge to `main` for production

## 📝 Code Review Checklist

### Security Checklist
- [ ] All database queries include account filtering
- [ ] JWT tokens are properly validated
- [ ] User input is sanitized and validated
- [ ] Error messages don't leak sensitive information
- [ ] CORS is properly configured

### Multi-Tenancy Checklist
- [ ] Account context is maintained throughout request lifecycle
- [ ] Data isolation is enforced at database level
- [ ] No cross-account data access is possible
- [ ] Account limits are respected
- [ ] RLS policies are properly implemented

### Performance Checklist
- [ ] Database queries are optimized with proper indexes
- [ ] API responses are paginated for large datasets
- [ ] Frontend components use lazy loading where appropriate
- [ ] Caching is implemented for frequently accessed data
- [ ] Error handling doesn't cause performance degradation

## 🆘 Common Development Issues

### Multi-Tenancy Issues
```javascript
// Issue: Forgetting account context
// Solution: Always check user.account_id
const middleware = (req, res, next) => {
  if (!req.user?.account_id) {
    return res.status(403).json({ error: 'Account context required' });
  }
  next();
};
```

### Database Connection Issues
```javascript
// Issue: Connection timeouts
// Solution: Implement connection pooling and retry logic
const supabaseClient = createClient(url, key, {
  db: {
    pooler: true,
    maxConnections: 10,
    idleTimeout: 30000
  }
});
```

### Frontend State Management
```javascript
// Issue: State inconsistency across components
// Solution: Use reactive state management
import { reactive } from 'vue';

export const accountState = reactive({
  currentAccount: null,
  users: [],
  clients: [],
  
  setAccount(account) {
    this.currentAccount = account;
  },
  
  addClient(client) {
    this.clients.push(client);
  }
});
```

## 📚 Learning Resources

### Documentation
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Vue.js 3 Documentation](https://vuejs.org/guide/)
- [Astro Documentation](https://docs.astro.build/)
- [Supabase Documentation](https://supabase.com/docs)

### Best Practices
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Vue.js Style Guide](https://vuejs.org/style-guide/)
- [Multi-Tenant Architecture Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/)

This development guide should help maintain code quality and consistency across the project. Always prioritize security and data isolation when working with the multi-tenant architecture.
