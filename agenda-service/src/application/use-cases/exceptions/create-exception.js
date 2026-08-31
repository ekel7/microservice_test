/**
 * CreateException use case — POST /rentals/:id/exceptions.
 *
 * Validates and persists a per-occurrence override of a recurring series.
 * Validation rules and messages frozen to the legacy contract.
 */

const { TimeRange } = require('../../../domain/model/time-range');
const { findOverlap } = require('../../../domain/services/overlap-policy');
const { NotFoundError, ValidationError } = require('../../../domain/errors');

const VALID_EXCEPTION_TYPES = ['cancelled', 'modified'];
const VALID_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

/**
 * @param {object} deps
 * @param {import('../../domain/ports/rental-repository').RentalRepository} deps.rentalRepo
 * @param {import('../../domain/ports/exception-repository').ExceptionRepository} deps.exceptionRepo
 * @returns {(input: object) => Promise<object>} the stored exception (201)
 */
const makeCreateException = ({ rentalRepo, exceptionRepo }) =>
  async (input) => {
    const {
      rentalId,
      exception_date,
      exception_type,
      new_start_datetime,
      new_end_datetime,
      new_court_id,
      new_total_amount,
      new_status,
      notes,
    } = input;

    if (!exception_date || !exception_type) {
      throw new ValidationError('exception_date and exception_type are required');
    }

    if (!VALID_EXCEPTION_TYPES.includes(exception_type)) {
      throw new ValidationError('exception_type must be either "cancelled" or "modified"');
    }

    const rental = await rentalRepo.findById(rentalId, input.account_id);
    if (!rental) {
      throw new NotFoundError('Rental not found');
    }
    if (!rental.is_recurring) {
      throw new ValidationError('This rental is not a recurring series');
    }

    if (exception_type === 'modified') {
      const hasStatusChange = new_status !== undefined;
      const hasDataChange = new_start_datetime || new_end_datetime || new_court_id || new_total_amount !== undefined;

      if (!hasStatusChange && !hasDataChange) {
        throw new ValidationError('Modified exceptions require either new_status or data changes (new_start_datetime, new_end_datetime, new_court_id, new_total_amount)');
      }

      if (hasDataChange && (!new_start_datetime || !new_end_datetime || !new_court_id || new_total_amount === undefined)) {
        throw new ValidationError('When modifying rental data, all fields are required: new_start_datetime, new_end_datetime, new_court_id, and new_total_amount');
      }

      if (hasStatusChange && !VALID_STATUSES.includes(new_status)) {
        throw new ValidationError('new_status must be one of: pending, confirmed, cancelled, completed');
      }

      // Overlap check when moving time/court — legacy swallows check errors
      // and lets the request through; preserved (contract freeze).
      if (hasDataChange) {
        try {
          const existing = await rentalRepo.listByCourt(new_court_id, input.account_id);
          if (findOverlap({
            range: TimeRange.from(new_start_datetime, new_end_datetime),
            existing,
            excludeId: rentalId,
          })) {
            throw new ValidationError('The modified time conflicts with another rental on this court');
          }
        } catch (error) {
          if (error instanceof ValidationError) throw error;
          console.error('Overlap check error:', error.message);
        }
      }
    }

    const exceptionData = {
      rental_id: rentalId,
      exception_date,
      exception_type,
      notes,
      ...(exception_type === 'modified' && {
        ...(new_start_datetime && { new_start_datetime }),
        ...(new_end_datetime && { new_end_datetime }),
        ...(new_court_id && { new_court_id }),
        ...(new_total_amount !== undefined && { new_total_amount }),
        ...(new_status && { new_status })
      }),
    };

    return exceptionRepo.upsert(exceptionData, { returning: 'representation' });
  };

module.exports = { makeCreateException };
