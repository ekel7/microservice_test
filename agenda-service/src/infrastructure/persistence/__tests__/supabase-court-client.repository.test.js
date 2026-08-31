const supabaseMock = require('../../../../__tests__/setup/supabaseMock');
const { makeSupabaseCourtRepository } = require('../supabase-court.repository');
const { makeSupabaseClientRepository } = require('../supabase-client.repository');
const { METHODS: COURT_METHODS } = require('../../../domain/ports/court-repository');
const { METHODS: CLIENT_METHODS } = require('../../../domain/ports/client-repository');

const makeCourtRepo = () => makeSupabaseCourtRepository({ supabase: supabaseMock });
const makeClientRepo = () => makeSupabaseClientRepository({ supabase: supabaseMock });

describe('SupabaseCourtRepository', () => {
  test('implements every method of the CourtRepository port', () => {
    const repo = makeCourtRepo();
    COURT_METHODS.forEach(method => expect(typeof repo[method]).toBe('function'));
  });

  test('findByIdWithRate returns rate and status when found', async () => {
    const row = { id: 'court-1', hourly_rate: 5000, status: 'available' };
    supabaseMock.setConfig({ courts: { data: row, error: null } });

    expect(await makeCourtRepo().findByIdWithRate('court-1', 'acc-1')).toEqual(row);
  });

  test('findByIdWithRate returns null when the court does not exist in the account', async () => {
    supabaseMock.setConfig({ courts: { data: null, error: { code: 'PGRST116', message: 'no rows' } } });
    expect(await makeCourtRepo().findByIdWithRate('court-x', 'acc-1')).toBeNull();
  });

  test('findByIdWithRate throws on genuine errors', async () => {
    supabaseMock.setConfig({ courts: { data: null, error: { code: 'XX001', message: 'db down' } } });
    await expect(makeCourtRepo().findByIdWithRate('court-1', 'acc-1')).rejects.toThrow('db down');
  });
});

describe('SupabaseClientRepository', () => {
  test('implements every method of the ClientRepository port', () => {
    const repo = makeClientRepo();
    CLIENT_METHODS.forEach(method => expect(typeof repo[method]).toBe('function'));
  });

  test('existsInAccount returns true when the client belongs to the account', async () => {
    supabaseMock.setConfig({ clients: { data: { id: 'cli-1' }, error: null } });
    expect(await makeClientRepo().existsInAccount('cli-1', 'acc-1')).toBe(true);
  });

  test('existsInAccount returns false when the client does not exist (or is foreign)', async () => {
    supabaseMock.setConfig({ clients: { data: null, error: { code: 'PGRST116', message: 'no rows' } } });
    expect(await makeClientRepo().existsInAccount('cli-x', 'acc-1')).toBe(false);
  });

  test('existsInAccount throws on genuine errors', async () => {
    supabaseMock.setConfig({ clients: { data: null, error: { code: 'XX001', message: 'db down' } } });
    await expect(makeClientRepo().existsInAccount('cli-1', 'acc-1')).rejects.toThrow('db down');
  });
});
