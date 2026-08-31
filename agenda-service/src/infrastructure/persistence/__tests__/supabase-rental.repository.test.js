const supabaseMock = require('../../../../__tests__/setup/supabaseMock');
const { makeSupabaseRentalRepository } = require('../supabase-rental.repository');
const { METHODS } = require('../../../domain/ports/rental-repository');

const domainRental = {
  account_id: 'acc-1',
  client_id: 'cli-1',
  court_id: 'court-1',
  user_id: 'usr-1',
  start_datetime: '2026-09-01T13:00:00.000Z',
  end_datetime: '2026-09-01T15:00:00.000Z',
  total_amount: 10000,
  notes: null,
  status: 'pending',
  is_recurring: false,
};

/**
 * Wraps the supabase mock so tests can capture the payloads the adapter sends.
 */
const makeCapturingRepo = () => {
  const captured = {};
  const spySupabase = {
    from(table) {
      const builder = supabaseMock.from(table);
      ['insert', 'update'].forEach(op => {
        const original = builder[op].bind(builder);
        builder[op] = (payload) => { captured[op] = payload; return original(payload); };
      });
      return builder;
    },
  };
  return { repo: makeSupabaseRentalRepository({ supabase: spySupabase }), captured };
};

const makeRepo = () => makeSupabaseRentalRepository({ supabase: supabaseMock });

describe('SupabaseRentalRepository — port contract', () => {
  test('implements every method of the RentalRepository port', () => {
    const repo = makeRepo();
    METHODS.forEach(method => expect(typeof repo[method]).toBe('function'));
  });
});

describe('findById', () => {
  test('returns the raw row when found', async () => {
    const row = { id: 'r-1', account_id: 'acc-1', status: 'pending' };
    supabaseMock.setConfig({ rentals: { data: row, error: null } });

    expect(await makeRepo().findById('r-1', 'acc-1')).toEqual(row);
  });

  test('returns null on not-found (PGRST116), never throws', async () => {
    supabaseMock.setConfig({ rentals: { data: null, error: { code: 'PGRST116', message: 'no rows' } } });
    expect(await makeRepo().findById('missing', 'acc-1')).toBeNull();
  });

  test('throws on genuine persistence errors', async () => {
    supabaseMock.setConfig({ rentals: { data: null, error: { code: 'XX001', message: 'db down' } } });
    await expect(makeRepo().findById('r-1', 'acc-1')).rejects.toThrow('db down');
  });
});

describe('create', () => {
  test('serializes the domain rental verbatim (no NULL injection, no key mangling)', async () => {
    const stored = { id: 'r-9', ...domainRental, client: { full_name: 'Juan' } };
    supabaseMock.setConfig({ rentals: { data: stored, error: null } });

    const { repo, captured } = makeCapturingRepo();
    const result = await repo.create(domainRental);

    expect(captured.insert).toEqual([domainRental]);
    expect(result).toEqual(stored);
  });

  test('throws on persistence error', async () => {
    supabaseMock.setConfig({ rentals: { data: null, error: { code: '23514', message: 'check constraint' } } });
    await expect(makeRepo().create(domainRental)).rejects.toThrow('check constraint');
  });
});

describe('update', () => {
  test('sends exactly the partial patch, scoped by id + account', async () => {
    const updated = { id: 'r-1', status: 'confirmed' };
    supabaseMock.setConfig({ rentals: { data: updated, error: null } });

    const { repo, captured } = makeCapturingRepo();
    const result = await repo.update('r-1', 'acc-1', { status: 'confirmed' });

    expect(captured.update).toEqual({ status: 'confirmed' });
    expect(result).toEqual(updated);
  });
});

describe('listByCourt', () => {
  test('returns rows of ANY status (overlap filtering is domain policy)', async () => {
    const rows = [
      { id: 'r-1', start_datetime: 'a', end_datetime: 'b', status: 'cancelled' },
      { id: 'r-2', start_datetime: 'c', end_datetime: 'd', status: null },
    ];
    supabaseMock.setConfig({ rentals: { data: rows, error: null } });

    const result = await makeRepo().listByCourt('court-1', 'acc-1');
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('cancelled');
    expect(result[1].status).toBeNull();
  });

  test('returns empty array when data is null', async () => {
    supabaseMock.setConfig({ rentals: { data: null, error: null } });
    expect(await makeRepo().listByCourt('court-1', 'acc-1')).toEqual([]);
  });
});

describe('calendar lists', () => {
  test('listRegularBetween returns rows with client/court relations', async () => {
    const rows = [{ id: 'r-1', client: { full_name: 'Juan' }, court: { name: 'C1' } }];
    supabaseMock.setConfig({ rentals: { data: rows, error: null } });

    expect(await makeRepo().listRegularBetween('acc-1', '2026-09-01T03:00:00.000Z', '2026-09-02T02:59:00.000Z'))
      .toEqual(rows);
  });

  test('listRecurringStartingBefore returns rows', async () => {
    const rows = [{ id: 'r-2', is_recurring: true }];
    supabaseMock.setConfig({ rentals: { data: rows, error: null } });

    expect(await makeRepo().listRecurringStartingBefore('acc-1', '2026-09-02T02:59:00.000Z')).toEqual(rows);
  });

  test('returns empty array when data is null', async () => {
    supabaseMock.setConfig({ rentals: { data: null, error: null } });
    expect(await makeRepo().listRegularBetween('acc-1', 'a', 'b')).toEqual([]);
    expect(await makeRepo().listRecurringStartingBefore('acc-1', 'b')).toEqual([]);
  });
});
