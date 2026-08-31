const request = require('supertest');
const { createApp } = require('./setup/testApp');

describe('POST /api/agenda/rentals', () => {
  const validBody = {
    client_id: 'c-0001',
    court_id: 'ct-0001',
    start_datetime: '2024-06-15T14:00:00.000Z',
    end_datetime: '2024-06-15T15:00:00.000Z',
    notes: 'Test rental',
    status: 'confirmed',
    is_recurring: false
  };

  const clientRow = { id: 'c-0001' };
  const courtRow = { hourly_rate: 100, status: 'available' };
  const createdRental = {
    id: 'r-0001',
    account_id: 'acct-0001',
    client_id: 'c-0001',
    court_id: 'ct-0001',
    user_id: 'user-0001',
    start_datetime: '2024-06-15T14:00:00.000Z',
    end_datetime: '2024-06-15T15:00:00.000Z',
    total_amount: 100,
    status: 'confirmed',
    notes: 'Test rental',
    is_recurring: false,
    client: { full_name: 'John', email: 'john@test.com', phone: '1234' },
    court: { name: 'Court 1', hourly_rate: 100 },
    user: { full_name: 'Test Admin', email: 'admin@test.com' }
  };

  test('returns 400 if client_id is missing', async () => {
    const app = createApp({});
    const res = await request(app).post('/api/agenda/rentals').send({ ...validBody, client_id: undefined });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/client.*court.*start.*end/i);
  });

  test('returns 400 if start_datetime >= end_datetime', async () => {
    const app = createApp({});
    const res = await request(app).post('/api/agenda/rentals').send({
      ...validBody,
      start_datetime: '2024-06-15T15:00:00.000Z',
      end_datetime: '2024-06-15T14:00:00.000Z'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/start.*before.*end/i);
  });

  test('returns 404 if client not found', async () => {
    const app = createApp({
      clients: { data: null, error: { code: 'PGRST116', message: 'Not found' } }
    });
    const res = await request(app).post('/api/agenda/rentals').send(validBody);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/client not found/i);
  });

  test('returns 404 if court not found', async () => {
    const app = createApp({
      clients: { data: clientRow, error: null },
      courts: { data: null, error: { code: 'PGRST116', message: 'Not found' } }
    });
    const res = await request(app).post('/api/agenda/rentals').send(validBody);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/court not found/i);
  });

  test('returns 400 if court is not available', async () => {
    const app = createApp({
      clients: { data: clientRow, error: null },
      courts: { data: { hourly_rate: 100, status: 'maintenance' }, error: null }
    });
    const res = await request(app).post('/api/agenda/rentals').send(validBody);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/court is not available/i);
  });

  test('returns 400 if time slot overlaps with existing rental', async () => {
    const app = createApp({
      clients: { data: clientRow, error: null },
      courts: { data: courtRow, error: null },
      rentals: {
        data: [{
          id: 'r-existing',
          start_datetime: '2024-06-15T14:30:00.000Z',
          end_datetime: '2024-06-15T15:30:00.000Z'
        }],
        error: null
      }
    });
    const res = await request(app).post('/api/agenda/rentals').send(validBody);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already booked/i);
  });

  test('returns 201 and broadcasts on successful creation', async () => {
    const app = createApp({
      clients: { data: clientRow, error: null },
      courts: { data: courtRow, error: null },
      rentals: [
        { data: [], error: null },
        { data: createdRental, error: null }
      ]
    });

    const res = await request(app).post('/api/agenda/rentals').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('r-0001');
    expect(res.body.total_amount).toBe(100);
    expect(app.locals.broadcastRentalUpdate).toHaveBeenCalledWith(
      'acct-0001',
      createdRental,
      'rental_created'
    );
  });

  test('does not crash if broadcastRentalUpdate is not set', async () => {
    const app = createApp({
      clients: { data: clientRow, error: null },
      courts: { data: courtRow, error: null },
      rentals: [
        { data: [], error: null },
        { data: createdRental, error: null }
      ]
    });
    delete app.locals.broadcastRentalUpdate;

    const res = await request(app).post('/api/agenda/rentals').send(validBody);
    expect(res.status).toBe(201);
  });

  test('returns 500 if DB errors on insert', async () => {
    const app = createApp({
      clients: { data: clientRow, error: null },
      courts: { data: courtRow, error: null },
      rentals: [
        { data: [], error: null },
        { data: null, error: { message: 'Insert failed' } }
      ]
    });
    const res = await request(app).post('/api/agenda/rentals').send(validBody);
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Insert failed');
  });
});
