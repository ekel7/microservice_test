/**
 * CreateRental use case.
 *
 * Orchestrates the business flow for POST /rentals:
 * required fields → time range → client → court (rate + availability) →
 * pricing → overlap policy → persist with domain defaults.
 *
 * Error semantics (mapped to the legacy HTTP contract by the adapter):
 * ValidationError / NotFoundError / ConflictError carry the exact legacy
 * messages.
 */

const { TimeRange } = require('../../domain/model/time-range');
const { createRental } = require('../../domain/model/rental');
const { assertNoOverlap } = require('../../domain/services/overlap-policy');
const { calculateTotal } = require('../../domain/services/pricing-calculator');
const { NotFoundError, ValidationError } = require('../../domain/errors');

/**
 * @param {object} deps
 * @param {import('../../domain/ports/client-repository').ClientRepository} deps.clientRepo
 * @param {import('../../domain/ports/court-repository').CourtRepository} deps.courtRepo
 * @param {import('../../domain/ports/rental-repository').RentalRepository} deps.rentalRepo
 * @returns {(input: object) => Promise<object>} the stored rental with relations
 */
const makeCreateRental = ({ clientRepo, courtRepo, rentalRepo }) =>
  async (input) => {
    if (!input.client_id || !input.court_id || !input.start_datetime || !input.end_datetime) {
      throw new ValidationError('Client, court, start and end datetime are required');
    }

    const range = TimeRange.from(input.start_datetime, input.end_datetime);

    if (!(await clientRepo.existsInAccount(input.client_id, input.account_id))) {
      throw new NotFoundError('Client not found');
    }

    const court = await courtRepo.findByIdWithRate(input.court_id, input.account_id);
    if (!court) {
      throw new NotFoundError('Court not found');
    }
    if (court.status !== 'available') {
      throw new ValidationError('Court is not available');
    }

    const { total_amount } = calculateTotal({ range, hourlyRate: court.hourly_rate });

    const existing = await rentalRepo.listByCourt(input.court_id, input.account_id);
    assertNoOverlap({ range, existing });

    const rental = createRental({
      account_id: input.account_id,
      client_id: input.client_id,
      court_id: input.court_id,
      user_id: input.user_id,
      start_datetime: range.startISO,
      end_datetime: range.endISO,
      total_amount,
      notes: input.notes,
      status: input.status,
      is_recurring: input.is_recurring,
    });

    return rentalRepo.create(rental);
  };

module.exports = { makeCreateRental };
