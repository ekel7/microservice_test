const request = require('supertest');
const { createApp } = require('./setup/testApp');

describe('PUT /api/agenda/rentals/:id', () => {
  const rentalId = 'r-0001';

  const currentRental = {
    id: rentalId,
    account_id: 'acct-0001',
    client_id: 'c-0001',
    court_id: 'ct-0001',
    start_datetime: '2024-06-15T14:00:00.000Z',
    end_datetime: '2024-06-15T15:00:00.000Z',
    total_amount: 100,
    status: 'confirmed',
    is_recurring: false,
    notes: 'Old notes'
  };

  const updatedRental = {
    ...currentRental,
    notes: 'New notes',
    status: 'confirmed',
    is_recurring: false,
    client: { full_name: 'John', email: 'john@test.com', phone: '1234' },
    court: { name: 'Court 1', hourly_rate: 100 },
    user: { full_name: 'Test Admin', email: 'admin@test.com' }
  };

  test('returns 404 if rental not found', async () => {
    const app = createApp({
      rentals: { data: null, error: { message: 'Not found' } }
    });
    const res = await request(app).put(`/api/agenda/rentals/${rentalId}`).send({ notes: 'test' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/rental not found/i);
  });

  test('updates notes and broadcasts on simple update', async () => {
    const app = createApp({
      rentals: [
        { data: currentRental, error: null },
        { data: updatedRental, error: null }
      ]
    });

    const res = await request(app).put(`/api/agenda/rentals/${rentalId}`).send({ notes: 'New notes' });

    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('New notes');
    expect(app.locals.broadcastRentalUpdate).toHaveBeenCalledWith(
      'acct-0001',
      updatedRental,
      'rental_updated'
    );
  });

  test('returns 400 if new start >= end', async () => {
    const app = createApp({
      rentals: { data: currentRental, error: null }
    });

    const res = await request(app).put(`/api/agenda/rentals/${rentalId}`).send({
      start_datetime: '2024-06-15T16:00:00.000Z',
      end_datetime: '2024-06-15T15:00:00.000Z'
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/start.*before.*end/i);
  });

  test('returns 400 if time slot overlaps with another rental', async () => {
    const app = createApp({
      rentals: [
        { data: currentRental, error: null },
        {
          data: [{
            id: 'r-other',
            start_datetime: '2024-06-15T14:30:00.000Z',
            end_datetime: '2024-06-15T15:30:00.000Z'
          }],
          error: null
        }
      ]
    });

    const res = await request(app).put(`/api/agenda/rentals/${rentalId}`).send({
      start_datetime: '2024-06-15T14:00:00.000Z',
      end_datetime: '2024-06-15T15:00:00.000Z',
      court_id: 'ct-0001'
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already booked/i);
  });

  test('updates datetime and recalculates total_amount', async () => {
    const recalculatedRental = {
      ...updatedRental,
      start_datetime: '2024-06-15T14:00:00.000Z',
      end_datetime: '2024-06-15T16:00:00.000Z',
      total_amount: 200,
      court_id: 'ct-0001'
    };

    const app = createApp({
      rentals: [
        { data: currentRental, error: null },
        { data: [], error: null },
        { data: recalculatedRental, error: null }
      ],
      courts: { data: { hourly_rate: 100 }, error: null }
    });

    const res = await request(app).put(`/api/agenda/rentals/${rentalId}`).send({
      start_datetime: '2024-06-15T14:00:00.000Z',
      end_datetime: '2024-06-15T16:00:00.000Z',
      court_id: 'ct-0001',
      notes: null,
      status: 'confirmed',
      is_recurring: false
    });

    expect(res.status).toBe(200);
    expect(res.body.total_amount).toBe(200);
  });

  test('handles single instance update for recurring rental', async () => {
    const recurringRental = { ...currentRental, is_recurring: true };
    const exception = {
      id: 'e-0001',
      rental_id: rentalId,
      exception_date: '2024-06-15',
      exception_type: 'modified',
      new_start_datetime: '2024-06-15T16:00:00.000Z',
      new_end_datetime: '2024-06-15T17:00:00.000Z',
      new_court_id: 'ct-0001',
      new_total_amount: 100,
      new_status: 'confirmed'
    };

    const app = createApp({
      rentals: { data: recurringRental, error: null },
      courts: { data: { hourly_rate: 100 }, error: null },
      rental_exceptions: { data: exception, error: null }
    });

    const res = await request(app).put(`/api/agenda/rentals/${rentalId}`).send({
      start_datetime: '2024-06-15T16:00:00.000Z',
      end_datetime: '2024-06-15T17:00:00.000Z',
      update_scope: 'single',
      exception_date: '2024-06-15',
      notes: null,
      status: 'confirmed',
      is_recurring: true
    });

    expect(res.status).toBe(200);
    expect(res.body.exception.exception_type).toBe('modified');
    expect(app.locals.broadcastRentalUpdate).toHaveBeenCalledWith(
      'acct-0001',
      recurringRental,
      'rental_updated'
    );
  });

  test('returns 400 if single update scope without exception_date', async () => {
    const recurringRental = { ...currentRental, is_recurring: true };
    const app = createApp({
      rentals: { data: recurringRental, error: null }
    });

    const res = await request(app).put(`/api/agenda/rentals/${rentalId}`).send({
      update_scope: 'single',
      start_datetime: '2024-06-15T14:00:00.000Z',
      end_datetime: '2024-06-15T15:00:00.000Z'
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exception_date is required/i);
  });

  test('returns 500 if DB errors on update', async () => {
    const app = createApp({
      rentals: [
        { data: currentRental, error: null },
        { data: null, error: { message: 'Update failed' } }
      ]
    });

    const res = await request(app).put(`/api/agenda/rentals/${rentalId}`).send({ notes: 'test' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Update failed');
  });
});
