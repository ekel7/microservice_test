const express = require('express');
const supabase = require('../config/supabase');
const { authenticateAdmin } = require('../middleware/adminAuth');

const router = express.Router();

// Get admin logs with pagination and filtering
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      target_type,
      admin_id,
      start_date,
      end_date
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    let query = supabase
      .from('admin_logs')
      .select(`
        *,
        super_admins!inner(username, full_name)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (action) {
      query = query.eq('action', action);
    }

    if (target_type) {
      query = query.eq('target_type', target_type);
    }

    if (admin_id) {
      query = query.eq('super_admin_id', admin_id);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    // Apply pagination
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('Error fetching admin logs:', error);
      return res.status(500).json({ error: 'Failed to fetch admin logs' });
    }

    // Get total count for pagination (separate query)
    let countQuery = supabase
      .from('admin_logs')
      .select('*', { count: 'exact', head: true });

    // Apply same filters for count
    if (action) countQuery = countQuery.eq('action', action);
    if (target_type) countQuery = countQuery.eq('target_type', target_type);
    if (admin_id) countQuery = countQuery.eq('super_admin_id', admin_id);
    if (start_date) countQuery = countQuery.gte('created_at', start_date);
    if (end_date) countQuery = countQuery.lte('created_at', end_date);

    const { count: totalCount } = await countQuery;

    res.json({
      logs,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: totalCount,
        total_pages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent activity for dashboard overview
router.get('/recent', authenticateAdmin, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const { data: logs, error } = await supabase
      .from('admin_logs')
      .select(`
        *,
        super_admins!inner(username, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('Error fetching recent admin logs:', error);
      return res.status(500).json({ error: 'Failed to fetch recent admin logs' });
    }

    res.json(logs);
  } catch (error) {
    console.error('Recent admin logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get admin logs summary/stats
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = supabase
      .from('admin_logs')
      .select('action');

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching admin logs stats:', error);
      return res.status(500).json({ error: 'Failed to fetch admin logs stats' });
    }

    // Calculate stats
    const actionCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});

    const totalActions = logs.length;
    const uniqueActions = Object.keys(actionCounts).length;

    res.json({
      total_actions: totalActions,
      unique_actions: uniqueActions,
      action_breakdown: actionCounts,
      period: {
        start_date,
        end_date
      }
    });
  } catch (error) {
    console.error('Admin logs stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get logs for a specific target
router.get('/target/:targetType/:targetId', authenticateAdmin, async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    const { limit = 20 } = req.query;

    const { data: logs, error } = await supabase
      .from('admin_logs')
      .select(`
        *,
        super_admins!inner(username, full_name)
      `)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('Error fetching target admin logs:', error);
      return res.status(500).json({ error: 'Failed to fetch target admin logs' });
    }

    res.json(logs);
  } catch (error) {
    console.error('Target admin logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
