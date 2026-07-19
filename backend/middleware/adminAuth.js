const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const authenticateAdmin = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Admin access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Verify super admin exists in database
    const { data: admin, error } = await supabase
      .from('super_admins')
      .select('id, username, email, full_name, is_active, last_login')
      .eq('id', decoded.adminId)
      .single();

    if (error || !admin || !admin.is_active) {
      return res.status(403).json({ error: 'Invalid or inactive admin' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid admin token' });
  }
};

const logAdminActivity = async (adminId, action, targetType = null, targetId = null, details = {}, req = null) => {
  try {
    const logData = {
      super_admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      ip_address: req ? (req.ip || req.connection.remoteAddress) : null,
      user_agent: req ? req.get('User-Agent') : null
    };

    await supabase
      .from('admin_logs')
      .insert([logData]);
  } catch (error) {
    console.error('Failed to log admin activity:', error);
  }
};

module.exports = {
  authenticateAdmin,
  logAdminActivity
};
