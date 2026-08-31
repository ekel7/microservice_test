/**
 * TimeRange value object: a validated [start, end) UTC interval.
 *
 * Invariant: start < end. Both are stored as Luxon DateTime in UTC.
 */

const { validateDate } = require('../services/time');
const { ValidationError } = require('../errors');

class TimeRange {
  /**
   * @param {string|Date|import('luxon').DateTime} start
   * @param {string|Date|import('luxon').DateTime} end
   * @throws {ValidationError} if dates are invalid or start >= end
   */
  constructor(start, end) {
    this.start = validateDate(start, 'start datetime');
    this.end = validateDate(end, 'end datetime');

    if (!(this.start < this.end)) {
      throw new ValidationError('Start datetime must be before end datetime');
    }
  }

  /**
   * @param {string|Date|import('luxon').DateTime} start
   * @param {string|Date|import('luxon').DateTime} end
   * @returns {TimeRange}
   */
  static from(start, end) {
    return new TimeRange(start, end);
  }

  /**
   * @returns {string} UTC ISO string of start
   */
  get startISO() {
    return this.start.toISO();
  }

  /**
   * @returns {string} UTC ISO string of end
   */
  get endISO() {
    return this.end.toISO();
  }

  /**
   * Duration in hours, rounded up to the nearest hour (billing granularity).
   * @returns {number}
   */
  hours() {
    return Math.ceil(this.end.diff(this.start, 'hours').hours);
  }

  /**
   * Two ranges overlap if: start1 < end2 AND start2 < end1.
   * Adjacent ranges (end1 === start2) do NOT overlap.
   * @param {TimeRange} other
   * @returns {boolean}
   */
  overlaps(other) {
    return this.start < other.end && other.start < this.end;
  }
}

module.exports = { TimeRange };
