const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');
const { authenticateAdmin, logAdminActivity } = require('../middleware/adminAuth');
const { updateAccountPayment, getAccountsRequiringWarning, determineAccountStatus } = require('../utils/gracePeriodUtils');
const { nowUTC } = require('../utils/dateUtils');
const { TIMEZONES } = require('../config/timezones');

const router = express.Router();

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// Get all accounts with stats
router.get('/', async (req, res) => {
  try {
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select(`
        *,
        users(count),
        courts(count),
        clients(count)
      `);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(accounts);
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single account details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: account, error } = await supabase
      .from('accounts')
      .select(`
        *,
        users(*),
        courts(*),
        clients(*),
        payments(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(account);
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new account
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      slug, 
      timezone,
      subscription_plan, 
      max_courts, 
      max_users,
      admin_email,
      admin_full_name,
      admin_password
    } = req.body;

    if (!name || !slug || !admin_email || !admin_full_name || !admin_password) {
      return res.status(400).json({ 
        error: 'Name, slug, admin email, admin full name, and admin password are required' 
      });
    }

    const accountData = {
      name,
      slug,
      timezone: timezone || TIMEZONES.DEFAULT,
      status: 'active',
      subscription_plan: subscription_plan || 'basic',
      max_courts: max_courts || 5,
      max_users: max_users || 10
    };

    // Create account first
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .insert([accountData])
      .select()
      .single();

    if (accountError) {
      if (accountError.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'Account slug already exists' });
      }
      return res.status(500).json({ error: accountError.message });
    }

    // Create admin user for the account
    const hashedPassword = await bcrypt.hash(admin_password, 12);
    
    const adminUserData = {
      email: admin_email,
      full_name: admin_full_name,
      role: 'admin',
      password_hash: hashedPassword,
      account_id: account.id,
      is_active: true
    };

    const { data: adminUser, error: userError } = await supabase
      .from('users')
      .insert([adminUserData])
      .select('id, email, full_name, role, is_active, created_at')
      .single();

    if (userError) {
      // Rollback account creation if user creation fails
      await supabase.from('accounts').delete().eq('id', account.id);
      
      if (userError.code === '23505') { // Unique constraint violation
        return res.status(400).json({ error: 'Admin email already exists' });
      }
      return res.status(500).json({ error: `Failed to create admin user: ${userError.message}` });
    }

    // Create default platform settings for the new account
    const platformSettingsData = {
      account_id: account.id,
      platform_title: name || 'Alquiler de Canchas',
      platform_logo: ''
    };

    const { error: settingsError } = await supabase
      .from('platform_settings')
      .insert([platformSettingsData]);

    if (settingsError) {
      console.error('Failed to create platform settings:', settingsError);
      // Don't fail the account creation, just log the error
    }

    // Log activity
    await logAdminActivity(req.admin.id, 'CREATE_ACCOUNT', 'account', account.id, { name, slug, admin_email }, req);

    res.status(201).json({
      account,
      admin_user: adminUser
    });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update account status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'trial', 'grace_period', 'locked'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data: account, error } = await supabase
      .from('accounts')
      .update({ status, updated_at: nowUTC() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Log activity
    await logAdminActivity(req.admin.id, 'UPDATE_ACCOUNT_STATUS', 'account', id, { status }, req);

    res.json(account);
  } catch (error) {
    console.error('Update account status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update account settings
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, timezone, subscription_plan, max_courts, max_users, settings } = req.body;

    const updateData = {
      updated_at: nowUTC()
    };

    if (name) updateData.name = name;
    if (timezone) updateData.timezone = timezone;
    if (subscription_plan) updateData.subscription_plan = subscription_plan;
    if (max_courts !== undefined) updateData.max_courts = max_courts;
    if (max_users !== undefined) updateData.max_users = max_users;
    if (settings) updateData.settings = settings;

    const { data: account, error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Log activity
    await logAdminActivity(req.admin.id, 'UPDATE_ACCOUNT', 'account', id, updateData, req);

    res.json(account);
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete account (soft delete by setting status to suspended)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: account, error } = await supabase
      .from('accounts')
      .update({ 
        status: 'suspended',
        updated_at: nowUTC()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Log activity
    await logAdminActivity(req.admin.id, 'DELETE_ACCOUNT', 'account', id, {}, req);

    res.json({ message: 'Account suspended successfully', account });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get accounts requiring grace period warnings
router.get('/warnings', async (req, res) => {
  try {
    const accounts = await getAccountsRequiringWarning();
    res.json(accounts);
  } catch (error) {
    console.error('Get accounts with warnings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process payment for an account (admin action)
router.post('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_method, transaction_id, description } = req.body;

    if (!amount || !payment_method) {
      return res.status(400).json({ error: 'Amount and payment method are required' });
    }

    // Record payment in payments table
    const paymentData = {
      account_id: id,
      amount: parseFloat(amount),
      payment_method,
      payment_status: 'completed',
      transaction_id,
      description: description || 'Admin processed payment',
      processed_by: req.admin.id,
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
    const updateResult = await updateAccountPayment(id);

    if (!updateResult.success) {
      return res.status(500).json({ error: updateResult.error });
    }

    // Get updated account info
    const { data: updatedAccount, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single();

    if (accountError) {
      return res.status(500).json({ error: accountError.message });
    }

    // Log activity
    await logAdminActivity(req.admin.id, 'PROCESS_PAYMENT', 'account', id, { amount, payment_method }, req);

    const statusInfo = determineAccountStatus(updatedAccount);

    res.json({
      payment,
      account: {
        ...updatedAccount,
        statusInfo
      }
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unlock account (admin action)
router.post('/:id/unlock', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: account, error } = await supabase
      .from('accounts')
      .update({ 
        is_locked: false,
        status: 'active',
        updated_at: nowUTC()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Log activity
    await logAdminActivity(req.admin.id, 'UNLOCK_ACCOUNT', 'account', id, {}, req);

    res.json({ message: 'Account unlocked successfully', account });
  } catch (error) {
    console.error('Unlock account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
