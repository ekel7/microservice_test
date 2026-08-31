/**
 * Supabase adapter for the CourtRepository port.
 */

/**
 * @param {object} deps
 * @param {import('@supabase/supabase-js').SupabaseClient} deps.supabase
 * @returns {import('../../domain/ports/court-repository').CourtRepository}
 */
const makeSupabaseCourtRepository = ({ supabase }) => ({
  async findByIdWithRate(id, accountId) {
    const { data, error } = await supabase
      .from('courts')
      .select('id, hourly_rate, status')
      .eq('id', id)
      .eq('account_id', accountId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  },
});

module.exports = { makeSupabaseCourtRepository };
