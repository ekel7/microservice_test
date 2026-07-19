const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { authenticateAdmin, logAdminActivity } = require('../middleware/adminAuth');
const { nowUTC } = require('../utils/dateUtils');

const router = express.Router();

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find admin by username
    const { data: admin, error } = await supabase
      .from('super_admins')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!admin.is_active) {
      return res.status(401).json({ error: 'Admin account is disabled' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await supabase
      .from('super_admins')
      .update({ last_login: nowUTC() })
      .eq('id', admin.id);

    // Generate JWT
    const token = jwt.sign(
      { adminId: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' }
    );

    // Log login activity
    await logAdminActivity(admin.id, 'LOGIN', null, null, { username }, req);

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        full_name: admin.full_name,
        last_login: admin.last_login
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current admin info
router.get('/me', authenticateAdmin, async (req, res) => {
  res.json(req.admin);
});

// Admin logout (for logging purposes)
router.post('/logout', authenticateAdmin, async (req, res) => {
  try {
    await logAdminActivity(req.admin.id, 'LOGOUT', null, null, {}, req);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
