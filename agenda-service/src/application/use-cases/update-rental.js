/**
 * UpdateRental use case.
 *
 * Two flows:
 * - Single occurrence of a recurring series (`update_scope: 'single'`):
 *   records a 'modified' exception with the new data for that date only.
 * - Regular rentals / whole series: patches the rental (only provided keys);
 *   when time or court changes it revalidates the range, re-checks overlaps
 *   (excluding itself) and recalculates the total from the court rate.
 */

const { TimeRange } = require('../../domain/model/time-range');
const { assertNoOverlap, findOverlap } = require('../../domain/services/overlap-policy');
const { calculateTotal } = require('../../domain/services/pricing-calculator');
const { NotFoundError, ValidationError } = require('../../domain/errors');

/**
 * @param {object} deps
 * @param {import('../../domain/ports/rental-repository').RentalRepository} deps.rentalRepo
 * @param {import('../../domain/ports/court-repository').CourtRepository} deps.courtRepo
 * @param {import('../../domain/ports/exception-repository').ExceptionRepository} deps.exceptionRepo
 * @param {import('../../domain/ports/notification-port').NotificationPort} deps.notifier
 * @returns {(input: object) => Promise<object>} updated rental or rental+exception
 */
const makeUpdateRental = ({ rentalRepo, courtRepo, exceptionRepo, notifier }) =>
  async (input) => {
    const {
      rentalId: id,
      start_datetime,
      end_datetime,
      court_id,
      notes,
      status,
      is_recurring,
      update_scope,
      exception_date,
    } = input;

    const currentRental = await rentalRepo.findById(id, input.account_id);
    if (!currentRental) {
      throw new NotFoundError('Rental not found');
    }

    // Single occurrence of a recurring series → exception for that date only
    if (update_scope === 'single' && currentRental.is_recurring) {
      if (!exception_date) {
        throw new ValidationError('exception_date is required when update_scope is "single"');
      }

      const newStart = start_datetime || currentRental.start_datetime;
      const newEnd = end_datetime || currentRental.end_datetime;
      const newCourtId = court_id || currentRental.court_id;

      if (newStart >= newEnd) {
        throw new ValidationError('Start datetime must be before end datetime');
      }

      const court = await courtRepo.findByIdWithRate(newCourtId, input.account_id);
      if (!court) {
        throw new NotFoundError('Court not found');
      }

      const new_total_amount = calculateTotal({
        range: TimeRange.from(newStart, newEnd),
        hourlyRate: court.hourly_rate,
      }).total_amount;

      const exception = await exceptionRepo.upsert({
        rental_id: id,
        exception_date,
        exception_type: 'modified',
        new_start_datetime: newStart,
        new_end_datetime: newEnd,
        new_court_id: newCourtId,
        new_total_amount,
        notes: notes || null,
        new_status: status || currentRental.status,
      });

      // legacy contract: single-instance broadcasts the raw rental (no exception)
      notifier.notify(input.account_id, currentRental, 'rental_updated');
      return { ...currentRental, exception };
    }

    // Regular update / whole series — partial patch (never nulls anything)
    const patch = {};
    if (notes !== undefined) patch.notes = notes;
    if (status !== undefined) patch.status = status;
    if (is_recurring !== undefined) patch.is_recurring = is_recurring;

    if (start_datetime || end_datetime || court_id) {
      const range = TimeRange.from(
        start_datetime || currentRental.start_datetime,
        end_datetime || currentRental.end_datetime,
      );
      const newCourtId = court_id || currentRental.court_id;

      const existing = await rentalRepo.listByCourt(newCourtId, input.account_id);
      if (findOverlap({ range, existing, excludeId: id })) {
        throw new ValidationError('Court is already booked for this time slot');
      }

      const court = await courtRepo.findByIdWithRate(newCourtId, input.account_id);
      if (!court) {
        throw new NotFoundError('Court not found');
      }

      const { total_amount } = calculateTotal({ range, hourlyRate: court.hourly_rate });

      Object.assign(patch, {
        start_datetime: range.startISO,
        end_datetime: range.endISO,
        court_id: newCourtId,
        total_amount,
      });
    }

    const data = await rentalRepo.update(id, input.account_id, patch);
    if (!data) {
      throw new NotFoundError('Rental not found');
    }
    notifier.notify(input.account_id, data, 'rental_updated');
    return data;
  };

module.exports = { makeUpdateRental };
