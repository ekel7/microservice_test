const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { isAccountLocked, getGracePeriodWarning } = require('../utils/gracePeriodUtils');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user exists in database with account info
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id, email, full_name, role, is_active, account_id,
        accounts!account_id(
          name, slug, status, subscription_plan, created_at, 
          last_payment_date, is_locked, grace_period_end_date
        )
      `)
      .eq('id', decoded.userId)
      .single();

    if (error || !user || !user.is_active) {
      return res.status(403).json({ error: 'Invalid or inactive user' });
    }

    if (user.accounts.status === 'suspended') {
      return res.status(403).json({ error: 'Account is suspended' });
    }

    // Check if account is locked due to payment issues
    if (user.accounts.is_locked || isAccountLocked(user.accounts)) {
      return res.status(403).json({ 
        error: 'Account is locked due to overdue payment. Please contact support.',
        type: 'account_locked'
      });
    }

    // Add account info to the user object
    req.user = {
      ...user,
      account: user.accounts
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
