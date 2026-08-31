/**
 * Level C tests for the hexagonal POST /rentals path:
 * HTTP contract (codes, shapes), auth-context precedence and notification.
 * Supabase is mocked at the client level (same mock as the legacy suite).
 */

const express = require('express');
const request = require('supertest');

jest.mock('../../../../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = {
      id: 'user-0001',
      email: 'admin@test.com',
      role: 'admin',
      is_active: true,
      account_id: 'acct-0001',
      account_timezone: 'America/Argentina/Buenos_Aires',
      account: { status: 'active', is_locked: false }
    };
    next();
  },
  requireRole: () => (req, res, next) => next(),
}));

jest.mock('../../../../config/supabase', () => require('../../../../__tests__/setup/supabaseMock'));

const supabaseMock = require('../../../../__tests__/setup/supabaseMock');
const { makeSupabaseRentalRepository } = require('../../persistence/supabase-rental.repository');
const { makeSupabaseCourtRepository } = require('../../persistence/supabase-court.repository');
const { makeSupabaseClientRepository } = require('../../persistence/supabase-client.repository');
const { makeAgendaRouter } = require('../routes/agenda.routes');

const storedRental = {
  id: 'r-9',
  account_id: 'acct-0001',
  client_id: 'cli-1',
  court_id: 'court-1',
  start_datetime: '2026-09-01T13:00:00.000Z',
  end_datetime: '2026-09-01T15:00:00.000Z',
  total_amount: 10000,
  status: 'pending',
  is_recurring: false,
  notes: null,
  client: { full_name: 'Juan' },
  court: { name: 'Cancha 1' },
  user: { full_name: 'Admin' },
};

const buildApp = ({ supabaseConfig = {}, broadcast } = {}) => {
  supabaseMock.setConfig(supabaseConfig);
  const supabase = supabaseMock;
  const notifier = { notify: broadcast || jest.fn() };
  const createRental = require('../../../application/use-cases/create-rental').makeCreateRental({
    clientRepo: makeSupabaseClientRepository({ supabase }),
    courtRepo: makeSupabaseCourtRepository({ supabase }),
    rentalRepo: makeSupabaseRentalRepository({ supabase }),
  });
  const app = express();
  app.use(express.json());
  app.use('/api/agenda', makeAgendaRouter({ createRental, notifier }));
  return { app, notifier };
};

const validBody = {
  client_id: 'cli-1',
  court_id: 'court-1',
  start_datetime: '2026-09-01T13:00:00Z',
  end_datetime: '2026-09-01T15:00:00Z',
};

const happyConfig = () => ({
  clients: { data: { id: 'cli-1' }, error: null },
  courts: { data: { id: 'court-1', hourly_rate: 5000, status: 'available' }, error: null },
  rentals: [
    { data: [{ id: 'r-other', start_datetime: 'x', end_datetime: 'y', status: 'cancelled' }], error: null }, // listByCourt
    { data: storedRental, error: null }, // insert
  ],
});

describe('POST /api/agenda/rentals (hexagonal path)', () => {
  test('201 with the stored rental including relations, contract preserved', async () => {
    const { app } = buildApp({ supabaseConfig: happyConfig() });

    const res = await request(app).post('/api/agenda/rentals').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(storedRental);
  });

  test('notifies rental_created through the NotificationPort', async () => {
    const broadcast = jest.fn();
    const { app } = buildApp({ supabaseConfig: happyConfig(), broadcast });

    await request(app).post('/api/agenda/rentals').send(validBody);

    expect(broadcast).toHaveBeenCalledWith('acct-0001', storedRental, 'rental_created');
  });

  test('400 missing required fields (legacy message)', async () => {
    const { app } = buildApp({ supabaseConfig: {} });

    const res = await request(app).post('/api/agenda/rentals').send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Client, court, start and end datetime are required' });
  });

  test('400 invalid range (legacy message)', async () => {
    const { app } = buildApp({ supabaseConfig: {} });

    const res = await request(app)
      .post('/api/agenda/rentals')
      .send({ ...validBody, start_datetime: '2026-09-01T15:00:00Z', end_datetime: '2026-09-01T15:00:00Z' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Start datetime must be before end datetime' });
  });

  test('404 client not found', async () => {
    const { app } = buildApp({
      supabaseConfig: { clients: { data: null, error: { code: 'PGRST116', message: 'no rows' } } },
    });

    const res = await request(app).post('/api/agenda/rentals').send(validBody);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Client not found' });
  });

  test('404 court not found', async () => {
    const { app } = buildApp({
      supabaseConfig: {
        clients: { data: { id: 'cli-1' }, error: null },
        courts: { data: null, error: { code: 'PGRST116', message: 'no rows' } },
      },
    });

    const res = await request(app).post('/api/agenda/rentals').send(validBody);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Court not found' });
  });

  test('400 court not available', async () => {
    const { app } = buildApp({
      supabaseConfig: {
        clients: { data: { id: 'cli-1' }, error: null },
        courts: { data: { id: 'court-1', hourly_rate: 5000, status: 'maintenance' }, error: null },
      },
    });

    const res = await request(app).post('/api/agenda/rentals').send(validBody);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Court is not available' });
  });

  test('400 on overlap — legacy conflict code preserved (NOT 409)', async () => {
    const { app } = buildApp({
      supabaseConfig: {
        clients: { data: { id: 'cli-1' }, error: null },
        courts: { data: { id: 'court-1', hourly_rate: 5000, status: 'available' }, error: null },
        rentals: {
          data: [{ id: 'r-1', start_datetime: '2026-09-01T14:00:00Z', end_datetime: '2026-09-01T16:00:00Z', status: 'confirmed' }],
          error: null,
        },
      },
    });

    const res = await request(app).post('/api/agenda/rentals').send(validBody);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Court is already booked for this time slot' });
  });

  test('auth context wins over spoofed account_id in the body', async () => {
    const { app, notifier } = buildApp({ supabaseConfig: happyConfig() });

    const res = await request(app)
      .post('/api/agenda/rentals')
      .send({ ...validBody, account_id: 'acct-EVIL', user_id: 'usr-EVIL' });

    expect(res.status).toBe(201);
    expect(res.body.account_id).toBe('acct-0001');
    expect(notifier.notify).toHaveBeenCalledWith('acct-0001', expect.anything(), 'rental_created');
  });
});
