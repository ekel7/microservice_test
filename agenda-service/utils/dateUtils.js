/**
 * Legacy re-export shim.
 *
 * The real implementation lives in `src/domain/services/time.js` (Phase 1 of
 * the hexagonal migration — see docs/HEXAGONAL_MIGRATION.md). This file keeps
 * existing `require('../utils/dateUtils')` call sites working until Phase 4
 * removes the legacy layout.
 */

module.exports = require('../src/domain/services/time');
