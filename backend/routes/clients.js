const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all clients
router.get('/', async (req, res) => {
  try {
    console.log('=== GET /clients CALLED ===');
    console.log('GET /clients - Query params:', req.query);
    console.log('User account_id:', req.user?.account_id);
    
    const { page = 1, limit = 10, search = '' } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;
    
    console.log('Pagination params:', { page: pageNum, limit: limitNum, offset });

    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('account_id', req.user.account_id)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,membership_number.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.log('Database error getting clients:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`GET /clients returned ${data.length} clients out of ${count} total`);
    res.json({
      clients: data,
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(count / limitNum)
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get client by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('account_id', req.user.account_id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new client
router.post('/', async (req, res) => {
  try {
    console.log('=== POST /clients CALLED ===');
    console.log('POST /clients - Creating new client:', req.body);
    console.log('User account_id:', req.user?.account_id);
    
    const { full_name, email, phone, address, date_of_birth, membership_number } = req.body;

    if (!full_name || !phone) {
      return res.status(400).json({ error: 'Full name and phone are required' });
    }

    const { data, error } = await supabase
      .from('clients')
      .insert([{
        account_id: req.user.account_id,
        full_name,
        email: email && email.trim() !== '' ? email.trim() : null,  // Convert empty string to null
        phone,
        address: address && address.trim() !== '' ? address.trim() : null,  // Convert empty string to null
        date_of_birth,
        membership_number: membership_number && membership_number.trim() !== '' ? membership_number.trim() : null  // Convert empty string to null
      }])
      .select()
      .single();

    if (error) {
      console.log('Database error creating client:', error);
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: error.message });
    }

    console.log('Client created successfully:', data);
    res.status(201).json(data);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update client
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, address, date_of_birth, membership_number, is_active } = req.body;

    const { data, error } = await supabase
      .from('clients')
      .update({
        full_name,
        email: email && email.trim() !== '' ? email.trim() : null,  // Convert empty string to null
        phone,
        address: address && address.trim() !== '' ? address.trim() : null,  // Convert empty string to null
        date_of_birth,
        membership_number: membership_number && membership_number.trim() !== '' ? membership_number.trim() : null,  // Convert empty string to null
        is_active
      })
      .eq('id', id)
      .eq('account_id', req.user.account_id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete client (admin only)
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('account_id', req.user.account_id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
