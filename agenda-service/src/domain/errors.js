/**
 * Domain error hierarchy.
 *
 * These errors express business rule violations. HTTP adapters are
 * responsible for mapping `error.status` to response codes (Phase 3),
 * preserving the current API contract.
 */

class DomainError extends Error {
  /**
   * @param {string} message
   * @param {number} status - suggested HTTP status code (adapters decide the final one)
   */
  constructor(message, status = 500) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

class NotFoundError extends DomainError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ValidationError extends DomainError {
  constructor(message = 'Invalid input') {
    super(message, 400);
  }
}

class ConflictError extends DomainError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

module.exports = {
  DomainError,
  NotFoundError,
  ValidationError,
  ConflictError,
};
