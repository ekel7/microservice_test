/**
 * Supabase adapter for the ExceptionRepository port.
 */

/**
 * @param {object} deps
 * @param {import('@supabase/supabase-js').SupabaseClient} deps.supabase
 * @returns {import('../../domain/ports/exception-repository').ExceptionRepository}
 */
const makeSupabaseExceptionRepository = ({ supabase }) => ({
  async listByRental(rentalId) {
    const { data, error } = await supabase
      .from('rental_exceptions')
      .select('*')
      .eq('rental_id', rentalId);

    if (error) throw new Error(error.message);
    return data || [];
  },

  async listByRentalIds(rentalIds) {
    if (!rentalIds || rentalIds.length === 0) return [];

    const { data, error } = await supabase
      .from('rental_exceptions')
      .select('*')
      .in('rental_id', rentalIds);

    if (error) throw new Error(error.message);
    return data || [];
  },

  async upsert(exception) {
    const { data, error } = await supabase
      .from('rental_exceptions')
      .upsert(exception, {
        onConflict: 'rental_id,exception_date'
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async deleteByDate(rentalId, exceptionDate) {
    const { error } = await supabase
      .from('rental_exceptions')
      .delete()
      .eq('rental_id', rentalId)
      .eq('exception_date', exceptionDate);

    if (error) throw new Error(error.message);
  },
});

module.exports = { makeSupabaseExceptionRepository };
