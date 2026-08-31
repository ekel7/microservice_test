const { TimeRange } = require('../model/time-range');
const { ValidationError } = require('../errors');

describe('TimeRange', () => {
  test('creates a valid UTC range', () => {
    const range = TimeRange.from('2026-09-01T13:00:00Z', '2026-09-01T15:00:00Z');
    expect(range.startISO).toBe('2026-09-01T13:00:00.000Z');
    expect(range.endISO).toBe('2026-09-01T15:00:00.000Z');
  });

  test('throws ValidationError when start === end', () => {
    expect(() => TimeRange.from('2026-09-01T13:00:00Z', '2026-09-01T13:00:00Z'))
      .toThrow(ValidationError);
  });

  test('throws ValidationError when start > end', () => {
    expect(() => TimeRange.from('2026-09-01T15:00:00Z', '2026-09-01T13:00:00Z'))
      .toThrow(ValidationError);
  });

  test('throws on invalid dates', () => {
    expect(() => TimeRange.from('garbage', '2026-09-01T13:00:00Z')).toThrow();
    expect(() => TimeRange.from('2026-09-01T13:00:00Z', 'garbage')).toThrow();
  });

  test('normalizes offsets to UTC', () => {
    const range = TimeRange.from('2026-09-01T10:00:00-03:00', '2026-09-01T12:00:00-03:00');
    expect(range.startISO).toBe('2026-09-01T13:00:00.000Z');
    expect(range.endISO).toBe('2026-09-01T15:00:00.000Z');
  });

  describe('hours()', () => {
    test('rounds up to the nearest hour', () => {
      expect(TimeRange.from('2026-09-01T13:00:00Z', '2026-09-01T15:00:00Z').hours()).toBe(2);
      expect(TimeRange.from('2026-09-01T13:00:00Z', '2026-09-01T13:30:00Z').hours()).toBe(1);
      expect(TimeRange.from('2026-09-01T13:00:00Z', '2026-09-01T14:01:00Z').hours()).toBe(2);
    });
  });

  describe('overlaps()', () => {
    const morning = TimeRange.from('2026-09-01T13:00:00Z', '2026-09-01T15:00:00Z');

    test('true for overlapping ranges', () => {
      const other = TimeRange.from('2026-09-01T14:00:00Z', '2026-09-01T16:00:00Z');
      expect(morning.overlaps(other)).toBe(true);
    });

    test('false for adjacent ranges', () => {
      const next = TimeRange.from('2026-09-01T15:00:00Z', '2026-09-01T17:00:00Z');
      expect(morning.overlaps(next)).toBe(false);
    });

    test('true when fully contained', () => {
      const inner = TimeRange.from('2026-09-01T13:30:00Z', '2026-09-01T14:30:00Z');
      expect(morning.overlaps(inner)).toBe(true);
    });
  });
});
