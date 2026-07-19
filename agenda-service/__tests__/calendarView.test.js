const request = require('supertest');
const { createApp } = require('./setup/testApp');

describe('GET /api/agenda/calendar/view', () => {
  const validQuery = { start_date: '2024-06-01', end_date: '2024-06-30' };

  const regularRental = {
    id: 'r-0001',
    client_id: 'c-0001',
    court_id: 'ct-0001',
    start_datetime: '2024-06-15T14:00:00.000Z',
    end_datetime: '2024-06-15T15:00:00.000Z',
    status: 'confirmed',
    total_amount: 100,
    notes: null,
    is_recurring: false,
    client: { id: 'c-0001', full_name: 'John', phone: '1234' },
    court: { id: 'ct-0001', name: 'Court 1', hourly_rate: 100 }
  };

  const recurringRental = {
    ...regularRental,
    id: 'r-0002',
    is_recurring: true
  };

  const exception = {
    id: 'e-0001',
    rental_id: 'r-0002',
    exception_date: '2024-06-22',
    exception_type: 'cancelled'
  };

  test('returns 400 if start_date is missing', async () => {
    const app = createApp({});
    const res = await request(app).get('/api/agenda/calendar/view').query({ end_date: '2024-06-30' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/start date/i);
  });

  test('returns 400 if end_date is missing', async () => {
    const app = createApp({});
    const res = await request(app).get('/api/agenda/calendar/view').query({ start_date: '2024-06-01' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/end date/i);
  });

  test('returns 200 with regular + recurring rentals and exceptions', async () => {
    const app = createApp({
      rentals: [
        { data: [regularRental], error: null },
        { data: [recurringRental], error: null }
      ],
      rental_exceptions: { data: [exception], error: null }
    });

    const res = await request(app).get('/api/agenda/calendar/view').query(validQuery);

    expect(res.status).toBe(200);
    expect(res.body.rentals).toHaveLength(2);
    expect(res.body.rentals[0].id).toBe('r-0001');
    expect(res.body.rentals[1].id).toBe('r-0002');
    expect(res.body.exceptions).toHaveLength(1);
    expect(res.body.exceptions[0].id).toBe('e-0001');
  });

  test('returns 200 with empty arrays when no rentals exist', async () => {
    const app = createApp({
      rentals: [
        { data: [], error: null },
        { data: [], error: null }
      ]
    });

    const res = await request(app).get('/api/agenda/calendar/view').query(validQuery);

    expect(res.status).toBe(200);
    expect(res.body.rentals).toHaveLength(0);
    expect(res.body.exceptions).toHaveLength(0);
  });

  test('skips exceptions query when there are no recurring rentals', async () => {
    const app = createApp({
      rentals: [
        { data: [regularRental], error: null },
        { data: [], error: null }
      ]
    });

    const res = await request(app).get('/api/agenda/calendar/view').query(validQuery);

    expect(res.status).toBe(200);
    expect(res.body.rentals).toHaveLength(1);
    expect(res.body.exceptions).toHaveLength(0);
  });

  test('returns 500 if supabase errors on regular rentals', async () => {
    const app = createApp({
      rentals: [
        { data: null, error: { message: 'DB connection lost' } }
      ]
    });

    const res = await request(app).get('/api/agenda/calendar/view').query(validQuery);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('DB connection lost');
  });

  test('returns 500 if supabase errors on recurring rentals', async () => {
    const app = createApp({
      rentals: [
        { data: [], error: null },
        { data: null, error: { message: 'DB connection lost' } }
      ]
    });

    const res = await request(app).get('/api/agenda/calendar/view').query(validQuery);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('DB connection lost');
  });
});
