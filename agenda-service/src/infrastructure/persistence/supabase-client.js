/**
 * Supabase client factory — the ONLY place in the service that creates it.
 *
 * `config/supabase.js` re-exports this module for legacy compatibility
 * (Phase 4 removes the shim).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { transport: ws }
});

module.exports = supabase;
