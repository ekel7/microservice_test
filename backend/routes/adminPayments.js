const express = require('express');
const supabase = require('../config/supabase');
const { authenticateAdmin, logAdminActivity } = require('../middleware/adminAuth');
const { nowUTC } = require('../utils/dateUtils');

const router = express.Router();

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// Get all payments
router.get('/', async (req, res) => {
  try {
    const { account_id, status, start_date, end_date, limit = 50, offset = 0 } = req.query;
    
    let query = supabase
      .from('payments')
      .select(`
        *,
        accounts!account_id(name, slug),
        super_admins!processed_by(username, full_name)
      `);

    if (account_id) query = query.eq('account_id', account_id);
    if (status) query = query.eq('payment_status', status);
    if (start_date) query = query.gte('created_at', start_date);
    if (end_date) query = query.lte('created_at', end_date);

    query = query
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    const { data: payments, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single payment details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        accounts!account_id(name, slug, status),
        super_admins!processed_by(username, full_name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register new payment
router.post('/', async (req, res) => {
  try {
    const {
      account_id,
      amount,
      currency = 'USD',
      payment_method,
      transaction_id,
      description,
      billing_period_start,
      billing_period_end
    } = req.body;

    if (!account_id || !amount || !payment_method) {
      return res.status(400).json({ 
        error: 'Account ID, amount, and payment method are required' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    if (!['credit_card', 'bank_transfer', 'cash', 'check'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Verify account exists
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', account_id)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const paymentData = {
      account_id,
      amount: parseFloat(amount),
      currency,
      payment_method,
      payment_status: 'completed', // Default to completed for manual registration
      transaction_id,
      description,
      billing_period_start,
      billing_period_end,
      processed_by: req.admin.id,
      processed_at: nowUTC()
    };

    const { data: payment, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select(`
        *,
        accounts!account_id(name, slug)
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Log activity
    await logAdminActivity(req.admin.id, 'REGISTER_PAYMENT', 'payment', payment.id, {
      account_name: account.name,
      amount: payment.amount,
      currency: payment.currency,
      payment_method: payment.payment_method
    }, req);

    res.status(201).json(payment);
  } catch (error) {
    console.error('Register payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update payment status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    if (!['pending', 'completed', 'failed', 'refunded'].includes(payment_status)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    const updateData = {
      payment_status,
      updated_at: nowUTC()
    };

    // If marking as completed, set processed info
    if (payment_status === 'completed') {
      updateData.processed_by = req.admin.id;
      updateData.processed_at = nowUTC();
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        accounts!account_id(name, slug)
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Log activity
    await logAdminActivity(req.admin.id, 'UPDATE_PAYMENT_STATUS', 'payment', id, {
      account_name: payment.accounts.name,
      old_status: payment.payment_status,
      new_status: payment_status,
      amount: payment.amount
    }, req);

    res.json(payment);
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update payment details
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      currency,
      payment_method,
      transaction_id,
      description,
      billing_period_start,
      billing_period_end
    } = req.body;

    const updateData = {
      updated_at: nowUTC()
    };

    if (amount !== undefined) {
      if (amount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than 0' });
      }
      updateData.amount = parseFloat(amount);
    }
    if (currency) updateData.currency = currency;
    if (payment_method) {
      if (!['credit_card', 'bank_transfer', 'cash', 'check'].includes(payment_method)) {
        return res.status(400).json({ error: 'Invalid payment method' });
      }
      updateData.payment_method = payment_method;
    }
    if (transaction_id !== undefined) updateData.transaction_id = transaction_id;
    if (description !== undefined) updateData.description = description;
    if (billing_period_start) updateData.billing_period_start = billing_period_start;
    if (billing_period_end) updateData.billing_period_end = billing_period_end;

    const { data: payment, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        accounts!account_id(name, slug)
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Log activity
    await logAdminActivity(req.admin.id, 'UPDATE_PAYMENT', 'payment', id, {
      account_name: payment.accounts.name,
      changes: updateData
    }, req);

    res.json(payment);
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payment statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { account_id, start_date, end_date } = req.query;

    // Build query for status counts
    let statusQuery = supabase.from('payments').select('payment_status');
    
    if (account_id) statusQuery = statusQuery.eq('account_id', account_id);
    if (start_date) statusQuery = statusQuery.gte('created_at', start_date);
    if (end_date) statusQuery = statusQuery.lte('created_at', end_date);

    // Build query for amounts
    let amountsQuery = supabase.from('payments').select('amount, payment_status');
    if (account_id) amountsQuery = amountsQuery.eq('account_id', account_id);
    if (start_date) amountsQuery = amountsQuery.gte('created_at', start_date);
    if (end_date) amountsQuery = amountsQuery.lte('created_at', end_date);

    // Execute queries
    const { data: statusCounts, error: statusError } = await statusQuery;

    if (statusError) {
      return res.status(500).json({ error: statusError.message });
    }

    const { data: amounts, error: amountsError } = await amountsQuery;

    if (amountsError) {
      return res.status(500).json({ error: amountsError.message });
    }

    // Calculate statistics
    const stats = {
      total_payments: statusCounts.length,
      total_amount: amounts.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      by_status: {
        pending: { count: 0, amount: 0 },
        completed: { count: 0, amount: 0 },
        failed: { count: 0, amount: 0 },
        refunded: { count: 0, amount: 0 }
      }
    };

    amounts.forEach(payment => {
      const status = payment.payment_status;
      stats.by_status[status].count++;
      stats.by_status[status].amount += parseFloat(payment.amount);
    });

    res.json(stats);
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
