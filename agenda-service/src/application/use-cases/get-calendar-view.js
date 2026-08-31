/**
 * GetCalendarView use case.
 *
 * Combines non-recurring rentals within [start_date, end_date] with
 * recurring rentals (created before or during end_date) plus their
 * exceptions. Response shape frozen to the legacy API:
 * `{ rentals: [...regular, ...recurring], exceptions }`.
 */

const { addTimeToDateAsISOString } = require('../../domain/services/time');
const { TIMEZONES } = require('../../domain/timezones');
const { ValidationError } = require('../../domain/errors');

/**
 * @param {object} deps
 * @param {import('../../domain/ports/rental-repository').RentalRepository} deps.rentalRepo
 * @param {import('../../domain/ports/exception-repository').ExceptionRepository} deps.exceptionRepo
 * @returns {(input: object) => Promise<{rentals: Array, exceptions: Array}>}
 */
const makeGetCalendarView = ({ rentalRepo, exceptionRepo }) =>
  async (input) => {
    if (!input.start_date || !input.end_date) {
      throw new ValidationError('Start date and end date are required');
    }

    const timezone = input.account_timezone || TIMEZONES.DEFAULT;

    const regular = await rentalRepo.listRegularBetween(
      input.account_id,
      addTimeToDateAsISOString(input.start_date, '00:00:00', timezone),
      addTimeToDateAsISOString(input.end_date, '23:59:59', timezone),
    );

    const recurring = await rentalRepo.listRecurringStartingBefore(
      input.account_id,
      addTimeToDateAsISOString(input.end_date, '23:59:59', timezone),
    );

    let exceptions = [];
    if (recurring && recurring.length > 0) {
      try {
        exceptions = await exceptionRepo.listByRentalIds(recurring.map(r => r.id));
      } catch (error) {
        // legacy behavior: calendar still renders if the exceptions query fails
        console.error('Get calendar view exceptions error:', error.message);
      }
    }

    return { rentals: [...regular, ...recurring], exceptions };
  };

module.exports = { makeGetCalendarView };
