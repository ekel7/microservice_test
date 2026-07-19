const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { authenticateAdmin, logAdminActivity } = require('../middleware/adminAuth');
const { nowUTC } = require('../utils/dateUtils');

const router = express.Router();

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// Get all users across all accounts
router.get('/', async (req, res) => {
  try {
    const { account_id, search, role, is_active } = req.query;
    
    let query = supabase
      .from('users')
      .select(`
        *,
        accounts!account_id(name, slug, status)
      `);

    if (account_id) query = query.eq('account_id', account_id);
    if (role) query = query.eq('role', role);
    if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single user details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,
        accounts!account_id(name, slug, status)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset user password
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Hash the new password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(new_password, saltRounds);

    const { data: user, error } = await supabase
      .from('users')
      .update({ 
        password_hash,
        force_password_change: true,
        updated_at: nowUTC()
      })
      .eq('id', id)
      .select('id, email, full_name, account_id')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log activity
    await logAdminActivity(req.admin.id, 'RESET_PASSWORD', 'user', id, { 
      user_email: user.email,
      user_name: user.full_name 
    }, req);

    res.json({ 
      message: 'Password reset successfully',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle user active status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ 
        is_active,
        updated_at: nowUTC()
      })
      .eq('id', id)
      .select(`
        *,
        accounts!account_id(name, slug)
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log activity
    await logAdminActivity(req.admin.id, is_active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', 'user', id, {
      user_email: user.email,
      user_name: user.full_name,
      account_name: user.accounts.name
    }, req);

    res.json(user);
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user role
router.patch('/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'employee'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({ 
        role,
        updated_at: nowUTC()
      })
      .eq('id', id)
      .select(`
        *,
        accounts!account_id(name, slug)
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log activity
    await logAdminActivity(req.admin.id, 'UPDATE_USER_ROLE', 'user', id, {
      user_email: user.email,
      user_name: user.full_name,
      new_role: role,
      account_name: user.accounts.name
    }, req);

    res.json(user);
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user activity stats
router.get('/:id/activity', async (req, res) => {
  try {
    const { id } = req.params;

    // This would typically involve more complex queries
    // For now, return basic user info with activity placeholder
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, email, full_name, created_at, updated_at, last_login,
        accounts!account_id(name, slug)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add activity stats (placeholder for now)
    const activity = {
      ...user,
      stats: {
        total_logins: 0, // Would be calculated from audit logs
        last_active: user.updated_at,
        actions_performed: 0 // Would be calculated from audit logs
      }
    };

    res.json(activity);
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
