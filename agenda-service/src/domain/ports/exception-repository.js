/**
 * ExceptionRepository port (driven).
 *
 * Exceptions are per-occurrence overrides of recurring rentals
 * (`rental_exceptions` table). Ownership of the parent rental is verified
 * through RentalRepository; this port trusts the rentalId it receives but
 * still scopes by accountId where the schema allows it.
 *
 * @typedef {object} ExceptionRepository
 * @property {(rentalId: string) => Promise<Array>} listByRental
 *           All exceptions of a rental.
 * @property {(rentalIds: string[]) => Promise<Array>} listByRentalIds
 *           All exceptions of many rentals (calendar view).
 * @property {(exception: object) => Promise<object>} upsert
 *           Upserts on `rental_id,exception_date` and returns the stored row.
 * @property {(rentalId: string, exceptionDate: string) => Promise<void>} deleteByDate
 *           Removes the exception of a specific occurrence date.
 */

const METHODS = Object.freeze(['listByRental', 'listByRentalIds', 'upsert', 'deleteByDate']);

module.exports = { METHODS };
