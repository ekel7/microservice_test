/**
 * RentalRepository port (driven).
 *
 * Every operation is FORCE-SCOPED by `accountId`: a row must belong to that
 * account or the method behaves as if it does not exist (null / empty).
 * Adapters MUST NOT leak rows across accounts.
 *
 * Error semantics:
 * - "Not found" resolves to `null` (or empty array for lists) — never throws.
 * - Genuine persistence failures throw (the HTTP adapter maps them to 500).
 *
 * @typedef {object} RentalRepository
 * @property {(id: string, accountId: string) => Promise<object|null>} findById
 *           Raw row or null.
 * @property {(id: string, accountId: string) => Promise<object|null>} findByIdWithRelations
 *           Row + `client`/`court`/`user` joined objects, or null.
 * @property {(rental: object) => Promise<object>} create
 *           Persists a domain-built rental (defaults already applied by the
 *           domain — the adapter must serialize it verbatim) and returns the
 *           stored row with client/court/user relations.
 * @property {(id: string, accountId: string, patch: object) => Promise<object>} update
 *           Applies a partial patch (only provided keys), returns the updated
 *           row with relations.
 * @property {(courtId: string, accountId: string) => Promise<Array>} listByCourt
 *           All rentals of a court (any status, any date — overlap filtering
 *           is domain policy, not persistence). Rows carry
 *           `id, start_datetime, end_datetime, status`.
 * @property {(accountId: string, startISO: string, endISO: string) => Promise<Array>} listRegularBetween
 *           Non-recurring rentals of the account with start within
 *           [startISO, endISO], ordered by start_datetime, with client/court
 *           relations.
 * @property {(accountId: string, endISO: string) => Promise<Array>} listRecurringStartingBefore
 *           Recurring rentals of the account created before or during endISO,
 *           ordered by start_datetime, with client/court relations.
 */

/**
 * Method names every RentalRepository adapter must implement.
 * Used by adapter self-checks, test fakes and the Phase 5 architecture guard.
 */
const METHODS = Object.freeze([
  'findById',
  'findByIdWithRelations',
  'create',
  'update',
  'listByCourt',
  'listRegularBetween',
  'listRecurringStartingBefore',
]);

module.exports = { METHODS };
