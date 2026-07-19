const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const WebSocket = require('ws');
const { nowUTC } = require('./utils/dateUtils');
const { dateStandardizationMiddleware, standardizeDatesInResponse } = require('./utils/responseUtils');

const authRoutes = require('./routes/auth');
const setupRoutes = require('./routes/setup');
const accountRoutes = require('./routes/accounts');
const userRoutes = require('./routes/users');
const clientRoutes = require('./routes/clients');
const courtRoutes = require('./routes/courts');
const rentalRoutes = require('./routes/rentals');
const platformSettingsRoutes = require('./routes/platformSettings');

// Admin routes
const adminAuthRoutes = require('./routes/adminAuth');
const adminAccountRoutes = require('./routes/adminAccounts');
const adminUserRoutes = require('./routes/adminUsers');
const adminPaymentRoutes = require('./routes/adminPayments');
const adminLogRoutes = require('./routes/adminLogs');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// WebSocket server setup
const wss = new WebSocket.Server({ server });

// Store connected clients with their account info
const clients = new Map();

wss.on('connection', (ws, req) => {
  console.log('WebSocket connection established');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'authenticate' && data.account_id) {
        // Store the client with their account ID
        clients.set(ws, { account_id: data.account_id });
        console.log(`WebSocket client authenticated for account: ${data.account_id}`);
        
        ws.send(JSON.stringify({ 
          type: 'authenticated', 
          success: true 
        }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket connection closed');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Function to broadcast rental updates to specific account
const broadcastRentalUpdate = (account_id, rental, type = 'rental_created') => {
  console.log(`Broadcasting ${type} to account ${account_id}, connected clients: ${clients.size}`);
  
  // Standardize dates in rental data to match REST API format
  const standardizedRental = standardizeDatesInResponse(rental);
  
  const message = JSON.stringify({
    type,
    data: standardizedRental,
    account_id,
    timestamp: nowUTC()
  });
  
  let broadcastCount = 0;
  clients.forEach((clientInfo, ws) => {
    console.log(`Client account: ${clientInfo.account_id} (type: ${typeof clientInfo.account_id}), target: ${account_id} (type: ${typeof account_id}), readyState: ${ws.readyState}`);
    if (String(clientInfo.account_id) === String(account_id) && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      broadcastCount++;
    }
  });
  
  console.log(`Broadcasted to ${broadcastCount} clients`);
};

// Make broadcast function available to other modules
app.locals.broadcastRentalUpdate = broadcastRentalUpdate;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4321',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 1000 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Date standardization middleware - ensure all API responses have consistent date formats
app.use(dateStandardizationMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/courts', courtRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/platform-settings', platformSettingsRoutes);

// Admin routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/accounts', adminAccountRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/payments', adminPaymentRoutes);
app.use('/api/admin/logs', adminLogRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: nowUTC() });
});

// Keep-alive: pings Supabase para evitar que la DB free se pause (llamar via cron)
app.get('/api/keep-alive', async (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase env vars' });
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/accounts?select=id&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    res.json({
      status: response.ok ? 'OK' : 'ERROR',
      httpStatus: response.status,
      timestamp: nowUTC(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
      timestamp: nowUTC(),
    });
  }
});

// Admin system health endpoint
app.get('/api/admin/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: nowUTC(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Only start server if not in serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  console.log('About to call server.listen...');
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
