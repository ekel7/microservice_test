const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { TIMEZONES } = require('../config/timezones');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user from database with account info
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, email, password_hash, full_name, role, is_active, account_id, force_password_change,
        accounts!account_id(name, slug, status, timezone)
      `)
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    if (user.accounts.status === 'suspended') {
      return res.status(401).json({ error: 'Account is suspended' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        account_id: user.account_id,
        account_slug: user.accounts.slug,
        account_timezone: user.accounts.timezone || TIMEZONES.DEFAULT,
        force_password_change: user.force_password_change
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        account_id: user.account_id,
        force_password_change: user.force_password_change,
        account: {
          id: user.accounts.id,
          name: user.accounts.name,
          slug: user.accounts.slug,
          status: user.accounts.status
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({ token });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password, currentPassword, newPassword } = req.body;

    // Support both naming conventions
    const currentPwd = current_password || currentPassword;
    const newPwd = new_password || newPassword;

    if (!newPwd) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (newPwd.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get user's current password hash
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('password_hash, force_password_change')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For forced password changes, skip current password verification
    if (!user.force_password_change) {
      // Verify current password only if not forced change
      if (!currentPwd) {
        return res.status(400).json({ error: 'Current password is required' });
      }
      const isValidPassword = await bcrypt.compare(currentPwd, user.password_hash);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPwd, 12);

    // Update password and clear force password change flag
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedNewPassword,
        force_password_change: false
      })
      .eq('id', req.user.id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
