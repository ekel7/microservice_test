const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const { nowUTC } = require('../utils/dateUtils');

// GET /api/platform-settings - Get platform settings (tries authenticated, falls back to default)
router.get('/', async (req, res) => {
  try {
    let data = null;
    
    // Try to authenticate and get account-specific settings
    if (req.headers.authorization) {
      try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        const { data: settingsData, error } = await supabase
          .from('platform_settings')
          .select('*')
          .eq('account_id', decoded.account_id)
          .single();
        
        if (!error) data = settingsData;
      } catch (err) {
        // Ignore auth errors for public access
        console.log('No valid auth for platform settings, using defaults');
      }
    }
    
    // If no settings found, return defaults
    if (!data) {
      return res.json({
        platform_title: 'Alquiler de Canchas',
        platform_logo: '',
        start_time: '08:00:00',
        end_time: '22:00:00'
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected error fetching platform settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/platform-settings/admin - Get platform settings for current account (authenticated)
router.get('/admin', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .eq('account_id', req.user.account_id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching platform settings:', error);
      return res.status(500).json({ error: 'Failed to fetch platform settings' });
    }

    // If no settings found, return defaults
    if (!data) {
      return res.json({
        platform_title: 'Alquiler de Canchas',
        platform_logo: '',
        start_time: '08:00:00',
        end_time: '22:00:00'
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected error fetching platform settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/platform-settings - Update platform settings (Admin only)
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { platform_title, platform_logo, start_time, end_time } = req.body;
    
    console.log('UPDATE REQUEST:', {
      user_id: req.user.id,
      account_id: req.user.account_id,
      role: req.user.role,
      platform_title,
      platform_logo: platform_logo ? 'HAS_LOGO' : 'NO_LOGO',
      start_time,
      end_time,
      start_time_type: typeof start_time,
      end_time_type: typeof end_time
    });

    // Check if user is admin
    if (req.user.role !== 'admin') {
      console.log('PERMISSION DENIED: User is not admin');
      return res.status(403).json({ error: 'Only administrators can update platform settings' });
    }

    // Validate input
    if (platform_title !== undefined && typeof platform_title !== 'string') {
      return res.status(400).json({ error: 'Platform title must be a string' });
    }

    if (platform_logo !== undefined && typeof platform_logo !== 'string') {
      return res.status(400).json({ error: 'Platform logo must be a string' });
    }

    // Validate time fields
    if (start_time !== undefined && start_time !== null && start_time !== '') {
      if (typeof start_time !== 'string' || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(start_time)) {
        console.log('Start time validation failed:', { start_time, type: typeof start_time });
        return res.status(400).json({ error: 'Start time must be in HH:MM format' });
      }
    }

    if (end_time !== undefined && end_time !== null && end_time !== '') {
      if (typeof end_time !== 'string' || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(end_time)) {
        console.log('End time validation failed:', { end_time, type: typeof end_time });
        return res.status(400).json({ error: 'End time must be in HH:MM format' });
      }
    }

    // Validate time range (only if both times are provided)
    if (start_time && end_time) {
      const [startHour, startMinute] = start_time.split(':').map(Number);
      const [endHour, endMinute] = end_time.split(':').map(Number);
      
      const startTimeMinutes = startHour * 60 + startMinute;
      const endTimeMinutes = endHour * 60 + endMinute;
      
      if (endTimeMinutes <= startTimeMinutes) {
        return res.status(400).json({ error: 'End time must be after start time' });
      }
    }

    // Validate image size if logo is provided
    if (platform_logo && platform_logo.startsWith('data:image/')) {
      const base64Size = (platform_logo.length * 3) / 4;
      const maxSize = 1024 * 1024; // 1MB for base64
      
      if (base64Size > maxSize) {
        return res.status(400).json({ error: 'Logo file is too large. Maximum size is 1MB' });
      }
    }

    // Check if settings exist for current account
    console.log('CHECKING EXISTING SETTINGS for account_id:', req.user.account_id);
    const { data: existingSettings, error: checkError } = await supabase
      .from('platform_settings')
      .select('id')
      .eq('account_id', req.user.account_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing settings:', checkError);
    }
    
    console.log('EXISTING SETTINGS RESULT:', existingSettings);

    let result;

    if (existingSettings) {
      // Update existing settings
      const updateData = {};
      if (platform_title !== undefined) updateData.platform_title = platform_title;
      if (platform_logo !== undefined) updateData.platform_logo = platform_logo;
      if (start_time !== undefined && start_time !== null && start_time !== '') {
        updateData.start_time = start_time + ':00'; // Convert HH:MM to HH:MM:SS
      }
      if (end_time !== undefined && end_time !== null && end_time !== '') {
        updateData.end_time = end_time + ':00'; // Convert HH:MM to HH:MM:SS
      }
      updateData.updated_at = nowUTC();
      
      console.log('UPDATING SETTINGS with data:', updateData);

      const { data, error } = await supabase
        .from('platform_settings')
        .update(updateData)
        .eq('id', existingSettings.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating platform settings:', error);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        return res.status(500).json({ error: 'Failed to update platform settings: ' + error.message });
      }

      console.log('UPDATE SUCCESSFUL:', data);
      result = data;
    } else {
      // Create new settings for current account
      const insertData = {
        account_id: req.user.account_id,
        platform_title: platform_title || 'Alquiler de Canchas',
        platform_logo: platform_logo || '',
        start_time: (start_time && start_time !== '' ? start_time : '08:00') + ':00', // Convert HH:MM to HH:MM:SS
        end_time: (end_time && end_time !== '' ? end_time : '22:00') + ':00' // Convert HH:MM to HH:MM:SS
      };
      
      console.log('CREATING NEW SETTINGS with data:', insertData);

      const { data, error } = await supabase
        .from('platform_settings')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating platform settings:', error);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        return res.status(500).json({ error: 'Failed to create platform settings: ' + error.message });
      }

      console.log('CREATE SUCCESSFUL:', data);
      result = data;
    }

    res.json({
      success: true,
      settings: result
    });

  } catch (err) {
    console.error('Unexpected error updating platform settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;