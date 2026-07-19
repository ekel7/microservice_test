import { DateTime, Settings } from 'luxon'
import { getCurrentLanguage } from '../i18n/utils'

/**
 * Get the user's browser timezone
 * @returns {string} - IANA timezone identifier (e.g., 'America/New_York')
 */
export function getBrowserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Initialize Luxon with current language
 */
function initLuxon() {
  const currentLang = getCurrentLanguage();
  Settings.defaultLocale = currentLang === 'es' ? 'es' : 'en';
}

/**
 * Get locale-specific date/time formats
 * @returns {Object} - Object with date and time format strings for current locale
 */
function getLocaleFormats() {
  const currentLang = getCurrentLanguage();
  
  if (currentLang === 'es') {
    return {
      date: 'dd/MM/yyyy',
      time: 'HH:mm',
      datetime: 'dd/MM/yyyy HH:mm',
      gracePeriod: 'ccc, dd LLL',
      withTimezone: 'dd/MM/yyyy HH:mm ZZZZ'
    };
  } else {
    return {
      date: 'MM/dd/yyyy',
      time: 'hh:mm a',
      datetime: 'MM/dd/yyyy hh:mm a',
      gracePeriod: 'ccc, LLL dd',
      withTimezone: 'MM/dd/yyyy hh:mm a ZZZZ'
    };
  }
}

/**
 * Get localized date formatting options based on current language
 * @returns {Object} - Intl.DateTimeFormat options
 */
export function getLocaleDateFormatOptions() {
  const currentLang = getCurrentLanguage();

  return {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: getBrowserTimezone(),
    locale: currentLang === 'es' ? 'es-ES' : 'en-US'
  };
}

/**
 * Get localized datetime formatting options based on current language
 * @returns {Object} - Intl.DateTimeFormat options
 */
export function getLocaleDateTimeFormatOptions() {
  const currentLang = getCurrentLanguage();

  return {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: getBrowserTimezone(),
    locale: currentLang === 'es' ? 'es-ES' : 'en-US',
    hour12: currentLang === 'en'  // 12-hour for English, 24-hour for Spanish
  };
}

/**
 * Parse a UTC date string and return a DateTime object in local timezone
 * @param {string} utcDateString - UTC date string from backend
 * @returns {DateTime|null} - DateTime object in local timezone
 */
export function parseUTCToLocal(utcDateString) {
  if (!utcDateString) return null;

  initLuxon();
  
  // Luxon handles various UTC formats automatically
  const dateTime = DateTime.fromISO(utcDateString, { zone: 'utc' }).toLocal();

  // Validate the date
  if (!dateTime.isValid) {
    console.warn('Invalid date string:', utcDateString);
    return null;
  }

  return dateTime;
}

/**
 * Format a UTC date string according to the current language
 * @param {string} utcDateString - The UTC date string to format
 * @param {string} format - Optional Luxon format string
 * @returns {string} - Formatted date string in local timezone
 */
