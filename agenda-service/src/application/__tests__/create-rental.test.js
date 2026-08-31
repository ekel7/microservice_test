/**
 * Level B tests: CreateRental orchestration with plain in-memory fakes.
 * No Supabase, no HTTP, no mock frameworks — just objects.
 */

const { makeCreateRental } = require('../use-cases/create-rental');
const { ValidationError, NotFoundError, ConflictError } = require('../../domain/errors');

const baseInput = {
  account_id: 'acc-1',
  user_id: 'usr-1',
  client_id: 'cli-1',
  court_id: 'court-1',
  start_datetime: '2026-09-01T13:00:00Z',
  end_datetime: '2026-09-01T15:00:00Z',
};

const makeFakes = ({ clientExists = true, court = { id: 'court-1', hourly_rate: 5000, status: 'available' }, existing = [] } = {}) => {
  const clientRepo = { existsInAccount: jest.fn(async () => clientExists) };
  const courtRepo = { findByIdWithRate: jest.fn(async () => court) };
  const rentalRepo = {
    listByCourt: jest.fn(async () => existing),
    create: jest.fn(async (rental) => ({ id: 'r-new', ...rental, client: {}, court: {}, user: {} })),
  };
  const createRental = makeCreateRental({ clientRepo, courtRepo, rentalRepo });
  return { createRental, clientRepo, courtRepo, rentalRepo };
};

describe('CreateRental — orchestration', () => {
  test('happy path: persists with computed pricing and domain defaults, returns stored row', async () => {
    const { createRental, rentalRepo } = makeFakes();

    const result = await createRental(baseInput);

    expect(rentalRepo.create).toHaveBeenCalledTimes(1);
    const persisted = rentalRepo.create.mock.calls[0][0];
    expect(persisted).toMatchObject({
      account_id: 'acc-1',
      user_id: 'usr-1',
      client_id: 'cli-1',
      court_id: 'court-1',
      total_amount: 10000, // 2h x $5000
      status: 'pending',   // domain default
      is_recurring: false, // domain default
      notes: null,
    });
    expect(result.id).toBe('r-new');
  });

  test('provided status/notes/is_recurring are respected', async () => {
    const { createRental, rentalRepo } = makeFakes();

    await createRental({ ...baseInput, status: 'confirmed', notes: 'Clase', is_recurring: false });

    expect(rentalRepo.create.mock.calls[0][0]).toMatchObject({ status: 'confirmed', notes: 'Clase' });
  });

  test('normalizes datetimes to UTC ISO through TimeRange', async () => {
    const { createRental, rentalRepo } = makeFakes();

    await createRental({ ...baseInput, start_datetime: '2026-09-01T10:00:00-03:00' });

    expect(rentalRepo.create.mock.calls[0][0].start_datetime).toBe('2026-09-01T13:00:00.000Z');
  });
});

describe('CreateRental — validation order matches the legacy contract', () => {
  test('missing required fields → ValidationError with the legacy message', async () => {
    const { createRental } = makeFakes();
    await expect(createRental({})).rejects.toThrow('Client, court, start and end datetime are required');
    await expect(createRental({ ...baseInput, client_id: undefined })).rejects.toThrow(ValidationError);
  });

  test('start >= end → ValidationError with the legacy message (before any repo call)', async () => {
    const { createRental, clientRepo } = makeFakes();
    await expect(
      createRental({ ...baseInput, start_datetime: '2026-09-01T15:00:00Z', end_datetime: '2026-09-01T15:00:00Z' })
    ).rejects.toThrow('Start datetime must be before end datetime');
    expect(clientRepo.existsInAccount).not.toHaveBeenCalled();
  });

  test('foreign/missing client → NotFoundError, court never queried', async () => {
    const { createRental, courtRepo } = makeFakes({ clientExists: false });
    await expect(createRental(baseInput)).rejects.toThrow('Client not found');
    await expect(createRental(baseInput)).rejects.toThrow(NotFoundError);
    expect(courtRepo.findByIdWithRate).not.toHaveBeenCalled();
  });

  test('missing court → NotFoundError with the legacy message', async () => {
    const { createRental } = makeFakes({ court: null });
    await expect(createRental(baseInput)).rejects.toThrow('Court not found');
  });

  test('court under maintenance → ValidationError with the legacy message', async () => {
    const { createRental } = makeFakes({ court: { id: 'court-1', hourly_rate: 5000, status: 'maintenance' } });
    await expect(createRental(baseInput)).rejects.toThrow('Court is not available');
    await expect(createRental(baseInput)).rejects.toThrow(ValidationError);
  });
});

describe('CreateRental — overlap policy integration', () => {
  test('overlapping active rental → ConflictError with the legacy message; nothing persisted', async () => {
    const { createRental, rentalRepo } = makeFakes({
      existing: [{ id: 'r-other', start_datetime: '2026-09-01T14:00:00Z', end_datetime: '2026-09-01T16:00:00Z', status: 'confirmed' }],
    });

    await expect(createRental(baseInput)).rejects.toThrow('Court is already booked for this time slot');
    await expect(createRental(baseInput)).rejects.toThrow(ConflictError);
    expect(rentalRepo.create).not.toHaveBeenCalled();
  });

  test('NULL-status rentals DO block (regression for the double-booking bug)', async () => {
    const { createRental } = makeFakes({
      existing: [{ id: 'r-legacy', start_datetime: '2026-09-01T13:30:00Z', end_datetime: '2026-09-01T14:30:00Z', status: null }],
    });

    await expect(createRental(baseInput)).rejects.toThrow(ConflictError);
  });

  test('cancelled rentals do not block', async () => {
    const { createRental } = makeFakes({
      existing: [{ id: 'r-old', start_datetime: '2026-09-01T14:00:00Z', end_datetime: '2026-09-01T16:00:00Z', status: 'cancelled' }],
    });

    await expect(createRental(baseInput)).resolves.toBeTruthy();
  });

  test('overlap check queries ALL rentals of the court (filtering is domain policy)', async () => {
    const { createRental, rentalRepo } = makeFakes();

    await createRental(baseInput);

    expect(rentalRepo.listByCourt).toHaveBeenCalledWith('court-1', 'acc-1');
  });
});
