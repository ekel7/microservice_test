/**
 * HTTP adapter for the agenda service (Phase 4: all endpoints).
 *
 * Controllers are thin: parse, call the use case, map domain errors to the
 * CURRENT API contract. Response codes are frozen to what the legacy routes
 * returned — notably conflicts respond 400 (not 409).
 *
 * Response shapes frozen from the legacy API:
 * - POST   /rentals                        → 201 rental
 * - PUT    /rentals/:id                    → 200 rental | rental+exception
 * - PUT    /rentals/:id/status             → 200 rental | rental+exception
 * - GET    /calendar/view                  → 200 { rentals, exceptions }
 * - GET    /rentals/:id/exceptions         → 200 array
 * - POST   /rentals/:id/exceptions         → 201 exception
 * - DELETE /rentals/:id/exceptions/:date   → 204 empty
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
 * @param {(input: object) => Promise<object>} deps.createRental
 * @param {(input: object) => Promise<object>} deps.updateRental
 * @param {(input: object) => Promise<object>} deps.updateRentalStatus
 * @param {(input: object) => Promise<{rentals: Array, exceptions: Array}>} deps.getCalendarView
 * @param {(input: object) => Promise<Array>} deps.listExceptions
 * @param {(input: object) => Promise<object>} deps.createException
 * @param {(input: object) => Promise<void>} deps.deleteException
 */
const makeAgendaRouter = ({
  createRental,
  updateRental,
  updateRentalStatus,
  getCalendarView,
  listExceptions,
  createException,
  deleteException,
}) => {
  const router = express.Router();

  router.use(authenticateToken);

  router.post('/rentals', async (req, res) => {
    try {
      // auth context wins over anything in the body (multi-tenant safety)
      const data = await createRental({
        ...req.body,
        account_id: req.user.account_id,
        user_id: req.user.id,
      });
      return res.status(201).json(data);
    } catch (error) {
      return errorResponse(res, error);
    }
  });

  router.put('/rentals/:id', async (req, res) => {
    try {
      const data = await updateRental({
        ...req.body,
        rentalId: req.params.id,
        account_id: req.user.account_id,
        user_id: req.user.id,
      });
      return res.json(data);
    } catch (error) {
      return errorResponse(res, error);
    }
  });

  router.put('/rentals/:id/status', async (req, res) => {
    try {
      const data = await updateRentalStatus({
        ...req.body,
        rentalId: req.params.id,
        account_id: req.user.account_id,
      });
      return res.json(data);
    } catch (error) {
      return errorResponse(res, error);
    }
  });

  router.get('/calendar/view', async (req, res) => {
    try {
      const data = await getCalendarView({
        account_id: req.user.account_id,
        account_timezone: req.user.account_timezone,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
      });
      return res.json(data);
    } catch (error) {
      return errorResponse(res, error);
    }
  });

  router.get('/rentals/:id/exceptions', async (req, res) => {
    try {
      const data = await listExceptions({
        rentalId: req.params.id,
        account_id: req.user.account_id,
      });
      return res.json(data);
    } catch (error) {
      return errorResponse(res, error);
    }
  });

  router.post('/rentals/:id/exceptions', async (req, res) => {
    try {
      const data = await createException({
        ...req.body,
        rentalId: req.params.id,
        account_id: req.user.account_id,
      });
      return res.status(201).json(data);
    } catch (error) {
      return errorResponse(res, error);
    }
  });

  router.delete('/rentals/:id/exceptions/:date', async (req, res) => {
    try {
      await deleteException({
        rentalId: req.params.id,
        exceptionDate: req.params.date,
        account_id: req.user.account_id,
      });
      return res.status(204).send();
    } catch (error) {
      return errorResponse(res, error);
    }
  });

  return router;
};

module.exports = { makeAgendaRouter, errorResponse };
