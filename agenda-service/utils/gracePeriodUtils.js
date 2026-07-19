const { DateTime } = require('luxon');
const supabase = require('../config/supabase');
const { standardizeISOString, nowUTC, addDays, validateDate } = require('./dateUtils');

/**
 * Calculate grace period dates for an account
 * @param {string} subscriptionPlan - 'trial', 'basic', or 'premium'
 * @param {Date|string|DateTime} createdAt - Account creation date
 * @param {Date|string|DateTime} lastPaymentDate - Last payment date (optional)
 * @returns {Object} Grace period information with DateTime objects
 */
function calculateGracePeriodDates(subscriptionPlan, createdAt, lastPaymentDate = null) {
  const created = validateDate(createdAt, 'createdAt');
  const lastPayment = lastPaymentDate ? validateDate(lastPaymentDate, 'lastPaymentDate') : null;

  let graceStart, graceEnd, paymentDue;

  switch (subscriptionPlan) {
    case 'trial':
      // Trial: 5 days grace period after creation
      graceStart = created;
      graceEnd = addDays(created, 5);
      paymentDue = graceEnd;
      break;

    case 'basic':
    case 'premium':
      // Basic/Premium: 5 days grace period after payment period expires
      const paymentRef = lastPayment || created;
      paymentDue = addDays(paymentRef, 30);
      graceStart = paymentDue;
      graceEnd = addDays(paymentDue, 5);
      break;

    default:
      // Default case
      graceStart = created;
      graceEnd = addDays(created, 5);
      paymentDue = graceEnd;
  }

  return {
    graceStart,
    graceEnd,
    paymentDue
  };
}

/**
 * Determine account status based on dates
 * @param {Object} account - Account object with dates and subscription plan
 * @returns {Object} Status information
 */
function determineAccountStatus(account) {
  const now = DateTime.utc();
  const { graceStart, graceEnd } = calculateGracePeriodDates(
    account.subscription_plan,
    account.created_at,
    account.last_payment_date
  );

  let status, isLocked, daysUntilLockout;

  if (now > graceEnd) {
    // Grace period expired
    status = 'locked';
    isLocked = true;
    daysUntilLockout = 0;
  } else if (now > graceStart) {
    // In grace period
    status = 'grace_period';
    isLocked = false;
    daysUntilLockout = Math.ceil(graceEnd.diff(now, 'days').days);
  } else {
    // Account is current
    status = account.subscription_plan === 'trial' ? 'trial' : 'active';
    isLocked = false;
    daysUntilLockout = Math.ceil(graceEnd.diff(now, 'days').days);
  }

  return {
    status,
    isLocked,
    daysUntilLockout,
    graceStart: graceStart.toISO(),
    graceEnd: graceEnd.toISO()
  };
}

/**
 * Check if account is locked and prevent access
 * @param {Object} account - Account object
 * @returns {boolean} True if account is locked
 */
function isAccountLocked(account) {
  const statusInfo = determineAccountStatus(account);
  return statusInfo.isLocked;
}

/**
 * Update account payment and reset grace period
 * @param {string} accountId - Account UUID
 * @param {Date|string|DateTime} paymentDate - Payment date
 * @returns {Promise} Update result
 */
async function updateAccountPayment(accountId, paymentDate = null) {
  try {
    const dt = paymentDate ? validateDate(paymentDate, 'paymentDate') : DateTime.utc();

    const { data, error } = await supabase
      .rpc('update_account_payment_date', {
        account_id: accountId,
        payment_date: dt.toISO()
      });

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Update account payment error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get accounts that need grace period warnings
 * @returns {Promise<Array>} Accounts requiring warnings
 */
async function getAccountsRequiringWarning() {
  try {
    const { data, error } = await supabase
      .rpc('get_accounts_requiring_warning');

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Get accounts requiring warning error:', error);
    return [];
  }
}

/**
 * Get grace period warning message
 * @param {Object} account - Account object
 * @returns {Object} Warning message and details
 */
function getGracePeriodWarning(account) {
  const statusInfo = determineAccountStatus(account);
  
  if (statusInfo.status === 'locked') {
    return {
      type: 'locked',
      message: 'Your account has been locked due to overdue payment. Please contact support to restore access.',
      daysUntilLockout: 0,
      finalDate: null
    };
  }

  if (statusInfo.status === 'grace_period') {
    return {
      type: 'grace_period',
      message: `Your account is in grace period. You have ${statusInfo.daysUntilLockout} days until your account will be locked.`,
      daysUntilLockout: statusInfo.daysUntilLockout,
      finalDate: statusInfo.graceEnd // Return UTC string for frontend localization
    };
  }

  if (statusInfo.status === 'trial' && statusInfo.daysUntilLockout <= 7) {
    return {
      type: 'trial_warning',
      message: `Your trial period ends in ${statusInfo.daysUntilLockout} days. Please upgrade your account to continue access.`,
      daysUntilLockout: statusInfo.daysUntilLockout,
      finalDate: statusInfo.graceEnd // Return UTC string for frontend localization
    };
  }

  return null; // No warning needed
}

module.exports = {
  calculateGracePeriodDates,
  determineAccountStatus,
  isAccountLocked,
  updateAccountPayment,
  getAccountsRequiringWarning,
  getGracePeriodWarning
};