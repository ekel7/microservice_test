const express = require('express');
const supabase = require('../config/supabase');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { addTimeToDateAsISOString, calculateHours, doPeriodsOverlap } = require('../utils/dateUtils');
const { TIMEZONES } = require('../config/timezones');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================
// CALENDAR VIEW
// ============================================

// Get calendar view data
router.get('/calendar/view', async (req, res) => {
  try {
    console.log('GET /agenda/calendar/view - Query params:', req.query);
    console.log('User account_id:', req.user?.account_id);

    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    // Get regular rentals within the date range
    const { data: regularRentals, error: regularError } = await supabase
      .from('rentals')
      .select(`
        id,
        client_id,
        court_id,
        start_datetime,
        end_datetime,
        status,
        total_amount,
        notes,
        is_recurring,
        client:clients(id, full_name, phone),
        court:courts(id, name, hourly_rate)
      `)
      .eq('account_id', req.user.account_id)
      .eq('is_recurring', false)
      .gte('start_datetime', addTimeToDateAsISOString(start_date, '00:00:00', req.user.account_timezone || TIMEZONES.DEFAULT))
      .lte('end_datetime', addTimeToDateAsISOString(end_date, '23:59:59', req.user.account_timezone || TIMEZONES.DEFAULT))
      .order('start_datetime', { ascending: true });

    if (regularError) {
      return res.status(500).json({ error: regularError.message });
    }

    // Get all recurring rentals that were created before or during the requested period
    const { data: recurringRentals, error: recurringError } = await supabase
      .from('rentals')
      .select(`
        id,
        client_id,
        court_id,
        start_datetime,
        end_datetime,
        status,
        total_amount,
        notes,
        is_recurring,
        client:clients(id, full_name, phone),
        court:courts(id, name, hourly_rate)
      `)
      .eq('account_id', req.user.account_id)
      .eq('is_recurring', true)
      .lte('start_datetime', addTimeToDateAsISOString(end_date, '23:59:59', req.user.account_timezone || TIMEZONES.DEFAULT))
      .order('start_datetime', { ascending: true });

    if (recurringError) {
      return res.status(500).json({ error: recurringError.message });
    }

    // Get all exceptions for recurring rentals
    let exceptions = [];
    if (recurringRentals && recurringRentals.length > 0) {
      const rentalIds = recurringRentals.map(r => r.id);
      const { data: exceptionsData, error: exceptionsError } = await supabase
        .from('rental_exceptions')
        .select('*')
        .in('rental_id', rentalIds)
        .order('exception_date', { ascending: true });

      if (!exceptionsError && exceptionsData) {
        exceptions = exceptionsData;
      }
    }

    // Combine regular and recurring rentals
    const data = [...regularRentals, ...recurringRentals];

    console.log(`Calendar view query returned ${data.length} rentals and ${exceptions.length} exceptions`);
    res.json({
      rentals: data,
      exceptions
    });
  } catch (error) {
    console.error('Get calendar view error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// RENTALS CRUD (agenda-related)
// ============================================

// Create new rental
router.post('/rentals', async (req, res) => {
  try {
    console.log('POST /agenda/rentals - Creating new rental:', req.body);
    console.log('User account_id:', req.user?.account_id);

    // Get account timezone from JWT token
    const accountTimezone = req.user.account_timezone || TIMEZONES.DEFAULT;
    console.log('Using account timezone from JWT:', accountTimezone);

    const { client_id, court_id, start_datetime, end_datetime, notes, status, is_recurring } = req.body;

    if (!client_id || !court_id || !start_datetime || !end_datetime) {
      return res.status(400).json({ error: 'Client, court, start and end datetime are required' });
    }

    if (start_datetime >= end_datetime) {
      return res.status(400).json({ error: 'Start datetime must be before end datetime' });
    }

    // Check if client exists and belongs to the same account
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .eq('account_id', req.user.account_id)
      .single();

    if (clientError || !client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Check if court exists and get hourly rate
    const { data: court, error: courtError } = await supabase
      .from('courts')
      .select('hourly_rate, status')
      .eq('id', court_id)
      .eq('account_id', req.user.account_id)
      .single();

    if (courtError || !court) {
      return res.status(404).json({ error: 'Court not found' });
    }

    if (court.status !== 'available') {
      return res.status(400).json({ error: 'Court is not available' });
    }

    // Calculate total amount using the validated dates
    const hours = calculateHours(start_datetime, end_datetime);
    const total_amount = hours * court.hourly_rate;

    // Check for overlapping rentals
    // Two time periods overlap if: start1 < end2 AND start2 < end1
    const { data: overlapping, error: overlapError } = await supabase
      .from('rentals')
      .select('id, start_datetime, end_datetime')
      .eq('court_id', court_id)
      .eq('account_id', req.user.account_id)
      .neq('status', 'cancelled');

    if (overlapError) {
      return res.status(500).json({ error: 'Error checking availability' });
    }

    // Check for overlaps using UTC date utility
    const hasOverlap = overlapping.some(rental => {
      return doPeriodsOverlap(
        start_datetime,
        end_datetime,
        rental.start_datetime,
        rental.end_datetime
      );
    });

    if (hasOverlap) {
      return res.status(400).json({ error: 'Court is already booked for this time slot' });
    }

    const { data, error } = await supabase
      .from('rentals')
      .insert([{
        account_id: req.user.account_id,
        client_id,
        court_id,
        user_id: req.user.id,
        start_datetime,
        end_datetime,
        total_amount,
        notes,
        status,
        is_recurring
      }])
      .select(`
        id,
        account_id,
        client_id,
        court_id,
        user_id,
        start_datetime,
        end_datetime,
        total_amount,
        status,
        notes,
        is_recurring,
        created_at,
        updated_at,
        client:clients(full_name, email, phone),
        court:courts(name, hourly_rate),
        user:users(full_name, email)
      `)
      .single();

    if (error) {
      console.log('Database error creating rental:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('Rental created successfully:', data);

    // Broadcast rental creation to WebSocket clients in the same account
    if (req.app.locals.broadcastRentalUpdate) {
      req.app.locals.broadcastRentalUpdate(req.user.account_id, data, 'rental_created');
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create rental error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update rental status
router.put('/rentals/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, update_scope, exception_date } = req.body;

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get current rental to check if it's recurring
    const { data: currentRental, error: currentError } = await supabase
      .from('rentals')
      .select('*')
      .eq('id', id)
      .eq('account_id', req.user.account_id)
      .single();

    if (currentError || !currentRental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Handle status change for single instance of recurring event
    if (update_scope === 'single' && currentRental.is_recurring) {
      if (!exception_date) {
        return res.status(400).json({
          error: 'exception_date is required when update_scope is "single"'
        });
      }

      // For cancelled status, create a 'cancelled' exception type
      // For other statuses, create a 'modified' exception with new_status
      const exceptionData = status === 'cancelled'
        ? {
            rental_id: id,
            exception_date,
            exception_type: 'cancelled',
            notes: `Cancelled on ${new Date().toISOString()}`
          }
        : {
            rental_id: id,
            exception_date,
            exception_type: 'modified',
            new_status: status,
            notes: `Status changed to ${status} on ${new Date().toISOString()}`
          };

      const { data: exception, error: exceptionError } = await supabase
        .from('rental_exceptions')
        .upsert(exceptionData, {
          onConflict: 'rental_id,exception_date'
        })
        .select()
        .single();

      if (exceptionError) {
        return res.status(500).json({ error: exceptionError.message });
      }

      // Broadcast update
      if (req.app.locals.broadcastRentalUpdate) {
        req.app.locals.broadcastRentalUpdate(req.user.account_id, currentRental, 'rental_updated');
      }

      return res.json({
        ...currentRental,
        exception
      });
    }

    // Handle regular status update or series-wide cancel
    const updateData = { status };

    // If cancelling a recurring series, also set is_recurring to false
    if (status === 'cancelled' && currentRental.is_recurring && update_scope !== 'single') {
      updateData.is_recurring = false;
    }

    const { data, error } = await supabase
      .from('rentals')
      .update(updateData)
      .eq('id', id)
      .eq('account_id', req.user.account_id)
      .select(`
        id,
        account_id,
        client_id,
        court_id,
        user_id,
        start_datetime,
        end_datetime,
        total_amount,
        status,
        notes,
        is_recurring,
        created_at,
        updated_at,
        client:clients(full_name, email, phone),
        court:courts(name, hourly_rate),
        user:users(full_name, email)
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Broadcast rental status update to WebSocket clients in the same account
    if (req.app.locals.broadcastRentalUpdate) {
      req.app.locals.broadcastRentalUpdate(req.user.account_id, data, 'rental_updated');
    }

    res.json(data);
  } catch (error) {
    console.error('Update rental status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update rental
router.put('/rentals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      start_datetime,
      end_datetime,
      court_id,
      notes,
      status,
      is_recurring,
      update_scope,
      exception_date
    } = req.body;

    // Get account timezone from JWT token
    const accountTimezone = req.user.account_timezone || TIMEZONES.DEFAULT;
    console.log('Using account timezone from JWT:', accountTimezone);

    // Get current rental
    const { data: currentRental, error: currentError } = await supabase
      .from('rentals')
      .select('*')
      .eq('id', id)
      .eq('account_id', req.user.account_id)
      .single();

    if (currentError || !currentRental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    // Handle single instance update for recurring events
    if (update_scope === 'single' && currentRental.is_recurring) {
      if (!exception_date) {
        return res.status(400).json({
          error: 'exception_date is required when update_scope is "single"'
        });
      }

      // Calculate new values
      const newStart = start_datetime || currentRental.start_datetime;
      const newEnd = end_datetime || currentRental.end_datetime;
      const newCourtId = court_id || currentRental.court_id;

      if (newStart >= newEnd) {
        return res.status(400).json({ error: 'Start datetime must be before end datetime' });
      }

      // Get court hourly rate
      const { data: court, error: courtError } = await supabase
        .from('courts')
        .select('hourly_rate')
        .eq('id', newCourtId)
        .eq('account_id', req.user.account_id)
        .single();

      if (courtError || !court) {
        return res.status(404).json({ error: 'Court not found' });
      }

      const hours = calculateHours(newStart, newEnd);
      const new_total_amount = hours * court.hourly_rate;

      // Create exception via the exceptions endpoint logic
      const exceptionData = {
        rental_id: id,
        exception_date,
        exception_type: 'modified',
        new_start_datetime: newStart,
        new_end_datetime: newEnd,
        new_court_id: newCourtId,
        new_total_amount,
        notes: notes || null,
        new_status: status || currentRental.status
      };

      const { data: exception, error: exceptionError } = await supabase
        .from('rental_exceptions')
        .upsert(exceptionData, {
          onConflict: 'rental_id,exception_date'
        })
        .select()
        .single();

      if (exceptionError) {
        return res.status(500).json({ error: exceptionError.message });
      }

      // Broadcast update
      if (req.app.locals.broadcastRentalUpdate) {
        req.app.locals.broadcastRentalUpdate(req.user.account_id, currentRental, 'rental_updated');
      }

      return res.json({
        ...currentRental,
        exception
      });
    }

    // Handle regular update or series-wide update
    let updateData = { notes, status, is_recurring };

    // If datetime or court is being changed, validate and recalculate
    if (start_datetime || end_datetime || court_id) {
      const newStart = start_datetime || currentRental.start_datetime;
      const newEnd = end_datetime || currentRental.end_datetime;
      const newCourtId = court_id || currentRental.court_id;

      if (newStart >= newEnd) {
        return res.status(400).json({ error: 'Start datetime must be before end datetime' });
      }

      // Check for overlapping rentals (excluding current rental)
      const { data: overlapping, error: overlapError } = await supabase
        .from('rentals')
        .select('id, start_datetime, end_datetime')
        .eq('court_id', newCourtId)
        .eq('account_id', req.user.account_id)
        .neq('id', id)
        .neq('status', 'cancelled');

      if (overlapError) {
        return res.status(500).json({ error: 'Error checking availability' });
      }

      // Check for overlaps using UTC date utility
      const hasOverlap = overlapping.some(rental => {
        return doPeriodsOverlap(
          newStart,
          newEnd,
          rental.start_datetime,
          rental.end_datetime
        );
      });

      if (hasOverlap) {
        return res.status(400).json({ error: 'Court is already booked for this time slot' });
      }

      // Get court hourly rate and recalculate total
      const { data: court, error: courtError } = await supabase
        .from('courts')
        .select('hourly_rate')
        .eq('id', newCourtId)
        .eq('account_id', req.user.account_id)
        .single();

      if (courtError || !court) {
        return res.status(404).json({ error: 'Court not found' });
      }

      const hours = calculateHours(newStart, newEnd);
      const total_amount = hours * court.hourly_rate;

      updateData = {
        ...updateData,
        start_datetime: newStart,
        end_datetime: newEnd,
        court_id: newCourtId,
        total_amount
      };
    }

    const { data, error } = await supabase
      .from('rentals')
      .update(updateData)
      .eq('id', id)
      .eq('account_id', req.user.account_id)
      .select(`
        id,
        account_id,
        client_id,
        court_id,
        user_id,
        start_datetime,
        end_datetime,
        total_amount,
        status,
        notes,
        is_recurring,
        created_at,
        updated_at,
        client:clients(full_name, email, phone),
        court:courts(name, hourly_rate),
        user:users(full_name, email)
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Broadcast rental update to WebSocket clients in the same account
    if (req.app.locals.broadcastRentalUpdate) {
      req.app.locals.broadcastRentalUpdate(req.user.account_id, data, 'rental_updated');
    }

    res.json(data);
  } catch (error) {
    console.error('Update rental error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// RENTAL EXCEPTIONS ENDPOINTS (for recurring events)
// ============================================

// Get all exceptions for a rental
router.get('/rentals/:id/exceptions', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify rental exists and belongs to user's account
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select('id, account_id, is_recurring')
      .eq('id', id)
      .eq('account_id', req.user.account_id)
      .single();

    if (rentalError || !rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    if (!rental.is_recurring) {
      return res.status(400).json({ error: 'This rental is not a recurring series' });
    }

    // Get all exceptions for this rental
    const { data: exceptions, error } = await supabase
      .from('rental_exceptions')
      .select('*')
      .eq('rental_id', id)
      .order('exception_date', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(exceptions);
  } catch (error) {
    console.error('Get rental exceptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create exception for a recurring rental instance
router.post('/rentals/:id/exceptions', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      exception_date,
      exception_type,
      new_start_datetime,
      new_end_datetime,
      new_court_id,
      new_total_amount,
      new_status,
      notes
    } = req.body;

    // Validate required fields
    if (!exception_date || !exception_type) {
      return res.status(400).json({
        error: 'exception_date and exception_type are required'
      });
    }

    if (!['cancelled', 'modified'].includes(exception_type)) {
      return res.status(400).json({
        error: 'exception_type must be either "cancelled" or "modified"'
      });
    }

    // Verify rental exists and belongs to user's account
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select('id, account_id, is_recurring, court_id, start_datetime, end_datetime, total_amount')
      .eq('id', id)
      .eq('account_id', req.user.account_id)
      .single();

    if (rentalError || !rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    if (!rental.is_recurring) {
      return res.status(400).json({ error: 'This rental is not a recurring series' });
    }

    // For modified exceptions, validate required fields
    if (exception_type === 'modified') {
      const hasStatusChange = new_status !== undefined;
      const hasDataChange = new_start_datetime || new_end_datetime || new_court_id || new_total_amount !== undefined;

      // Must have either a status change OR a data change (or both)
      if (!hasStatusChange && !hasDataChange) {
        return res.status(400).json({
          error: 'Modified exceptions require either new_status or data changes (new_start_datetime, new_end_datetime, new_court_id, new_total_amount)'
        });
      }

      // If providing data changes, all data fields must be present together
      if (hasDataChange && (!new_start_datetime || !new_end_datetime || !new_court_id || new_total_amount === undefined)) {
        return res.status(400).json({
          error: 'When modifying rental data, all fields are required: new_start_datetime, new_end_datetime, new_court_id, and new_total_amount'
        });
      }

      // Validate new_status if provided
      if (hasStatusChange && !['pending', 'confirmed', 'cancelled', 'completed'].includes(new_status)) {
        return res.status(400).json({
          error: 'new_status must be one of: pending, confirmed, cancelled, completed'
        });
      }

      // Check for overlapping rentals when modifying time/court
      if (hasDataChange) {
        const { data: overlappingRentals, error: overlapError } = await supabase
          .from('rentals')
          .select('id')
          .eq('account_id', req.user.account_id)
          .eq('court_id', new_court_id)
          .neq('status', 'cancelled')
          .neq('id', id)
          .or(`and(start_datetime.lt.${new_end_datetime},end_datetime.gt.${new_start_datetime})`);

        if (overlapError) {
          console.error('Overlap check error:', overlapError);
        } else if (overlappingRentals && overlappingRentals.length > 0) {
          return res.status(400).json({
            error: 'The modified time conflicts with another rental on this court'
          });
        }
      }
    }

    // Create or update the exception
    const exceptionData = {
      rental_id: id,
      exception_date,
      exception_type,
      notes,
      ...(exception_type === 'modified' && {
        ...(new_start_datetime && { new_start_datetime }),
        ...(new_end_datetime && { new_end_datetime }),
        ...(new_court_id && { new_court_id }),
        ...(new_total_amount !== undefined && { new_total_amount }),
        ...(new_status && { new_status })
      })
    };

    const { data: exception, error } = await supabase
      .from('rental_exceptions')
      .upsert(exceptionData, {
        onConflict: 'rental_id,exception_date',
        returning: 'representation'
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(exception);
  } catch (error) {
    console.error('Create rental exception error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete exception (restore to series default)
router.delete('/rentals/:id/exceptions/:date', async (req, res) => {
  try {
    const { id, date } = req.params;

    // Verify rental exists and belongs to user's account
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select('id, account_id, is_recurring')
      .eq('id', id)
      .eq('account_id', req.user.account_id)
      .single();

    if (rentalError || !rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    if (!rental.is_recurring) {
      return res.status(400).json({ error: 'This rental is not a recurring series' });
    }

    // Delete the exception
    const { error } = await supabase
      .from('rental_exceptions')
      .delete()
      .eq('rental_id', id)
      .eq('exception_date', date);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete rental exception error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
