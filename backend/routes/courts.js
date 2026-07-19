const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all courts
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .eq('account_id', req.user.account_id)
      .order('name', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Get courts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get court by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .eq('id', id)
      .eq('account_id', req.user.account_id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Court not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get court error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new court (admin only)
router.post('/', requireRole(['admin']), async (req, res) => {
  try {
    const { name, description, hourly_rate, surface_type, is_covered, max_capacity } = req.body;

    if (!name || !hourly_rate) {
      return res.status(400).json({ error: 'Name and hourly rate are required' });
    }

    const { data, error } = await supabase
      .from('courts')
      .insert([{
        account_id: req.user.account_id,
        name,
        description,
        hourly_rate,
        surface_type,
        is_covered,
        max_capacity
      }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create court error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update court (admin only)
router.put('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, hourly_rate, status, surface_type, is_covered, max_capacity } = req.body;

    const { data, error } = await supabase
      .from('courts')
      .update({
        name,
        description,
        hourly_rate,
        status,
        surface_type,
        is_covered,
        max_capacity
      })
      .eq('id', id)
      .eq('account_id', req.user.account_id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Court not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Update court error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete court (admin only)
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('courts')
      .delete()
      .eq('id', id)
      .eq('account_id', req.user.account_id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Court deleted successfully' });
  } catch (error) {
    console.error('Delete court error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get court availability for a specific date range
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const { data, error } = await supabase
      .from('rentals')
      .select('start_datetime, end_datetime, status')
      .eq('court_id', id)
      .eq('account_id', req.user.account_id)
      .gte('start_datetime', start_date)
      .lte('end_datetime', end_date)
      .neq('status', 'cancelled')
      .order('start_datetime', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Get court availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
