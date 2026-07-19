const express = require('express');

jest.mock('../../config/supabase', () => require('./supabaseMock'));

jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = {
      id: 'user-0001',
      email: 'admin@test.com',
      full_name: 'Test Admin',
      role: 'admin',
      is_active: true,
      account_id: 'acct-0001',
      account_timezone: 'America/Argentina/Buenos_Aires',
      account: { status: 'active', is_locked: false }
    };
    next();
  },
  requireRole: () => (req, res, next) => next()
}));

const agendaRoutes = require('../../routes/agenda');
const supabaseMock = require('./supabaseMock');

function createApp(supabaseConfig = {}) {
  supabaseMock.setConfig(supabaseConfig);

  const app = express();
  app.use(express.json());
  app.locals.broadcastRentalUpdate = jest.fn();
  app.use('/api/agenda', agendaRoutes);

  return app;
}

module.exports = { createApp, setSupabaseConfig: supabaseMock.setConfig };
