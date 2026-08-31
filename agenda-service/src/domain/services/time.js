/**
 * UTC date/time utilities for domain operations.
 *
 * All dates are handled in UTC on the backend and converted to local time
 * on the frontend. Uses Luxon for robust date/time handling with timezone
 * support. Pure functions only — no infrastructure dependencies.
 */

const { DateTime } = require('luxon');
const { TIMEZONES } = require('../timezones');

/**
 * Validate a date and return DateTime object or throw error
 * @param {string|Date|DateTime} dateInput - Date string, Date object, or DateTime object
 * @param {string} errorContext - Context for error message
 * @returns {DateTime} - Valid DateTime object in UTC
 */
function validateDate(dateInput, errorContext = 'date') {
  let dt;

  if (DateTime.isDateTime(dateInput)) {
    dt = dateInput;
  } else if (dateInput instanceof Date) {
    dt = DateTime.fromJSDate(dateInput, { zone: 'utc' });
  } else if (typeof dateInput === 'string') {
    dt = DateTime.fromISO(dateInput, { zone: 'utc' });
  } else {
    throw new Error(`Invalid ${errorContext}: ${dateInput}`);
  }

  if (!dt.isValid) {
    throw new Error(`Invalid ${errorContext}: ${dateInput} - ${dt.invalidReason}`);
  }

  return dt.toUTC();
}

/**
 * Add days to a date
 * @param {Date|DateTime|string} date - Base date
 * @param {number} days - Number of days to add
 * @returns {DateTime} - New DateTime with days added in UTC
 */
function addDays(date, days) {
  const dt = validateDate(date, 'base date');
  return dt.plus({ days });
}

/**
 * Add hours to a date
 * @param {Date|DateTime|string} date - Base date
 * @param {number} hours - Number of hours to add
 * @returns {DateTime} - New DateTime with hours added in UTC
 */
function addHours(date, hours) {
  const dt = validateDate(date, 'base date');
  return dt.plus({ hours });
}

/**
 * Convert a date string to UTC ISO string
 * @param {string|Date|DateTime} dateString - Date string, Date object, or DateTime (can be in various formats)
 * @returns {string} - UTC ISO string
 */
function toUTC(dateString) {
  if (!dateString) return null;
  const dt = validateDate(dateString, 'date string');
  return dt.toISO();
}

/**
 * Get current UTC ISO string in consistent format
 * @returns {string} - Current UTC ISO string
 */
function nowUTC() {
  return DateTime.utc().toISO();
}

/**
 * Standardize ISO string format to consistent format
 * @param {string} isoString - ISO date string
 * @returns {string} - Standardized ISO string
 */
function standardizeISOString(isoString) {
  if (!isoString) return null;

  // Parse and re-format to ensure consistent format
  const dt = DateTime.fromISO(isoString, { zone: 'utc' });
  if (!dt.isValid) {
    throw new Error(`Invalid ISO string: ${isoString}`);
  }
  return dt.toISO();
}

/**
 * Convert local date/time to UTC using account timezone
 * @param {string} localDate - Date in YYYY-MM-DD format
 * @param {string} localTime - Time in HH:MM format
 * @param {string} accountTimezone - IANA timezone identifier
 * @returns {string} - UTC ISO string
 */
function localDateTimeToISOStringWithTimezone(localDate, localTime, accountTimezone = TIMEZONES.DEFAULT) {
  if (!localDate || !localTime) return null;

  try {
    // Parse date components to create a DateTime in the account's timezone
    const [year, month, day] = localDate.split('-').map(Number);
    const [hours, minutes] = localTime.split(':').map(Number);

    // Create DateTime in the account's timezone
    // This properly handles DST and timezone conversions
    const dt = DateTime.fromObject(
      { year, month, day, hour: hours, minute: minutes, second: 0, millisecond: 0 },
      { zone: accountTimezone }
    );

    if (!dt.isValid) {
      throw new Error(`Invalid date/time: ${localDate} ${localTime} in timezone ${accountTimezone}`);
    }

    // Convert to UTC and return ISO string
    return dt.toUTC().toISO();
  } catch (error) {
    console.error('Error in localDateTimeToISOStringWithTimezone:', error);
    // Fallback: try to parse as UTC if timezone parsing fails
    const fallbackDt = DateTime.fromISO(`${localDate}T${localTime}:00`, { zone: 'utc' });
    if (!fallbackDt.isValid) {
      throw new Error(`Failed to parse date/time: ${localDate} ${localTime}`);
    }
    return fallbackDt.toISO();
  }
}

/**
 * Add time constraints to a date string (for filtering) and convert to UTC
 * @param {string} dateString - Date string (YYYY-MM-DD format)
 * @param {string} time - Time to add ('00:00:00' or '23:59:59')
 * @param {string} accountTimezone - IANA timezone identifier (optional)
 * @returns {string} - UTC ISO string
 */
function addTimeToDateAsISOString(dateString, time, accountTimezone = TIMEZONES.DEFAULT) {
  if (!dateString) return null;

  // If dateString already has time, convert to UTC
  if (dateString.includes('T') || dateString.includes(' ')) {
    return validateDate(dateString).toISO();
  }

  // Extract HH:MM from HH:MM:SS format for localDateTimeToISOStringWithTimezone
  const timePart = time.replace('.000Z', '').substring(0, 5); // Take only HH:MM

  // Use our timezone conversion function to properly convert local date/time to UTC
  return localDateTimeToISOStringWithTimezone(dateString, timePart, accountTimezone);
}

/**
 * Parse and validate a datetime string to UTC
 * @param {string} datetimeString - Datetime string
 * @returns {DateTime} - DateTime object in UTC
 */
function parseToUTC(datetimeString) {
  if (!datetimeString) return null;
  return validateDate(datetimeString, 'datetime string');
}

/**
 * Calculate duration in hours between two UTC dates
 * @param {string|Date|DateTime} startDateTime - Start datetime
 * @param {string|Date|DateTime} endDateTime - End datetime
 * @returns {number} - Duration in hours (rounded up)
 */
function calculateHours(startDateTime, endDateTime) {
  const start = validateDate(startDateTime, 'start datetime');
  const end = validateDate(endDateTime, 'end datetime');

  const diff = end.diff(start, 'hours');
  return Math.ceil(diff.hours); // Round up to nearest hour
}

/**
 * Check if two time periods overlap
 * @param {string|Date|DateTime} start1 - Start of first period
 * @param {string|Date|DateTime} end1 - End of first period
 * @param {string|Date|DateTime} start2 - Start of second period
 * @param {string|Date|DateTime} end2 - End of second period
 * @returns {boolean} - True if periods overlap
 */
function doPeriodsOverlap(start1, end1, start2, end2) {
  const s1 = validateDate(start1, 'start1');
  const e1 = validateDate(end1, 'end1');
  const s2 = validateDate(start2, 'start2');
  const e2 = validateDate(end2, 'end2');

  // Two periods overlap if: start1 < end2 AND start2 < end1
  // DateTime objects can be compared directly
  return s1 < e2 && s2 < e1;
}

module.exports = {
  toUTC,
  nowUTC,
  standardizeISOString,
  addTimeToDateAsISOString,
  parseToUTC,
  calculateHours,
  doPeriodsOverlap,
  localDateTimeToISOStringWithTimezone,
  validateDate,
  addDays,
  addHours
};
