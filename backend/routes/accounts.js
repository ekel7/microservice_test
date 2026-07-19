const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { getGracePeriodWarning, determineAccountStatus, updateAccountPayment } = require('../utils/gracePeriodUtils');
const { nowUTC } = require('../utils/dateUtils');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get current account info
router.get('/current', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', req.user.account_id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Add grace period status and warning information
    const statusInfo = determineAccountStatus(data);
    const warning = getGracePeriodWarning(data);

    const accountWithStatus = {
      ...data,
      statusInfo,
      warning
    };

    res.json(accountWithStatus);
  } catch (error) {
    console.error('Get current account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update account settings (admin only)
router.put('/current', requireRole('admin'), async (req, res) => {
  try {
    const { name, settings } = req.body;
    
    const updates = {};
    if (name) updates.name = name;
    if (settings) updates.settings = settings;

    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', req.user.account_id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get account statistics
router.get('/stats', async (req, res) => {
  try {
    // Get counts for all entities in the account
    const [usersCount, clientsCount, courtsCount, rentalsCount] = await Promise.all([
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', req.user.account_id),
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', req.user.account_id),
      supabase
        .from('courts')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', req.user.account_id),
      supabase
        .from('rentals')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', req.user.account_id)
    ]);

    // Get active rentals count
    const { count: activeRentalsCount, error: activeRentalsError } = await supabase
      .from('rentals')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', req.user.account_id)
      .in('status', ['pending', 'confirmed']);

    if (activeRentalsError) {
      return res.status(500).json({ error: activeRentalsError.message });
    }

    res.json({
      users: usersCount.count || 0,
      clients: clientsCount.count || 0,
      courts: courtsCount.count || 0,
      rentals: rentalsCount.count || 0,
      activeRentals: activeRentalsCount || 0
    });
  } catch (error) {
    console.error('Get account stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process payment and update grace period (admin only)
router.post('/payment', requireRole('admin'), async (req, res) => {
  try {
    const { amount, payment_method, transaction_id, description } = req.body;

    if (!amount || !payment_method) {
      return res.status(400).json({ error: 'Amount and payment method are required' });
    }

    // Record payment in payments table
    const paymentData = {
      account_id: req.user.account_id,
      amount: parseFloat(amount),
      payment_method,
      payment_status: 'completed',
      transaction_id,
      description: description || 'Account payment',
      processed_at: nowUTC()
    };

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (paymentError) {
      return res.status(500).json({ error: paymentError.message });
    }

    // Update account payment date and reset grace period
    const updateResult = await updateAccountPayment(req.user.account_id);

    if (!updateResult.success) {
      return res.status(500).json({ error: updateResult.error });
    }

    // Get updated account info
    const { data: updatedAccount, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', req.user.account_id)
      .single();

    if (accountError) {
      return res.status(500).json({ error: accountError.message });
    }

    const statusInfo = determineAccountStatus(updatedAccount);
    const warning = getGracePeriodWarning(updatedAccount);

    res.json({
      payment,
      account: {
        ...updatedAccount,
        statusInfo,
        warning
      }
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get grace period warning for current account
router.get('/warning', async (req, res) => {
  try {
    const { data: account, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', req.user.account_id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const warning = getGracePeriodWarning(account);
    const statusInfo = determineAccountStatus(account);

    res.json({
      warning,
      statusInfo,
      account: {
        subscription_plan: account.subscription_plan,
        status: account.status,
        is_locked: account.is_locked
      }
    });
  } catch (error) {
    console.error('Get warning error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
