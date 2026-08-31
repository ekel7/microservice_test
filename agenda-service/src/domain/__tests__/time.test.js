const {
  validateDate,
  calculateHours,
  doPeriodsOverlap,
  localDateTimeToISOStringWithTimezone,
  addTimeToDateAsISOString,
  toUTC,
  standardizeISOString,
  nowUTC,
  addDays,
  addHours,
  parseToUTC,
} = require('../services/time');

describe('validateDate', () => {
  test('accepts ISO strings, Date objects and DateTime objects', () => {
    expect(validateDate('2026-09-01T13:00:00Z').isValid).toBe(true);
    expect(validateDate(new Date('2026-09-01T13:00:00Z')).isValid).toBe(true);
  });

  test('returns UTC-normalized DateTime', () => {
    const dt = validateDate('2026-09-01T10:00:00-03:00');
    expect(dt.toISO()).toBe('2026-09-01T13:00:00.000Z');
  });

  test('throws on invalid input', () => {
    expect(() => validateDate('not-a-date', 'start')).toThrow(/Invalid start/);
    expect(() => validateDate(null, 'start')).toThrow(/Invalid start/);
  });
});

describe('calculateHours', () => {
  test('rounds up to the nearest hour', () => {
    expect(calculateHours('2026-09-01T13:00:00Z', '2026-09-01T15:00:00Z')).toBe(2);
    expect(calculateHours('2026-09-01T13:00:00Z', '2026-09-01T13:30:00Z')).toBe(1);
    expect(calculateHours('2026-09-01T13:00:00Z', '2026-09-01T14:31:00Z')).toBe(2);
  });

  test('handles ranges crossing midnight', () => {
    expect(calculateHours('2026-09-01T23:00:00Z', '2026-09-02T01:00:00Z')).toBe(2);
  });

  test('zero duration rounds up to 1 hour? No — zero is zero', () => {
    // documents current behavior: a zero-length range bills 0 hours
    expect(calculateHours('2026-09-01T13:00:00Z', '2026-09-01T13:00:00Z')).toBe(0);
  });
});

describe('doPeriodsOverlap', () => {
  test('detects overlapping periods', () => {
    expect(doPeriodsOverlap('2026-09-01T13:00:00Z', '2026-09-01T15:00:00Z', '2026-09-01T14:00:00Z', '2026-09-01T16:00:00Z')).toBe(true);
  });

  test('adjacent periods do NOT overlap (one ends when the next starts)', () => {
    expect(doPeriodsOverlap('2026-09-01T13:00:00Z', '2026-09-01T14:00:00Z', '2026-09-01T14:00:00Z', '2026-09-01T15:00:00Z')).toBe(false);
  });

  test('detects 1 millisecond overlap', () => {
    expect(doPeriodsOverlap('2026-09-01T13:00:00Z', '2026-09-01T14:00:00Z', '2026-09-01T13:59:59.999Z', '2026-09-01T15:00:00Z')).toBe(true);
  });

  test('contained periods overlap', () => {
    expect(doPeriodsOverlap('2026-09-01T13:00:00Z', '2026-09-01T16:00:00Z', '2026-09-01T14:00:00Z', '2026-09-01T15:00:00Z')).toBe(true);
  });

  test('disjoint periods do not overlap', () => {
    expect(doPeriodsOverlap('2026-09-01T13:00:00Z', '2026-09-01T14:00:00Z', '2026-09-01T15:00:00Z', '2026-09-01T16:00:00Z')).toBe(false);
  });
});

describe('localDateTimeToISOStringWithTimezone', () => {
  test('converts Buenos Aires local time (UTC-3, no DST) to UTC', () => {
    expect(localDateTimeToISOStringWithTimezone('2026-06-01', '12:00', 'America/Argentina/Buenos_Aires'))
      .toBe('2026-06-01T15:00:00.000Z');
  });

  test('handles DST correctly for a DST timezone (New York summer/winter)', () => {
    expect(localDateTimeToISOStringWithTimezone('2026-07-01', '12:00', 'America/New_York'))
      .toBe('2026-07-01T16:00:00.000Z'); // EDT = UTC-4
    expect(localDateTimeToISOStringWithTimezone('2026-01-15', '12:00', 'America/New_York'))
      .toBe('2026-01-15T17:00:00.000Z'); // EST = UTC-5
  });

  test('defaults to the account default timezone when none provided', () => {
    expect(localDateTimeToISOStringWithTimezone('2026-06-01', '12:00'))
      .toBe(localDateTimeToISOStringWithTimezone('2026-06-01', '12:00', 'America/Argentina/Buenos_Aires'));
  });

  test('returns null for missing input', () => {
    expect(localDateTimeToISOStringWithTimezone(null, '12:00')).toBeNull();
    expect(localDateTimeToISOStringWithTimezone('2026-06-01', null)).toBeNull();
  });
});

describe('addTimeToDateAsISOString', () => {
  test('adds start-of-day time in account timezone', () => {
    expect(addTimeToDateAsISOString('2026-06-01', '00:00:00', 'America/Argentina/Buenos_Aires'))
      .toBe('2026-06-01T03:00:00.000Z');
  });

  test('KNOWN QUIRK: truncates seconds — 23:59:59 becomes 23:59:00', () => {
    // addTimeToDateAsISOString keeps only HH:MM (substring(0, 5)), so end-of-day
    // filters exclude rentals ending in the final 59 seconds of the day.
    // Documented production behavior — do not "fix" silently (contract freeze).
    expect(addTimeToDateAsISOString('2026-06-01', '23:59:59', 'America/Argentina/Buenos_Aires'))
      .toBe('2026-06-02T02:59:00.000Z');
  });

  test('passes through strings that already contain time', () => {
    expect(addTimeToDateAsISOString('2026-06-01T15:00:00Z', '23:59:59', 'America/Argentina/Buenos_Aires'))
      .toBe('2026-06-01T15:00:00.000Z');
  });
});

describe('misc utilities', () => {
  test('toUTC normalizes offset dates', () => {
    expect(toUTC('2026-09-01T10:00:00-03:00')).toBe('2026-09-01T13:00:00.000Z');
    expect(toUTC(null)).toBeNull();
  });

  test('standardizeISOString keeps valid ISO unchanged', () => {
    expect(standardizeISOString('2026-09-01T13:00:00Z')).toBe('2026-09-01T13:00:00.000Z');
    expect(() => standardizeISOString('garbage')).toThrow(/Invalid ISO string/);
  });

  test('nowUTC returns a valid ISO string', () => {
    expect(new Date(nowUTC()).toString()).not.toBe('Invalid Date');
  });

  test('addDays/addHours/parseToUTC', () => {
    expect(addDays('2026-09-01T13:00:00Z', 2).toISO()).toBe('2026-09-03T13:00:00.000Z');
    expect(addHours('2026-09-01T13:00:00Z', 3).toISO()).toBe('2026-09-01T16:00:00.000Z');
    expect(parseToUTC('2026-09-01T13:00:00Z').toISO()).toBe('2026-09-01T13:00:00.000Z');
    expect(parseToUTC(null)).toBeNull();
  });
});
