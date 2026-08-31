/**
 * CourtRepository port (driven).
 *
 * Force-scoped by `accountId`, same error semantics as RentalRepository.
 *
 * @typedef {object} CourtRepository
 * @property {(id: string, accountId: string) => Promise<object|null>} findByIdWithRate
 *           `{ id, hourly_rate, status }` or null. Used by pricing and the
 *           "court must be available" business rule.
 */

const METHODS = Object.freeze(['findByIdWithRate']);

module.exports = { METHODS };
