const request = require('supertest');
const { createApp } = require('./setup/testApp');

const rentalId = 'r-0001';

describe('GET /api/agenda/rentals/:id/exceptions', () => {
  const recurringRental = { id: rentalId, account_id: 'acct-0001', is_recurring: true };

  test('returns 404 if rental not found', async () => {
    const app = createApp({
      rentals: { data: null, error: { message: 'Not found' } }
    });
    const res = await request(app).get(`/api/agenda/rentals/${rentalId}/exceptions`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/rental not found/i);
  });

  test('returns 400 if rental is not recurring', async () => {
    const app = createApp({
      rentals: { data: { ...recurringRental, is_recurring: false }, error: null }
    });
    const res = await request(app).get(`/api/agenda/rentals/${rentalId}/exceptions`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not a recurring series/i);
  });

  test('returns exceptions array for recurring rental', async () => {
    const exceptions = [
      { id: 'e-0001', rental_id: rentalId, exception_date: '2024-06-22', exception_type: 'cancelled' },
      { id: 'e-0002', rental_id: rentalId, exception_date: '2024-06-29', exception_type: 'modified' }
    ];

    const app = createApp({
      rentals: { data: recurringRental, error: null },
      rental_exceptions: { data: exceptions, error: null }
    });

    const res = await request(app).get(`/api/agenda/rentals/${rentalId}/exceptions`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].id).toBe('e-0001');
    expect(res.body[1].id).toBe('e-0002');
  });

  test('returns empty array if no exceptions', async () => {
    const app = createApp({
      rentals: { data: recurringRental, error: null },
      rental_exceptions: { data: [], error: null }
    });

    const res = await request(app).get(`/api/agenda/rentals/${rentalId}/exceptions`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe('POST /api/agenda/rentals/:id/exceptions', () => {
  const recurringRental = {
    id: rentalId,
    account_id: 'acct-0001',
    is_recurring: true,
    court_id: 'ct-0001',
    start_datetime: '2024-06-15T14:00:00.000Z',
    end_datetime: '2024-06-15T15:00:00.000Z',
    total_amount: 100
  };

  test('returns 400 if exception_date is missing', async () => {
    const app = createApp({});
    const res = await request(app).post(`/api/agenda/rentals/${rentalId}/exceptions`).send({
      exception_type: 'cancelled'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exception_date.*exception_type.*required/i);
  });

  test('returns 400 if exception_type is missing', async () => {
    const app = createApp({});
    const res = await request(app).post(`/api/agenda/rentals/${rentalId}/exceptions`).send({
      exception_date: '2024-06-15'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exception_date.*exception_type.*required/i);
  });

  test('returns 400 if exception_type is invalid', async () => {
    const app = createApp({});
    const res = await request(app).post(`/api/agenda/rentals/${rentalId}/exceptions`).send({
      exception_date: '2024-06-15',
      exception_type: 'invalid'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/must be either/i);
  });

  test('returns 404 if rental not found', async () => {
    const app = createApp({
      rentals: { data: null, error: { message: 'Not found' } }
    });
    const res = await request(app).post(`/api/agenda/rentals/${rentalId}/exceptions`).send({
      exception_date: '2024-06-15',
      exception_type: 'cancelled'
    });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/rental not found/i);
  });

  test('returns 400 if rental is not recurring', async () => {
    const app = createApp({
      rentals: { data: { ...recurringRental, is_recurring: false }, error: null }
    });
    const res = await request(app).post(`/api/agenda/rentals/${rentalId}/exceptions`).send({
      exception_date: '2024-06-15',
      exception_type: 'cancelled'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not a recurring series/i);
  });

  test('returns 400 if modified exception has no data changes', async () => {
    const app = createApp({
      rentals: { data: recurringRental, error: null }
    });
    const res = await request(app).post(`/api/agenda/rentals/${rentalId}/exceptions`).send({
      exception_date: '2024-06-15',
      exception_type: 'modified'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/require either.*new_status.*data changes/i);
  });

  test('returns 400 if modified exception has partial data fields', async () => {
    const app = createApp({
      rentals: { data: recurringRental, error: null }
    });
    const res = await request(app).post(`/api/agenda/rentals/${rentalId}/exceptions`).send({
      exception_date: '2024-06-15',
      exception_type: 'modified',
      new_start_datetime: '2024-06-15T16:00:00.000Z',
      new_end_datetime: '2024-06-15T17:00:00.000Z'
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/all fields are required/i);
  });

  test('returns 201 on cancelled exception success', async () => {
    const exception = {
      id: 'e-0001',
      rental_id: rentalId,
      exception_date: '2024-06-15',
      exception_type: 'cancelled',
      notes: null
    };

    const app = createApp({
      rentals: { data: recurringRental, error: null },
      rental_exceptions: { data: exception, error: null }
    });

    const res = await request(app).post(`/api/agenda/rentals/${rentalId}/exceptions`).send({
      exception_date: '2024-06-15',
      exception_type: 'cancelled'
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('e-0001');
    expect(res.body.exception_type).toBe('cancelled');
  });

  test('returns 201 on modified exception with status change only', async () => {
    const exception = {
      id: 'e-0001',
      rental_id: rentalId,
      exception_date: '2024-06-15',
      exception_type: 'modified',
      new_status: 'completed',
      notes: null
    };

    const app = createApp({
      rentals: { data: recurringRental, error: null },
      rental_exceptions: { data: exception, error: null }
    });

    const res = await request(app).post(`/api/agenda/rentals/${rentalId}/exceptions`).send({
      exception_date: '2024-06-15',
      exception_type: 'modified',
      new_status: 'completed'
    });

    expect(res.status).toBe(201);
    expect(res.body.exception_type).toBe('modified');
    expect(res.body.new_status).toBe('completed');
  });

  test('returns 400 if new_status is invalid', async () => {
    const app = createApp({
      rentals: { data: recurringRental, error: null }
    });

    const res = await request(app).post(`/api/agenda/rentals/${rentalId}/exceptions`).send({
      exception_date: '2024-06-15',
      exception_type: 'modified',
      new_status: 'invalid'
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/new_status must be one of/i);
  });

  test('returns 400 if modified time conflicts with another rental', async () => {
    const app = createApp({
      rentals: [
        { data: recurringRental, error: null },
        { data: [{ id: 'r-other' }], error: null }
      ],
      rental_exceptions: { data: null, error: null }
    });

    const res = await request(app).post(`/api/agenda/rentals/${rentalId}/exceptions`).send({
      exception_date: '2024-06-15',
      exception_type: 'modified',
      new_start_datetime: '2024-06-15T16:00:00.000Z',
      new_end_datetime: '2024-06-15T17:00:00.000Z',
      new_court_id: 'ct-0001',
      new_total_amount: 100
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/conflicts with another rental/i);
  });

  test('returns 500 if DB errors on upsert', async () => {
    const app = createApp({
      rentals: { data: recurringRental, error: null },
      rental_exceptions: { data: null, error: { message: 'Upsert failed' } }
    });

    const res = await request(app).post(`/api/agenda/rentals/${rentalId}/exceptions`).send({
      exception_date: '2024-06-15',
      exception_type: 'cancelled'
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Upsert failed');
  });
});

describe('DELETE /api/agenda/rentals/:id/exceptions/:date', () => {
  const recurringRental = { id: rentalId, account_id: 'acct-0001', is_recurring: true };

  test('returns 404 if rental not found', async () => {
    const app = createApp({
      rentals: { data: null, error: { message: 'Not found' } }
    });
    const res = await request(app).delete(`/api/agenda/rentals/${rentalId}/exceptions/2024-06-15`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/rental not found/i);
  });

  test('returns 400 if rental is not recurring', async () => {
    const app = createApp({
      rentals: { data: { ...recurringRental, is_recurring: false }, error: null }
    });
    const res = await request(app).delete(`/api/agenda/rentals/${rentalId}/exceptions/2024-06-15`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not a recurring series/i);
  });

  test('returns 204 on successful delete', async () => {
    const app = createApp({
      rentals: { data: recurringRental, error: null },
      rental_exceptions: { data: null, error: null }
    });

    const res = await request(app).delete(`/api/agenda/rentals/${rentalId}/exceptions/2024-06-15`);

    expect(res.status).toBe(204);
  });

  test('returns 500 if DB errors on delete', async () => {
    const app = createApp({
      rentals: { data: recurringRental, error: null },
      rental_exceptions: { data: null, error: { message: 'Delete failed' } }
    });

    const res = await request(app).delete(`/api/agenda/rentals/${rentalId}/exceptions/2024-06-15`);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Delete failed');
  });
});
