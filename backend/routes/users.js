const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all users (admin only)
router.get('/', requireRole(['admin']), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, created_at')
      .eq('account_id', req.user.account_id)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (admin only)
router.post('/', requireRole(['admin']), async (req, res) => {
  try {
    const { email, full_name, role, password } = req.body;

    if (!email || !full_name || !role || !password) {
      return res.status(400).json({ error: 'Email, full name, role, and password are required' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        full_name,
        role,
        password_hash: hashedPassword,
        account_id: req.user.account_id,
        is_active: true
      })
      .select('id, email, full_name, role, is_active, created_at')
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'Email already exists' });
      }
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin only)
router.put('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, role, is_active, password } = req.body;

    const updateData = {
      email,
      full_name,
      role,
      is_active
    };

    // If password is provided, hash it and include in update
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 12);
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .eq('account_id', req.user.account_id)
      .select('id, email, full_name, role, is_active');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(403).json({ error: 'Cannot delete your own account' });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('account_id', req.user.account_id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

