import { computed, ref, watch } from 'vue'
import { useI18n } from '../i18n/composable.ts'
import { 
  formatDate, 
  formatDateTime, 
  formatRelativeTime,
  formatGracePeriodDate,
  getBrowserTimezone,
  getLocaleDateFormatOptions,
  getLocaleDateTimeFormatOptions
} from '../utils/dateFormat.js'

/**
 * Composable for handling date localization in Vue components
 * Automatically updates when language changes
 */
export function useDateLocalization() {
  const { currentLanguage } = useI18n()
  
  // Force reactivity when language changes
  const languageVersion = ref(0)
  watch(currentLanguage, () => {
    languageVersion.value++
  })

  // Browser timezone info
  const timezone = computed(() => getBrowserTimezone())
  
  // Localization options that update with language
  const dateOptions = computed(() => {
    languageVersion.value // Access for reactivity
    return getLocaleDateFormatOptions()
  })
  
  const dateTimeOptions = computed(() => {
    languageVersion.value // Access for reactivity  
    return getLocaleDateTimeFormatOptions()
  })

  /**
   * Format a UTC date string to localized date
   * @param utcDateString - UTC date from backend
   * @param options - Additional formatting options
   * @returns Reactive computed property with formatted date
   */
  function useLocalizedDate(utcDateString: string, options: Intl.DateTimeFormatOptions = {}) {
    return computed(() => {
      languageVersion.value // Access for reactivity
      return formatDate(utcDateString, options)
    })
  }

  /**
   * Format a UTC date string to localized datetime
   * @param utcDateString - UTC date from backend
   * @param options - Additional formatting options
   * @returns Reactive computed property with formatted datetime
   */
  function useLocalizedDateTime(utcDateString: string, options: Intl.DateTimeFormatOptions = {}) {
    return computed(() => {
      languageVersion.value // Access for reactivity
      return formatDateTime(utcDateString, options)
    })
  }

  /**
   * Format a UTC date string to relative time
   * @param utcDateString - UTC date from backend
   * @returns Reactive computed property with relative time
   */
  function useRelativeTime(utcDateString: string) {
    return computed(() => {
      languageVersion.value // Access for reactivity
      return formatRelativeTime(utcDateString)
    })
  }

  /**
   * Format a UTC date string for grace period display
   * @param utcDateString - UTC date from backend
   * @returns Reactive computed property with grace period formatted date
   */
  function useGracePeriodDate(utcDateString: string) {
    return computed(() => {
      languageVersion.value // Access for reactivity
      return formatGracePeriodDate(utcDateString)
    })
  }

  /**
   * Format multiple dates at once
   * @param dates - Object with date strings as values
   * @returns Reactive computed property with formatted dates object
   */
  function useMultipleDates(dates: Record<string, string>, format: 'date' | 'datetime' = 'date') {
    return computed(() => {
      languageVersion.value // Access for reactivity
      
      const formatted: Record<string, string> = {}
      
      for (const [key, dateString] of Object.entries(dates)) {
        if (dateString) {
          formatted[key] = format === 'datetime' 
            ? formatDateTime(dateString)
            : formatDate(dateString)
        } else {
          formatted[key] = ''
        }
      }
      
      return formatted
    })
  }

  return {
    // Timezone info
    timezone,
    dateOptions,
    dateTimeOptions,
    
    // Formatting functions
    useLocalizedDate,
    useLocalizedDateTime,
    useRelativeTime,
    useGracePeriodDate,
    useMultipleDates,
    
    // Direct formatting (non-reactive)
    formatDate,
    formatDateTime,
    formatRelativeTime,
    formatGracePeriodDate
  }
}