export function formatDate(utcDateString, format = null) {
  if (!utcDateString) return '';

  try {
    const dateTime = parseUTCToLocal(utcDateString);
    if (!dateTime) return '';

    if (format) {
      return dateTime.toFormat(format);
    }

    // Use default localized format
    const formats = getLocaleFormats();
    return dateTime.toFormat(formats.date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return utcDateString; // Fallback to original string
  }
}

/**
 * Format a UTC time string according to the current language
 * @param {string} utcDateString - The UTC date string to format
 * @param {string} format - Optional Luxon format string
 * @returns {string} - Formatted time string in local timezone
 */
export function formatTime(utcDateString, format = null) {
  if (!utcDateString) return '';

  try {
    const dateTime = parseUTCToLocal(utcDateString);
    if (!dateTime) return '';
    
    if (format) {
      return dateTime.toFormat(format);
    }

    // Use default localized format
    const formats = getLocaleFormats();
    return dateTime.toFormat(formats.time);
  } catch (error) {
    console.error('Error formatting time:', error);
    return utcDateString;
  }
}

/**
 * Format a complete UTC datetime according to the current language
 * @param {string} utcDateString - The UTC date string to format
 * @param {string} format - Optional Luxon format string
 * @returns {string} - Formatted datetime string in local timezone
 */
export function formatDateTime(utcDateString, format = null) {
  if (!utcDateString) return '';

  try {
    const dateTime = parseUTCToLocal(utcDateString);
    if (!dateTime) return '';
    
    if (format) {
      return dateTime.toFormat(format);
    }

    // Use default localized format
    const formats = getLocaleFormats();
    return dateTime.toFormat(formats.datetime);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return utcDateString; // Fallback to original string
  }
}

/**
 * Convert a local date/datetime to UTC for sending to backend
 * @param {Date|string|DateTime} localDateTime - Local date/datetime
 * @returns {string} - UTC ISO string
 */
export function toUTC(localDateTime) {
  if (!localDateTime) return null;

  initLuxon();
  
  let dateTime;
  if (DateTime.isDateTime(localDateTime)) {
    dateTime = localDateTime;
  } else {
    dateTime = DateTime.fromJSDate(localDateTime instanceof Date ? localDateTime : new Date(localDateTime));
  }

  return dateTime.toUTC().toISO();
}

/**
 * Get current date in YYYY-MM-DD format (local timezone)
 * @returns {string} - Current date string
 */
export function getCurrentDateString() {
  initLuxon();
  return DateTime.now().toFormat('yyyy-MM-dd');
}



/**
 * Convert a local date/time input to UTC with explicit timezone handling
 * @param {string} localDate - Date in YYYY-MM-DD format
 * @param {string} localTime - Time in HH:MM format
 * @returns {string} - UTC ISO string
 */
export function localDateTimeToUTC(localDate, localTime) {
  if (!localDate || !localTime) return null;

  initLuxon();
  
  // Create a DateTime object in the user's local timezone
  const localDateTime = DateTime.fromFormat(`${localDate} ${localTime}`, 'yyyy-MM-dd HH:mm');

  // Convert to UTC ISO string
  return localDateTime.toUTC().toISO();
}



/**
 * Format a UTC date string to relative time (e.g., "2 hours ago", "in 3 days")
 * @param {string} utcDateString - UTC date string from backend
 * @returns {string} - Relative time string
 */
export function formatRelativeTime(utcDateString) {
  if (!utcDateString) return '';

  try {
    const dateTime = parseUTCToLocal(utcDateString);
    if (!dateTime) return '';

    // Use Luxon's toRelative() for relative time
    return dateTime.toRelative();
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return utcDateString;
  }
}

/**
 * Format a UTC date for the grace period warning (localized)
 * @param {string} utcDateString - UTC date string
 * @returns {string} - Formatted date for warning display
 */
export function formatGracePeriodDate(utcDateString) {
  const dateTime = parseUTCToLocal(utcDateString);
  if (!dateTime) return '';

  const formats = getLocaleFormats();
  return dateTime.toFormat(formats.gracePeriod);
}

/**
 * Format date with timezone information
 * @param {string} utcDateString - UTC date string
 * @param {boolean} showTimezone - Whether to show timezone info
 * @returns {string} - Formatted date string with optional timezone
 */
export function formatDateWithTimezone(utcDateString, showTimezone = false) {
  const dateTime = parseUTCToLocal(utcDateString);
  if (!dateTime) return '';

  const formats = getLocaleFormats();
  const format = showTimezone ? formats.withTimezone : formats.datetime;

  return dateTime.toFormat(format);
}

/**
 * Get current DateTime object
 * @returns {DateTime} - Current DateTime in local timezone
 */
export function getCurrentDateTime() {
  initLuxon();
  return DateTime.now();
}

/**
 * Create DateTime from date components
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @param {number} day - Day of month
 * @param {number} hour - Hour (0-23) - optional, defaults to 0
 * @param {number} minute - Minute (0-59) - optional, defaults to 0
 * @param {number} second - Second (0-59) - optional, defaults to 0
 * @returns {DateTime} - DateTime object
 */
export function createDateTime(year, month, day, hour = 0, minute = 0, second = 0) {
  initLuxon();
  return DateTime.local(year, month, day, hour, minute, second);
}

/**
 * Get start of today (00:00:00)
 * @returns {DateTime} - Start of today
 */
export function getStartOfToday() {
  initLuxon();
  return DateTime.now().startOf('day');
}

/**
 * Add/subtract time from a DateTime
 * @param {DateTime|string} dateTime - DateTime object or ISO string
 * @param {Object} duration - Duration object {days: 1, hours: 2, etc}
 * @returns {DateTime} - Modified DateTime
 */
export function addTime(dateTime, duration) {
  initLuxon();
  let dt = DateTime.isDateTime(dateTime) ? dateTime : DateTime.fromISO(dateTime);
  return dt.plus(duration);
}

/**
 * Subtract time from a DateTime
 * @param {DateTime|string} dateTime - DateTime object or ISO string
 * @param {Object} duration - Duration object {days: 1, hours: 2, etc}
 * @returns {DateTime} - Modified DateTime
 */
export function subtractTime(dateTime, duration) {
  initLuxon();
  let dt = DateTime.isDateTime(dateTime) ? dateTime : DateTime.fromISO(dateTime);
  return dt.minus(duration);
}

/**
 * Compare two dates
 * @param {DateTime|string} date1 - First date
 * @param {DateTime|string} date2 - Second date
 * @returns {number} - -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDates(date1, date2) {
  initLuxon();
  const dt1 = DateTime.isDateTime(date1) ? date1 : DateTime.fromISO(date1);
  const dt2 = DateTime.isDateTime(date2) ? date2 : DateTime.fromISO(date2);
  
  if (dt1 < dt2) return -1;
  if (dt1 > dt2) return 1;
  return 0;
}

/**
 * Format DateTime to ISO date string (YYYY-MM-DD)
 * @param {DateTime} dateTime - DateTime object
 * @returns {string} - ISO date string
 */
export function toISODate(dateTime) {
  if (!DateTime.isDateTime(dateTime)) return '';
  return dateTime.toFormat('yyyy-MM-dd');
}

/**
 * Get month name for a DateTime
 * @param {DateTime} dateTime - DateTime object
 * @returns {string} - Month name in current locale
 */
export function getMonthName(dateTime) {
  if (!DateTime.isDateTime(dateTime)) return '';
  initLuxon();
  return dateTime.toFormat('MMMM');
}

/**
 * Get weekday name for a DateTime
 * @param {DateTime} dateTime - DateTime object
 * @returns {string} - Weekday name in current locale
 */
export function getWeekdayName(dateTime) {
  if (!DateTime.isDateTime(dateTime)) return '';
  initLuxon();
  return dateTime.toFormat('cccc');
}
