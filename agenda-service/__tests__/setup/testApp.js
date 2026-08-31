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

const supabaseMock = require('./supabaseMock');
const { makeSupabaseRentalRepository } = require('../../src/infrastructure/persistence/supabase-rental.repository');
const { makeSupabaseCourtRepository } = require('../../src/infrastructure/persistence/supabase-court.repository');
const { makeSupabaseClientRepository } = require('../../src/infrastructure/persistence/supabase-client.repository');
const { makeSupabaseExceptionRepository } = require('../../src/infrastructure/persistence/supabase-exception.repository');
const { makeWsNotifier } = require('../../src/infrastructure/realtime/ws-notifier');
const { makeCreateRental } = require('../../src/application/use-cases/create-rental');
const { makeUpdateRental } = require('../../src/application/use-cases/update-rental');
const { makeUpdateRentalStatus } = require('../../src/application/use-cases/update-rental-status');
const { makeGetCalendarView } = require('../../src/application/use-cases/get-calendar-view');
const { makeListExceptions } = require('../../src/application/use-cases/exceptions/list-exceptions');
const { makeCreateException } = require('../../src/application/use-cases/exceptions/create-exception');
const { makeDeleteException } = require('../../src/application/use-cases/exceptions/delete-exception');
const { makeAgendaRouter } = require('../../src/infrastructure/http/routes/agenda.routes');

/**
 * Since Phase 4, the legacy fat routes are gone: this harness builds the full
 * hexagonal stack on top of the Supabase mock. The pre-existing 52 contract
 * tests now double as the behavior-equivalence proof of the migration.
 */
function createApp(supabaseConfig = {}) {
  supabaseMock.setConfig(supabaseConfig);

  const supabase = supabaseMock;
  const rentalRepo = makeSupabaseRentalRepository({ supabase });
  const courtRepo = makeSupabaseCourtRepository({ supabase });
  const clientRepo = makeSupabaseClientRepository({ supabase });
  const exceptionRepo = makeSupabaseExceptionRepository({ supabase });

  const app = express();
  app.use(express.json());
  app.locals.broadcastRentalUpdate = jest.fn();

  // fire-and-forget: delegating to app.locals keeps broadcast assertions in
  // the legacy contract tests working, and survives the key being deleted
  const notifier = makeWsNotifier({
    broadcast: (...args) => app.locals.broadcastRentalUpdate(...args),
  });

  const router = makeAgendaRouter({
    createRental: makeCreateRental({ clientRepo, courtRepo, rentalRepo, notifier }),
    updateRental: makeUpdateRental({ rentalRepo, courtRepo, exceptionRepo, notifier }),
    updateRentalStatus: makeUpdateRentalStatus({ rentalRepo, exceptionRepo, notifier }),
    getCalendarView: makeGetCalendarView({ rentalRepo, exceptionRepo }),
    listExceptions: makeListExceptions({ rentalRepo, exceptionRepo }),
    createException: makeCreateException({ rentalRepo, exceptionRepo }),
    deleteException: makeDeleteException({ rentalRepo, exceptionRepo }),
  });

  app.use('/api/agenda', router);

  return app;
}

module.exports = { createApp, setSupabaseConfig: supabaseMock.setConfig };
