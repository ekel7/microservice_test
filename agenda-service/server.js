const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const WebSocket = require('ws');
const { nowUTC } = require('./src/domain/services/time');
const { dateStandardizationMiddleware, standardizeDatesInResponse } = require('./src/infrastructure/http/middleware/date-standardization');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// WebSocket server setup
const wss = new WebSocket.Server({ server });

// Store connected clients with their account info
const clients = new Map();

wss.on('connection', (ws, req) => {
  console.log('Agenda WebSocket connection established');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'authenticate' && data.account_id) {
        // Store the client with their account ID
        clients.set(ws, { account_id: data.account_id });
        console.log(`Agenda WebSocket client authenticated for account: ${data.account_id}`);

        ws.send(JSON.stringify({
          type: 'authenticated',
          success: true
        }));
      }
    } catch (error) {
      console.error('Agenda WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`Agenda WebSocket client disconnected`);
  });

  ws.on('error', (error) => {
    console.error('Agenda WebSocket error:', error);
    clients.delete(ws);
  });
});

// Function to broadcast rental updates to specific account
const broadcastRentalUpdate = (account_id, rental, type = 'rental_created') => {
  console.log(`Agenda broadcasting ${type} to account ${account_id}, connected clients: ${clients.size}`);

  const standardizedRental = standardizeDatesInResponse(rental);

  const message = JSON.stringify({
    type,
    data: standardizedRental,
    account_id,
    timestamp: nowUTC()
  });

  let broadcastCount = 0;
  clients.forEach((clientInfo, ws) => {
    if (String(clientInfo.account_id) === String(account_id) && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      broadcastCount++;
    }
  });

  console.log(`Agenda broadcasted to ${broadcastCount} clients`);
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
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Date standardization middleware - ensure all API responses have consistent date formats
app.use(dateStandardizationMiddleware);

// ============================================
// Hexagonal wiring (Phase 4 — all endpoints via use cases)
// See docs/HEXAGONAL_MIGRATION.md
// ============================================
const supabase = require('./src/infrastructure/persistence/supabase-client');
const { makeSupabaseRentalRepository } = require('./src/infrastructure/persistence/supabase-rental.repository');
const { makeSupabaseCourtRepository } = require('./src/infrastructure/persistence/supabase-court.repository');
const { makeSupabaseClientRepository } = require('./src/infrastructure/persistence/supabase-client.repository');
const { makeSupabaseExceptionRepository } = require('./src/infrastructure/persistence/supabase-exception.repository');
const { makeWsNotifier } = require('./src/infrastructure/realtime/ws-notifier');
const { makeCreateRental } = require('./src/application/use-cases/create-rental');
const { makeUpdateRental } = require('./src/application/use-cases/update-rental');
const { makeUpdateRentalStatus } = require('./src/application/use-cases/update-rental-status');
const { makeGetCalendarView } = require('./src/application/use-cases/get-calendar-view');
const { makeListExceptions } = require('./src/application/use-cases/exceptions/list-exceptions');
const { makeCreateException } = require('./src/application/use-cases/exceptions/create-exception');
const { makeDeleteException } = require('./src/application/use-cases/exceptions/delete-exception');
const { makeAgendaRouter } = require('./src/infrastructure/http/routes/agenda.routes');

const rentalRepo = makeSupabaseRentalRepository({ supabase });
const courtRepo = makeSupabaseCourtRepository({ supabase });
const clientRepo = makeSupabaseClientRepository({ supabase });
const exceptionRepo = makeSupabaseExceptionRepository({ supabase });
const notifier = makeWsNotifier({ broadcast: broadcastRentalUpdate });

const agendaRouter = makeAgendaRouter({
  createRental: makeCreateRental({ clientRepo, courtRepo, rentalRepo, notifier }),
  updateRental: makeUpdateRental({ rentalRepo, courtRepo, exceptionRepo, notifier }),
  updateRentalStatus: makeUpdateRentalStatus({ rentalRepo, exceptionRepo, notifier }),
  getCalendarView: makeGetCalendarView({ rentalRepo, exceptionRepo }),
  listExceptions: makeListExceptions({ rentalRepo, exceptionRepo }),
  createException: makeCreateException({ rentalRepo, exceptionRepo }),
  deleteException: makeDeleteException({ rentalRepo, exceptionRepo }),
});

// Routes
app.use('/api/agenda', agendaRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'agenda-service', timestamp: nowUTC() });
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
    console.log(`Agenda service running on port ${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
