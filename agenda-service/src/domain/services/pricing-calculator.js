/**
 * Pricing calculator: rentals are billed by the hour, rounded up.
 */

const { ValidationError } = require('../errors');

/**
 * Compute the total amount for a rental range at the court's hourly rate.
 *
 * @param {object} params
 * @param {import('../model/time-range').TimeRange} params.range
 * @param {number} params.hourlyRate - court hourly rate (non-negative)
 * @returns {{hours: number, total_amount: number}}
 * @throws {ValidationError} if hourlyRate is null/undefined or negative
 */
function calculateTotal({ range, hourlyRate }) {
  if (hourlyRate == null || hourlyRate < 0) {
    throw new ValidationError('hourlyRate must be a non-negative number');
  }

  const hours = range.hours();
  return {
    hours,
    total_amount: hours * hourlyRate,
  };
}

module.exports = { calculateTotal };
