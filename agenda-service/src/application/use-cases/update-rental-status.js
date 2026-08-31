/**
 * UpdateRentalStatus use case.
 *
 * Two flows:
 * - Single occurrence of a recurring series (`update_scope: 'single'`):
 *   records a rental_exception instead of touching the parent rental.
 * - Regular rentals / whole series: updates the status directly; cancelling
 *   a series also flips is_recurring to false.
 */

const { NotFoundError, ValidationError } = require('../../domain/errors');

const VALID_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

/**
 * @param {object} deps
 * @param {import('../../domain/ports/rental-repository').RentalRepository} deps.rentalRepo
 * @param {import('../../domain/ports/exception-repository').ExceptionRepository} deps.exceptionRepo
 * @param {import('../../domain/ports/notification-port').NotificationPort} deps.notifier
 * @returns {(input: object) => Promise<object>} updated rental or rental+exception
 */
const makeUpdateRentalStatus = ({ rentalRepo, exceptionRepo, notifier }) =>
  async (input) => {
    const { rentalId: id, status, update_scope, exception_date } = input;

    if (!VALID_STATUSES.includes(status)) {
      throw new ValidationError('Invalid status');
    }

    const currentRental = await rentalRepo.findById(id, input.account_id);
    if (!currentRental) {
      throw new NotFoundError('Rental not found');
    }

    // Single occurrence of a recurring series → exception, not an update
    if (update_scope === 'single' && currentRental.is_recurring) {
      if (!exception_date) {
        throw new ValidationError('exception_date is required when update_scope is "single"');
      }

      const exceptionData = status === 'cancelled'
        ? {
            rental_id: id,
            exception_date,
            exception_type: 'cancelled',
            notes: `Cancelled on ${new Date().toISOString()}`
          }
        : {
            rental_id: id,
            exception_date,
            exception_type: 'modified',
            new_status: status,
            notes: `Status changed to ${status} on ${new Date().toISOString()}`
          };

      const exception = await exceptionRepo.upsert(exceptionData);
      // legacy contract: single-instance broadcasts the raw rental (no exception)
      notifier.notify(input.account_id, currentRental, 'rental_updated');
      return { ...currentRental, exception };
    }

    const patch = { status };

    // Cancelling a recurring series also ends the series
    if (status === 'cancelled' && currentRental.is_recurring && update_scope !== 'single') {
      patch.is_recurring = false;
    }

    const data = await rentalRepo.update(id, input.account_id, patch);
    if (!data) {
      throw new NotFoundError('Rental not found');
    }
    notifier.notify(input.account_id, data, 'rental_updated');
    return data;
  };

module.exports = { makeUpdateRentalStatus, VALID_STATUSES };
