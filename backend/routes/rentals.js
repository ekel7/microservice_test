const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { addTimeToDateAsISOString } = require('../utils/dateUtils');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all rentals
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, start_date, end_date, court_id } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
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
      `, { count: 'exact' })
      .eq('account_id', req.user.account_id)
      .order('start_datetime', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (start_date) {
      query = query.gte('start_datetime', addTimeToDateAsISOString(start_date, '00:00:00', req.user.account_timezone));
    }
    if (end_date) {
      query = query.lte('end_datetime', addTimeToDateAsISOString(end_date, '23:59:59', req.user.account_timezone));
    }
    if (court_id) {
      query = query.eq('court_id', court_id);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      rentals: data,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get rentals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get rental by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

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
      .eq('account_id', req.user.account_id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get rental error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete rental (admin only)
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('rentals')
      .delete()
      .eq('id', id)
      .eq('account_id', req.user.account_id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Rental deleted successfully' });
  } catch (error) {
    console.error('Delete rental error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
