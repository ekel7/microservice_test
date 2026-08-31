const { TimeRange } = require('../model/time-range');
const { assertNoOverlap, findOverlap, isBlocking } = require('../services/overlap-policy');
const { ConflictError } = require('../errors');

const range = () => TimeRange.from('2026-09-01T13:00:00Z', '2026-09-01T15:00:00Z');

const rentalAt = (start, end, status = 'pending') => ({
  id: 'r-1',
  start_datetime: start,
  end_datetime: end,
  status,
});

describe('isBlocking', () => {
  test('active statuses block', () => {
    expect(isBlocking({ status: 'pending' })).toBe(true);
    expect(isBlocking({ status: 'confirmed' })).toBe(true);
    expect(isBlocking({ status: 'completed' })).toBe(true);
  });

  test('cancelled does not block', () => {
    expect(isBlocking({ status: 'cancelled' })).toBe(false);
  });

  test('NULL status blocks (legacy rows must not be invisible)', () => {
    // regression for the double-booking bug: NULL-status rentals used to
    // bypass the overlap check because SQL excludes NULLs from neq filters
    expect(isBlocking({ status: null })).toBe(true);
    expect(isBlocking({})).toBe(true);
  });
});

describe('assertNoOverlap', () => {
  test('passes when nothing exists', () => {
    expect(assertNoOverlap({ range: range(), existing: [] })).toBe(true);
    expect(assertNoOverlap({ range: range() })).toBe(true);
  });

  test('throws ConflictError with the expected message on overlap', () => {
    const existing = [rentalAt('2026-09-01T14:00:00Z', '2026-09-01T16:00:00Z')];
    expect(() => assertNoOverlap({ range: range(), existing })).toThrow(ConflictError);
    expect(() => assertNoOverlap({ range: range(), existing }))
      .toThrow('Court is already booked for this time slot');
  });

  test('allows adjacent bookings (back-to-back rentals)', () => {
    const existing = [
      rentalAt('2026-09-01T11:00:00Z', '2026-09-01T13:00:00Z'),
      rentalAt('2026-09-01T15:00:00Z', '2026-09-01T17:00:00Z'),
    ];
    expect(() => assertNoOverlap({ range: range(), existing })).not.toThrow();
  });

  test('cancelled rentals do not block the slot', () => {
    const existing = [rentalAt('2026-09-01T14:00:00Z', '2026-09-01T16:00:00Z', 'cancelled')];
    expect(() => assertNoOverlap({ range: range(), existing })).not.toThrow();
  });

  test('NULL-status rentals DO block the slot (regression)', () => {
    const existing = [rentalAt('2026-09-01T14:00:00Z', '2026-09-01T16:00:00Z', null)];
    expect(() => assertNoOverlap({ range: range(), existing })).toThrow(ConflictError);
  });

  test('blocks when the requested range fully contains an existing rental', () => {
    const existing = [rentalAt('2026-09-01T13:30:00Z', '2026-09-01T14:30:00Z')];
    expect(() => assertNoOverlap({ range: range(), existing })).toThrow(ConflictError);
  });
});

describe('findOverlap', () => {
  test('returns the conflicting rental', () => {
    const conflict = rentalAt('2026-09-01T14:00:00Z', '2026-09-01T16:00:00Z');
    const existing = [rentalAt('2026-09-01T09:00:00Z', '2026-09-01T10:00:00Z'), conflict];
    expect(findOverlap({ range: range(), existing })).toBe(conflict);
  });

  test('returns null when free', () => {
    const existing = [rentalAt('2026-09-01T15:00:00Z', '2026-09-01T16:00:00Z')];
    expect(findOverlap({ range: range(), existing })).toBeNull();
  });
});
