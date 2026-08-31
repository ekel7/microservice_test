/**
 * Supabase adapter for the RentalRepository port.
 *
 * Query shapes replicate the legacy route queries 1:1 (contract freeze):
 * selects include client/court/user relations where the API returns them.
 * Business rules (status filtering for overlaps) live in the domain — this
 * adapter returns raw rows, `listByCourt` intentionally has NO status filter.
 */

const NOT_FOUND_CODES = new Set(['PGRST116']);

/**
 * @param {object} deps
 * @param {import('@supabase/supabase-js').SupabaseClient} deps.supabase
 * @returns {import('../../domain/ports/rental-repository').RentalRepository}
 */
const makeSupabaseRentalRepository = ({ supabase }) => ({
  async findById(id, accountId) {
    const { data, error } = await supabase
      .from('rentals')
      .select('*')
      .eq('id', id)
      .eq('account_id', accountId)
      .single();

    if (error) {
      if (NOT_FOUND_CODES.has(error.code)) return null;
      throw new Error(error.message);
    }
    return data;
  },

  async findByIdWithRelations(id, accountId) {
    const { data, error } = await supabase
      .from('rentals')
      .select(`
        id,
        account_id,
        client_id,
        court_id,
        user_id,
        start_datetime,
        end_datetime,
        total_amount,
        status,
        notes,
        is_recurring,
        created_at,
        updated_at,
        client:clients(full_name, email, phone),
        court:courts(name, hourly_rate),
        user:users(full_name, email)
      `)
      .eq('id', id)
      .eq('account_id', accountId)
      .single();

    if (error) {
      if (NOT_FOUND_CODES.has(error.code)) return null;
      throw new Error(error.message);
    }
    return data;
  },

  async create(rental) {
    const { data, error } = await supabase
      .from('rentals')
      .insert([rental])
      .select(`
        id,
        account_id,
        client_id,
        court_id,
        user_id,
        start_datetime,
        end_datetime,
        total_amount,
        status,
        notes,
        is_recurring,
        created_at,
        updated_at,
        client:clients(full_name, email, phone),
        court:courts(name, hourly_rate),
        user:users(full_name, email)
      `)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async update(id, accountId, patch) {
    const { data, error } = await supabase
      .from('rentals')
      .update(patch)
      .eq('id', id)
      .eq('account_id', accountId)
      .select(`
        id,
        account_id,
        client_id,
        court_id,
        user_id,
        start_datetime,
        end_datetime,
        total_amount,
        status,
        notes,
        is_recurring,
        created_at,
        updated_at,
        client:clients(full_name, email, phone),
        court:courts(name, hourly_rate),
        user:users(full_name, email)
      `)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async listByCourt(courtId, accountId) {
    const { data, error } = await supabase
      .from('rentals')
      .select('id, start_datetime, end_datetime, status')
      .eq('court_id', courtId)
      .eq('account_id', accountId);

    if (error) throw new Error(error.message);
    return data || [];
  },

  async listRegularBetween(accountId, startISO, endISO) {
    const { data, error } = await supabase
      .from('rentals')
      .select(`
        id,
        client_id,
        court_id,
        start_datetime,
        end_datetime,
        status,
        total_amount,
        notes,
        is_recurring,
        client:clients(id, full_name, phone),
        court:courts(id, name, hourly_rate)
      `)
      .eq('account_id', accountId)
      .eq('is_recurring', false)
      .gte('start_datetime', startISO)
      .lte('end_datetime', endISO)
      .order('start_datetime', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async listRecurringStartingBefore(accountId, endISO) {
    const { data, error } = await supabase
      .from('rentals')
      .select(`
        id,
        client_id,
        court_id,
        start_datetime,
        end_datetime,
        status,
        total_amount,
        notes,
        is_recurring,
        client:clients(id, full_name, phone),
        court:courts(id, name, hourly_rate)
      `)
      .eq('account_id', accountId)
      .eq('is_recurring', true)
      .lte('start_datetime', endISO)
      .order('start_datetime', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },
});

module.exports = { makeSupabaseRentalRepository };
