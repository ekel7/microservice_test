/**
 * ListExceptions use case — GET /rentals/:id/exceptions.
 */

const { NotFoundError, ValidationError } = require('../../../domain/errors');

/**
 * @param {object} deps
 * @param {import('../../domain/ports/rental-repository').RentalRepository} deps.rentalRepo
 * @param {import('../../domain/ports/exception-repository').ExceptionRepository} deps.exceptionRepo
 * @returns {(input: object) => Promise<Array>}
 */
const makeListExceptions = ({ rentalRepo, exceptionRepo }) =>
  async (input) => {
    const rental = await rentalRepo.findById(input.rentalId, input.account_id);
    if (!rental) {
      throw new NotFoundError('Rental not found');
    }
    if (!rental.is_recurring) {
      throw new ValidationError('This rental is not a recurring series');
    }
    return exceptionRepo.listByRental(input.rentalId);
  };

module.exports = { makeListExceptions };
