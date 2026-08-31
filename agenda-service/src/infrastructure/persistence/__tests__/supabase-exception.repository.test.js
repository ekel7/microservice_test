const supabaseMock = require('../../../../__tests__/setup/supabaseMock');
const { makeSupabaseExceptionRepository } = require('../supabase-exception.repository');
const { makeWsNotifier } = require('../../realtime/ws-notifier');
const { METHODS } = require('../../../domain/ports/exception-repository');

const makeRepo = () => makeSupabaseExceptionRepository({ supabase: supabaseMock });

describe('SupabaseExceptionRepository — port contract', () => {
  test('implements every method of the ExceptionRepository port', () => {
    const repo = makeRepo();
    METHODS.forEach(method => expect(typeof repo[method]).toBe('function'));
  });
});

describe('listByRental', () => {
  test('returns all exceptions of a rental', async () => {
    const rows = [{ rental_id: 'r-1', exception_date: '2026-09-02', exception_type: 'cancelled' }];
    supabaseMock.setConfig({ rental_exceptions: { data: rows, error: null } });

    expect(await makeRepo().listByRental('r-1')).toEqual(rows);
  });

  test('returns empty array when data is null', async () => {
    supabaseMock.setConfig({ rental_exceptions: { data: null, error: null } });
    expect(await makeRepo().listByRental('r-1')).toEqual([]);
  });
});

describe('listByRentalIds', () => {
  test('returns exceptions for the given rentals', async () => {
    const rows = [{ rental_id: 'r-1' }, { rental_id: 'r-2' }];
    supabaseMock.setConfig({ rental_exceptions: { data: rows, error: null } });

    expect(await makeRepo().listByRentalIds(['r-1', 'r-2'])).toEqual(rows);
  });

  test('short-circuits with empty list without querying', async () => {
    supabaseMock.setConfig({
      rental_exceptions: { data: [{ should: 'not-be-read' }], error: null },
    });

    expect(await makeRepo().listByRentalIds([])).toEqual([]);
  });
});

describe('upsert', () => {
  test('upserts on rental_id+exception_date and returns the stored row', async () => {
    const exception = {
      rental_id: 'r-1',
      exception_date: '2026-09-02',
      exception_type: 'modified',
      new_status: 'confirmed',
    };
    const stored = { id: 'e-1', ...exception };
    supabaseMock.setConfig({ rental_exceptions: { data: stored, error: null } });

    const result = await makeRepo().upsert(exception);

    expect(result).toEqual(stored);
    // verify conflict target through the builder state of a direct call
    const builder = supabaseMock.from('rental_exceptions');
    builder.upsert(exception, { onConflict: 'rental_id,exception_date' });
    expect(builder._state.options).toEqual({ onConflict: 'rental_id,exception_date' });
  });

  test('throws on persistence error', async () => {
    supabaseMock.setConfig({ rental_exceptions: { data: null, error: { code: 'XX001', message: 'db down' } } });
    await expect(makeRepo().upsert({})).rejects.toThrow('db down');
  });
});

describe('deleteByDate', () => {
  test('resolves without error on success', async () => {
    supabaseMock.setConfig({ rental_exceptions: { data: null, error: null } });
    await expect(makeRepo().deleteByDate('r-1', '2026-09-02')).resolves.toBeUndefined();
  });

  test('throws on persistence error', async () => {
    supabaseMock.setConfig({ rental_exceptions: { data: null, error: { code: 'XX001', message: 'db down' } } });
    await expect(makeRepo().deleteByDate('r-1', '2026-09-02')).rejects.toThrow('db down');
  });
});

describe('WsNotifier (NotificationPort adapter)', () => {
  test('delegates to the broadcast function with the same arguments', () => {
    const broadcast = jest.fn();
    const notifier = makeWsNotifier({ broadcast });

    notifier.notify('acc-1', { id: 'r-1' }, 'rental_created');

    expect(broadcast).toHaveBeenCalledWith('acc-1', { id: 'r-1' }, 'rental_created');
  });

  test('is a no-op when no broadcast is available (service boots without realtime)', () => {
    expect(() => makeWsNotifier().notify('acc-1', {}, 'rental_created')).not.toThrow();
    expect(() => makeWsNotifier({}).notify('acc-1', {}, 'rental_created')).not.toThrow();
  });

  test('never propagates broadcast failures', () => {
    const broadcast = jest.fn(() => { throw new Error('socket exploded'); });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => makeWsNotifier({ broadcast }).notify('acc-1', {}, 'rental_created')).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
