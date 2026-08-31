/**
 * Overlap policy: a court cannot have two active rentals at the same time.
 *
 * Two periods overlap if: start1 < end2 AND start2 < end1
 * (adjacent periods — one ends exactly when the next starts — do not overlap).
 */

const { doPeriodsOverlap } = require('./time');
const { ConflictError } = require('../errors');

/**
 * A rental blocks the court unless explicitly cancelled.
 *
 * Rentals with NULL status count as ACTIVE: they are legacy rows created
 * before status normalization (see fix 45bff41) and must not be invisible
 * to this check, otherwise double bookings become possible again.
 *
 * @param {{status: string|null}} rental
 * @returns {boolean}
 */
function isBlocking(rental) {
  return rental.status !== 'cancelled';
}

/**
 * Find the first active rental in `existing` that overlaps `range`.
 *
 * @param {object} params
 * @param {import('../model/time-range').TimeRange} params.range - requested range
 * @param {Array<{start_datetime: string, end_datetime: string, status: string|null}>} params.existing
 * @returns {object|null} the conflicting rental, or null if the range is free
 */
function findOverlap({ range, existing = [] }) {
  return (
    existing.find(rental =>
      isBlocking(rental) &&
      doPeriodsOverlap(range.start, range.end, rental.start_datetime, rental.end_datetime)
    ) || null
  );
}

/**
 * Assert the requested range is free for the court.
 *
 * @param {object} params
 * @param {import('../model/time-range').TimeRange} params.range
 * @param {Array<{start_datetime: string, end_datetime: string, status: string|null}>} params.existing
 * @returns {true} always, or throws
 * @throws {ConflictError} if any active rental overlaps the range
 */
function assertNoOverlap(params) {
  if (findOverlap(params)) {
    throw new ConflictError('Court is already booked for this time slot');
  }
  return true;
}

module.exports = { isBlocking, findOverlap, assertNoOverlap };
