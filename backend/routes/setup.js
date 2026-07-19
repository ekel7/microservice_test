const express = require('express');
const bcrypt = require('bcryptjs');
const supabase = require('../config/supabase');

const router = express.Router();

// Create a new account with admin user
// This endpoint should be secured or removed in production
router.post('/', async (req, res) => {
  try {
    const { 
      accountName, 
      accountSlug, 
      adminEmail, 
      adminPassword, 
      adminFullName 
    } = req.body;

    if (!accountName || !accountSlug || !adminEmail || !adminPassword || !adminFullName) {
      return res.status(400).json({ 
        error: 'Account name, slug, admin email, password, and full name are required' 
      });
    }

    // Check if account slug already exists
    const { data: existingAccount, error: checkError } = await supabase
      .from('accounts')
      .select('id')
      .eq('slug', accountSlug)
      .single();

    if (existingAccount) {
      return res.status(400).json({ error: 'Account slug already exists' });
    }

    // Create the account
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .insert([{
        name: accountName,
        slug: accountSlug,
        status: 'active',
        subscription_plan: 'trial'
      }])
      .select()
      .single();

    if (accountError) {
      return res.status(500).json({ error: accountError.message });
    }

    // Hash the admin password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create the admin user
    const { data: adminUser, error: userError } = await supabase
      .from('users')
      .insert([{
        account_id: account.id,
        email: adminEmail,
        password_hash: passwordHash,
        full_name: adminFullName,
        role: 'admin'
      }])
      .select('id, email, full_name, role')
      .single();

    if (userError) {
      // Rollback: delete the created account
      await supabase.from('accounts').delete().eq('id', account.id);
      return res.status(500).json({ error: userError.message });
    }

    res.status(201).json({
      message: 'Account and admin user created successfully',
      account: {
        id: account.id,
        name: account.name,
        slug: account.slug,
        status: account.status
      },
      adminUser: adminUser
    });

  } catch (error) {
    console.error('Account setup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
