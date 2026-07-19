const request = require('supertest');
const { createApp } = require('./setup/testApp');

describe('PUT /api/agenda/rentals/:id/status', () => {
  const rentalId = 'r-0001';

  const currentRental = {
    id: rentalId,
    account_id: 'acct-0001',
    client_id: 'c-0001',
    court_id: 'ct-0001',
    start_datetime: '2024-06-15T14:00:00.000Z',
    end_datetime: '2024-06-15T15:00:00.000Z',
    total_amount: 100,
    status: 'pending',
    is_recurring: false
  };

  const updatedRental = {
    ...currentRental,
    status: 'confirmed',
    client: { full_name: 'John', email: 'john@test.com', phone: '1234' },
    court: { name: 'Court 1', hourly_rate: 100 },
    user: { full_name: 'Test Admin', email: 'admin@test.com' }
  };

  test('returns 400 if status is invalid', async () => {
    const app = createApp({});
    const res = await request(app).put(`/api/agenda/rentals/${rentalId}/status`).send({ status: 'invalid_status' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid status/i);
  });

  test('returns 404 if rental not found', async () => {
    const app = createApp({
      rentals: { data: null, error: { message: 'Not found' } }
    });
    const res = await request(app).put(`/api/agenda/rentals/${rentalId}/status`).send({ status: 'confirmed' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/rental not found/i);
  });

  test('updates status and broadcasts on regular rental', async () => {
    const app = createApp({
      rentals: [
        { data: currentRental, error: null },
        { data: updatedRental, error: null }
      ]
    });

    const res = await request(app).put(`/api/agenda/rentals/${rentalId}/status`).send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
    expect(app.locals.broadcastRentalUpdate).toHaveBeenCalledWith(
      'acct-0001',
      updatedRental,
      'rental_updated'
    );
  });

  test('sets is_recurring=false when cancelling a recurring series', async () => {
    const recurringRental = { ...currentRental, is_recurring: true };
    const cancelledRental = { ...updatedRental, status: 'cancelled', is_recurring: false };

    const app = createApp({
      rentals: [
        { data: recurringRental, error: null },
        { data: cancelledRental, error: null }
      ]
    });

    const res = await request(app).put(`/api/agenda/rentals/${rentalId}/status`).send({ status: 'cancelled' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
    expect(res.body.is_recurring).toBe(false);
  });

  test('creates cancelled exception for single instance of recurring rental', async () => {
    const recurringRental = { ...currentRental, is_recurring: true };
    const exception = {
      id: 'e-0001',
      rental_id: rentalId,
      exception_date: '2024-06-15',
      exception_type: 'cancelled'
    };

    const app = createApp({
      rentals: { data: recurringRental, error: null },
      rental_exceptions: { data: exception, error: null }
    });

    const res = await request(app).put(`/api/agenda/rentals/${rentalId}/status`).send({
      status: 'cancelled',
      update_scope: 'single',
      exception_date: '2024-06-15'
    });

    expect(res.status).toBe(200);
    expect(res.body.exception.exception_type).toBe('cancelled');
    expect(app.locals.broadcastRentalUpdate).toHaveBeenCalledWith(
      'acct-0001',
      recurringRental,
      'rental_updated'
    );
  });

  test('creates modified exception for single instance with non-cancel status', async () => {
    const recurringRental = { ...currentRental, is_recurring: true };
    const exception = {
      id: 'e-0001',
      rental_id: rentalId,
      exception_date: '2024-06-15',
      exception_type: 'modified',
      new_status: 'confirmed'
    };

    const app = createApp({
      rentals: { data: recurringRental, error: null },
      rental_exceptions: { data: exception, error: null }
    });

    const res = await request(app).put(`/api/agenda/rentals/${rentalId}/status`).send({
      status: 'confirmed',
      update_scope: 'single',
      exception_date: '2024-06-15'
    });

    expect(res.status).toBe(200);
    expect(res.body.exception.exception_type).toBe('modified');
    expect(res.body.exception.new_status).toBe('confirmed');
  });

  test('returns 400 if update_scope=single but exception_date missing', async () => {
    const recurringRental = { ...currentRental, is_recurring: true };
    const app = createApp({
      rentals: { data: recurringRental, error: null }
    });

    const res = await request(app).put(`/api/agenda/rentals/${rentalId}/status`).send({
      status: 'cancelled',
      update_scope: 'single'
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/exception_date is required/i);
  });

  test('returns 500 if DB errors on status update', async () => {
    const app = createApp({
      rentals: [
        { data: currentRental, error: null },
        { data: null, error: { message: 'Update failed' } }
      ]
    });

    const res = await request(app).put(`/api/agenda/rentals/${rentalId}/status`).send({ status: 'confirmed' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Update failed');
  });
});
