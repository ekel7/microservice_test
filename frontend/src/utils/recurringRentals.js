import { DateTime } from 'luxon'

/**
 * Expand recurring rentals into individual instances for a given date range
 * @param {Array} rentals - Array of rental objects (mix of recurring and non-recurring)
 * @param {DateTime} startDate - Start date of the range (Luxon DateTime)
 * @param {DateTime} endDate - End date of the range (Luxon DateTime)
 * @param {Array} exceptions - Array of rental exception objects (optional)
 * @returns {Array} - Expanded array of rental instances
 */
export function expandRecurringEvents(rentals, startDate, endDate, exceptions = []) {
  const expandedRentals = []

  // Create a map of exceptions by rental_id and exception_date for quick lookup
  const exceptionsMap = new Map()
  exceptions.forEach(exception => {
    const key = `${exception.rental_id}_${exception.exception_date}`
    exceptionsMap.set(key, exception)
  })

  console.log('expandRecurringEvents called with:', {
    rentalsCount: rentals.length,
    exceptionsCount: exceptions.length,
    startDate: startDate.toISODate(),
    endDate: endDate.toISODate(),
    rentals: rentals.map(r => ({ id: r.id, is_recurring: r.is_recurring, start_datetime: r.start_datetime }))
  })

  rentals.forEach(rental => {
    if (rental.is_recurring) {
      console.log('Processing recurring rental:', { id: rental.id, start_datetime: rental.start_datetime })

      // Get the day of week from the original rental
      // Extract date directly from UTC string to avoid timezone conversion issues
      const originalDateUTC = DateTime.fromISO(rental.start_datetime, { zone: 'utc' })
      const originalDate = originalDateUTC.toLocal().startOf('day')
      // Luxon weekday: 1=Monday, 7=Sunday; we need to match JS Date's 0=Sunday, 6=Saturday
      const dayOfWeek = originalDate.weekday === 7 ? 0 : originalDate.weekday

      console.log('Recurring rental details:', {
        id: rental.id,
        originalDate: originalDate.toISODate(),
        dayOfWeek: dayOfWeek
      })

      // Get time components from original rental in LOCAL time
      const originalStartUTC = DateTime.fromISO(rental.start_datetime, { zone: 'utc' })
      const originalEndUTC = DateTime.fromISO(rental.end_datetime, { zone: 'utc' })
      const originalStartLocal = originalStartUTC.toLocal()
      const originalEndLocal = originalEndUTC.toLocal()

      // Extract LOCAL time components (not UTC) to preserve user's intended time
      const startTimeHours = originalStartLocal.hour
      const startTimeMinutes = originalStartLocal.minute
      const startTimeSeconds = originalStartLocal.second
      const endTimeHours = originalEndLocal.hour
      const endTimeMinutes = originalEndLocal.minute
      const endTimeSeconds = originalEndLocal.second

      // Get the original date without time for comparison
      const originalDateOnly = originalDate.startOf('day')

      // Find all dates in the range that match this day of week AND are on or after the original date
      let current = startDate > originalDateOnly ? startDate : originalDateOnly
      console.log('Starting expansion from:', current.toISODate())

      let instanceCount = 0
      while (current <= endDate) {
        // Convert Luxon weekday to JS Date format for comparison
        const currentDayOfWeek = current.weekday === 7 ? 0 : current.weekday
        if (currentDayOfWeek === dayOfWeek && current >= originalDateOnly) {
          // Check if there's an exception for this date
          const exceptionKey = `${rental.id}_${current.toISODate()}`
          const exception = exceptionsMap.get(exceptionKey)

          // Skip cancelled instances
          if (exception && exception.exception_type === 'cancelled') {
            console.log(`Skipping cancelled instance for date:`, current.toISODate())
            current = current.plus({ days: 1 })
            continue
          }

          // Create new UTC datetime for this recurring instance
          let newStartUTC, newEndUTC, courtId, totalAmount, status

          if (exception && exception.exception_type === 'modified') {
            // Use modified values from exception
            console.log(`Applying modified exception for date:`, current.toISODate(), exception)
            newStartUTC = exception.new_start_datetime
              ? DateTime.fromISO(exception.new_start_datetime, { zone: 'utc' })
              : null
            newEndUTC = exception.new_end_datetime
              ? DateTime.fromISO(exception.new_end_datetime, { zone: 'utc' })
              : null
            courtId = exception.new_court_id || rental.court_id
            totalAmount = exception.new_total_amount !== undefined ? exception.new_total_amount : rental.total_amount
            status = exception.new_status || rental.status
          } else {
            // Use series default values
            // Create new LOCAL datetime for this recurring instance
            const newStartLocal = DateTime.local(
              current.year,
              current.month,
              current.day,
              startTimeHours,
              startTimeMinutes,
              startTimeSeconds
            )

            // Calculate the date difference between original start and end
            const originalStartDate = originalStartLocal.startOf('day')
            const originalEndDate = originalEndLocal.startOf('day')
            const daysDifference = Math.round(originalEndDate.diff(originalStartDate, 'days').days)

            // Apply the same date difference to the new end date
            const newEndDate = current.plus({ days: daysDifference })

            const newEndLocal = DateTime.local(
              newEndDate.year,
              newEndDate.month,
              newEndDate.day,
              endTimeHours,
              endTimeMinutes,
              endTimeSeconds
            )

            // Convert local datetimes to UTC for storage
            newStartUTC = newStartLocal.toUTC()
            newEndUTC = newEndLocal.toUTC()

            courtId = rental.court_id
            totalAmount = rental.total_amount
            status = rental.status
          }

          expandedRentals.push({
            ...rental,
            start_datetime: newStartUTC ? newStartUTC.toISO() : rental.start_datetime,
            end_datetime: newEndUTC ? newEndUTC.toISO() : rental.end_datetime,
            court_id: courtId,
            total_amount: totalAmount,
            status: status,
            // Add flags to identify this as an expanded recurring event
            _isRecurringInstance: true,
            _hasException: !!exception,
            _exceptionType: exception?.exception_type,
            _instanceDate: current.toISODate() // Store the date for this instance
          })

          instanceCount++
          console.log(`Created recurring instance ${instanceCount} for date:`, newStartUTC.toISO(), newEndUTC.toISO())
        }
        current = current.plus({ days: 1 })
      }

      console.log(`Total instances created for rental ${rental.id}:`, instanceCount)
    } else {
      // Non-recurring event, add as-is
      expandedRentals.push(rental)
    }
  })

  console.log('expandRecurringEvents result:', {
    totalExpanded: expandedRentals.length,
    recurring: expandedRentals.filter(r => r.is_recurring).length,
    nonRecurring: expandedRentals.filter(r => !r.is_recurring).length
  })

  return expandedRentals
}
