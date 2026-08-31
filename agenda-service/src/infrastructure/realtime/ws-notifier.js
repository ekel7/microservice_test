/**
 * WebSocket adapter for the NotificationPort.
 *
 * Wraps the broadcast function installed by server.js (`app.locals`), keeping
 * the domain/application free of any WebSocket knowledge. Fire-and-forget:
 * delivery problems must never break the request that triggered them.
 */

/**
 * @param {object} deps
 * @param {(accountId: string, data: object, event: string) => void} [deps.broadcast]
 *        server.js broadcastRentalUpdate; optional so the service can boot
 *        without realtime (notifications become no-ops).
 * @returns {import('../../domain/ports/notification-port').NotificationPort}
 */
const makeWsNotifier = ({ broadcast } = {}) => ({
  notify(accountId, data, event) {
    if (typeof broadcast !== 'function') return;
    try {
      broadcast(accountId, data, event);
    } catch (error) {
      console.error('ws-notifier: broadcast failed:', error.message);
    }
  },
});

module.exports = { makeWsNotifier };
