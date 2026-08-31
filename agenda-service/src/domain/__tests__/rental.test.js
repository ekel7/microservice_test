const { createRental, RENTAL_STATUSES } = require('../model/rental');
const { ValidationError } = require('../errors');

const baseInput = {
  account_id: 'acc-1',
  client_id: 'cli-1',
  court_id: 'court-1',
  user_id: 'usr-1',
  start_datetime: '2026-09-01T13:00:00.000Z',
  end_datetime: '2026-09-01T15:00:00.000Z',
  total_amount: 10000,
};

describe('createRental', () => {
  test('applies business defaults when status/is_recurring/notes are omitted', () => {
    // regression: omitted status used to persist NULL and omitting is_recurring used to 500
    const rental = createRental(baseInput);
    expect(rental.status).toBe('pending');
    expect(rental.is_recurring).toBe(false);
    expect(rental.notes).toBeNull();
  });

  test('preserves provided values', () => {
    const rental = createRental({
      ...baseInput,
      status: 'confirmed',
      is_recurring: true,
      notes: 'Trae su propia paleta',
    });
    expect(rental.status).toBe('confirmed');
    expect(rental.is_recurring).toBe(true);
    expect(rental.notes).toBe('Trae su propia paleta');
  });

  test('keeps multi-tenant and reference fields intact', () => {
    const rental = createRental(baseInput);
    expect(rental.account_id).toBe('acc-1');
    expect(rental.client_id).toBe('cli-1');
    expect(rental.court_id).toBe('court-1');
    expect(rental.user_id).toBe('usr-1');
    expect(rental.start_datetime).toBe('2026-09-01T13:00:00.000Z');
    expect(rental.end_datetime).toBe('2026-09-01T15:00:00.000Z');
    expect(rental.total_amount).toBe(10000);
  });

  test('throws ValidationError on invalid status', () => {
    expect(() => createRental({ ...baseInput, status: 'bogus' })).toThrow(ValidationError);
    expect(() => createRental({ ...baseInput, status: '' })).toThrow(ValidationError);
  });

  test('accepts every valid status', () => {
    RENTAL_STATUSES.forEach(status => {
      expect(createRental({ ...baseInput, status }).status).toBe(status);
    });
  });

  test('is_recurring: false is not overridden by the default', () => {
    expect(createRental({ ...baseInput, is_recurring: false }).is_recurring).toBe(false);
  });
});
