/**
 * Supabase adapter for the ClientRepository port.
 */

/**
 * @param {object} deps
 * @param {import('@supabase/supabase-js').SupabaseClient} deps.supabase
 * @returns {import('../../domain/ports/client-repository').ClientRepository}
 */
const makeSupabaseClientRepository = ({ supabase }) => ({
  async existsInAccount(id, accountId) {
    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .eq('id', id)
      .eq('account_id', accountId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return false;
      throw new Error(error.message);
    }
    return Boolean(data);
  },
});

module.exports = { makeSupabaseClientRepository };
