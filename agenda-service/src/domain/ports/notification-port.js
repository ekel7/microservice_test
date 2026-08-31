/**
 * NotificationPort (driven) — outbound realtime notifications.
 *
 * The domain/application must not know about WebSockets: they notify
 * "the account channel" and the adapter decides the transport.
 *
 * Current implementation: WebSocket broadcast (ws-notifier) which wraps
 * server.js `broadcastRentalUpdate(accountId, data, event)`.
 *
 * @typedef {object} NotificationPort
 * @property {(accountId: string, data: object, event: string) => void} notify
 *           Fire-and-forget: must never throw to the caller. Delivery
 *           failures are logged by the adapter, not surfaced as errors.
 */

const METHODS = Object.freeze(['notify']);

module.exports = { METHODS };
