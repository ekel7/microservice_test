/**
 * HTTP adapter for the agenda service (Phase 3: POST /rentals only).
 *
 * Controllers are thin: parse, call the use case, map domain errors to the
 * CURRENT API contract. Response codes are frozen to what the legacy routes
 * returned — notably conflicts respond 400 (not 409).
 */

const express = require('express');
const { authenticateToken } = require('../../../../middleware/auth');
const { DomainError, ValidationError, NotFoundError, ConflictError } = require('../../../domain/errors');

/**
 * Map a domain error to the legacy HTTP contract.
 * Generic (non-domain) errors keep the legacy shape: 500 with the error message.
 */
function errorResponse(res, error) {
  if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
  if (error instanceof ConflictError) return res.status(400).json({ error: error.message }); // legacy contract
  if (error instanceof NotFoundError) return res.status(404).json({ error: error.message });
  if (error instanceof DomainError) return res.status(error.status).json({ error: error.message });
  return res.status(500).json({ error: error.message });
}

/**
 * @param {object} deps
 * @param {(input: object) => Promise<object>} deps.createRental - use case
 * @param {import('../../../domain/ports/notification-port').NotificationPort} deps.notifier
 */
const makeAgendaRouter = ({ createRental, notifier }) => {
  const router = express.Router();

  router.post('/rentals', authenticateToken, async (req, res) => {
    try {
      // auth context wins over anything in the body (multi-tenant safety)
      const data = await createRental({
        ...req.body,
        account_id: req.user.account_id,
        user_id: req.user.id,
      });
      notifier.notify(req.user.account_id, data, 'rental_created');
      return res.status(201).json(data);
    } catch (error) {
      return errorResponse(res, error);
    }
  });

  return router;
};

module.exports = { makeAgendaRouter, errorResponse };
