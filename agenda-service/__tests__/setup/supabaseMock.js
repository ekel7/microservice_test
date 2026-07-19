/**
 * Mock factory for the Supabase client.
 *
 * Supports the chainable query builder pattern used throughout the routes:
 *   const { data, error } = await supabase.from('rentals').select('*').eq('id', id).single();
 *   const { data, error } = await supabase.from('rentals').select('*').eq('a', 1);
 *   const { error } = await supabase.from('rental_exceptions').delete().eq('rental_id', id);
 *
 * Usage in tests:
 *   setConfig({
 *     rentals: { data: [...], error: null },
 *     courts:  (state) => state.operation === 'insert' ? {...} : {...}
 *   });
 *
 * For tables called multiple times (e.g. two selects on 'rentals'), use a queue:
 *   setConfig({
 *     rentals: [
 *       { data: regularRentals, error: null },   // first call
 *       { data: recurringRentals, error: null }  // second call
 *     ]
 *   });
 */

let config = {};

function setConfig(c) {
  config = c || {};
}

function getConfig() {
  return config;
}

function createBuilder(table) {
  const state = { table, operation: 'select' };

  function resolve() {
    const entry = config[table];
    if (!entry) return { data: null, error: null };
    if (Array.isArray(entry)) {
      if (entry.length === 0) return { data: null, error: null };
      return entry.shift();
    }
    if (typeof entry === 'function') return entry(state);
    return entry;
  }

  const builder = {
    from(t) { return createBuilder(t); },
    select() { return builder; },
    insert() { state.operation = 'insert'; return builder; },
    update() { state.operation = 'update'; return builder; },
    delete() { state.operation = 'delete'; return builder; },
    upsert() { state.operation = 'upsert'; return builder; },
    eq() { return builder; },
    neq() { return builder; },
    gte() { return builder; },
    lte() { return builder; },
    or() { return builder; },
    in() { return builder; },
    order() { return builder; },
    range() { return builder; },
    single() { return Promise.resolve(resolve()); },
    then(onFulfilled) { onFulfilled(resolve()); },
    _state: state
  };

  return builder;
}

module.exports = {
  from(table) { return createBuilder(table); },
  setConfig,
  getConfig
};
