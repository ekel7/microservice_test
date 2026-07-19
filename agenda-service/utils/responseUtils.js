const { standardizeISOString } = require('./dateUtils');

/**
 * Standardize date fields in API responses
 * @param {Object|Array} data - Data object or array of objects
 * @param {Array} dateFields - Array of field names that contain dates
 * @returns {Object|Array} - Data with standardized date formats
 */
function standardizeDatesInResponse(data, dateFields = []) {
  if (!data) return data;
  
  // Common date field names
  const commonDateFields = [
    'created_at', 'updated_at', 'processed_at', 'last_login', 'last_login_at',
    'grace_period_start_date', 'grace_period_end_date', 'payment_due_date', 
    'last_payment_date', 'billing_period_start', 'billing_period_end',
    'start_datetime', 'end_datetime'
  ];
  
  const allDateFields = [...new Set([...commonDateFields, ...dateFields])];
  
  function standardizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const standardized = { ...obj };
    
    for (const field of allDateFields) {
      if (standardized[field]) {
        try {
          standardized[field] = standardizeISOString(standardized[field]);
        } catch (error) {
          // If standardization fails, keep original value
          console.warn(`Failed to standardize date field '${field}':`, error.message);
        }
      }
    }
    
    // Handle nested objects
    for (const key in standardized) {
      if (standardized[key] && typeof standardized[key] === 'object') {
        if (Array.isArray(standardized[key])) {
          standardized[key] = standardized[key].map(item => standardizeObject(item));
        } else {
          standardized[key] = standardizeObject(standardized[key]);
        }
      }
    }
    
    return standardized;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => standardizeObject(item));
  }
  
  return standardizeObject(data);
}

/**
 * Middleware to standardize dates in all API responses
 */
function dateStandardizationMiddleware(req, res, next) {
  const originalJson = res.json;
  
  res.json = function(body) {
    if (body && typeof body === 'object') {
      // Standardize dates in the response body
      body = standardizeDatesInResponse(body);
    }
    
    return originalJson.call(this, body);
  };
  
  next();
}

module.exports = {
  standardizeDatesInResponse,
  dateStandardizationMiddleware
};