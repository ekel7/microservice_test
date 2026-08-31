/**
 * ClientRepository port (driven).
 *
 * Force-scoped by `accountId`, same error semantics as RentalRepository.
 *
 * @typedef {object} ClientRepository
 * @property {(id: string, accountId: string) => Promise<boolean>} existsInAccount
 *           True only if the client exists AND belongs to the account.
 */

const METHODS = Object.freeze(['existsInAccount']);

module.exports = { METHODS };
