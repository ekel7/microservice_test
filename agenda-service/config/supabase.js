/**
 * Legacy re-export shim.
 *
 * The Supabase client is created in
 * `src/infrastructure/persistence/supabase-client.js` (Phase 2 of the
 * hexagonal migration — see docs/HEXAGONAL_MIGRATION.md). This keeps existing
 * `require('../config/supabase')` call sites working until Phase 4 removes
 * the legacy layout.
 */

module.exports = require('../src/infrastructure/persistence/supabase-client');
