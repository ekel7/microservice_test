/**
 * Rental entity factory.
 *
 * Applies the business defaults for new rentals. Keys stay snake_case to
 * match the persistence schema — no DTO/mapper ceremony (liviano).
 */

const { ValidationError } = require('../errors');

const RENTAL_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

/**
 * Build a new rental with business defaults applied:
 * - status defaults to 'pending' (never NULL — see fix 45bff41)
 * - is_recurring defaults to false
 * - notes defaults to null
 *
 * @param {object} input
 * @param {string} input.account_id - owning account (multi-tenant scope)
 * @param {string} input.client_id
 * @param {string} input.court_id
 * @param {string} input.user_id - user creating the rental
 * @param {string} input.start_datetime - UTC ISO string
 * @param {string} input.end_datetime - UTC ISO string
 * @param {number} input.total_amount - computed by the pricing calculator
 * @param {string|null} [input.notes]
 * @param {string} [input.status] - one of RENTAL_STATUSES (default 'pending')
 * @param {boolean} [input.is_recurring] (default false)
 * @returns {object} rental ready for persistence
 * @throws {ValidationError} if status is provided and not a valid one
 */
function createRental(input) {
  const status = input.status ?? 'pending';

  if (!RENTAL_STATUSES.includes(status)) {
    throw new ValidationError(`Invalid rental status: ${status}`);
  }

  return {
    account_id: input.account_id,
    client_id: input.client_id,
    court_id: input.court_id,
    user_id: input.user_id,
    start_datetime: input.start_datetime,
    end_datetime: input.end_datetime,
    total_amount: input.total_amount,
    notes: input.notes ?? null,
    status,
    is_recurring: input.is_recurring ?? false,
  };
}

module.exports = { createRental, RENTAL_STATUSES };
