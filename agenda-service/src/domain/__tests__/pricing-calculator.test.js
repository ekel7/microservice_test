const { TimeRange } = require('../model/time-range');
const { calculateTotal } = require('../services/pricing-calculator');
const { ValidationError } = require('../errors');

const range = (start, end) => TimeRange.from(start, end);

describe('calculateTotal', () => {
  test('2h x $5000 = $10000', () => {
    expect(calculateTotal({ range: range('2026-09-01T13:00:00Z', '2026-09-01T15:00:00Z'), hourlyRate: 5000 }))
      .toEqual({ hours: 2, total_amount: 10000 });
  });

  test('partial hours round up: 30 min bills 1 hour', () => {
    expect(calculateTotal({ range: range('2026-09-01T13:00:00Z', '2026-09-01T13:30:00Z'), hourlyRate: 5000 }))
      .toEqual({ hours: 1, total_amount: 5000 });
  });

  test('90 min bills 2 hours', () => {
    expect(calculateTotal({ range: range('2026-09-01T13:00:00Z', '2026-09-01T14:30:00Z'), hourlyRate: 5000 }))
      .toEqual({ hours: 2, total_amount: 10000 });
  });

  test('works with zero rate', () => {
    expect(calculateTotal({ range: range('2026-09-01T13:00:00Z', '2026-09-01T15:00:00Z'), hourlyRate: 0 }))
      .toEqual({ hours: 2, total_amount: 0 });
  });

  test('throws ValidationError on negative rate', () => {
    expect(() => calculateTotal({ range: range('2026-09-01T13:00:00Z', '2026-09-01T15:00:00Z'), hourlyRate: -1 }))
      .toThrow(ValidationError);
  });

  test('throws ValidationError on missing rate', () => {
    expect(() => calculateTotal({ range: range('2026-09-01T13:00:00Z', '2026-09-01T15:00:00Z') }))
      .toThrow(ValidationError);
  });
});
