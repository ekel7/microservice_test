<template>
  <div class="agenda-container h-full flex flex-col">

    <div class="agenda-grid border border-gray-600 rounded-lg overflow-hidden flex-1 flex flex-col">
      <!-- Header Row with Courts -->
      <div class="grid agenda-header-row bg-hover sticky top-0 z-20" :style="{ gridTemplateColumns: `120px repeat(${courts.length}, 1fr)` }">
        <div class="agenda-time-header p-3 font-medium text-primary border-r border-gray-600">
          {{ t('rentals.agenda.time') }}
        </div>
        <div 
          v-for="court in courts" 
          :key="court.id"
          class="agenda-court-header p-3 font-medium text-primary text-center border-r border-gray-600 last:border-r-0"
        >
          {{ court.name }}
        </div>
      </div>

      <!-- Scrollable Time Rows -->
      <div 
        ref="timeRowsContainer"
        class="agenda-time-rows-container overflow-y-auto flex-1"
      >
        <div 
          v-for="hour in timeSlots" 
          :key="hour"
          :ref="el => setTimeSlotRef(hour, el)"
          class="grid agenda-time-row border-t border-gray-600 hover:bg-hover"
          :style="{ gridTemplateColumns: `120px repeat(${courts.length}, 1fr)` }"
        >
          <!-- Time Label -->
          <div class="agenda-time-cell p-3 font-medium text-secondary border-r border-gray-600">
            {{ formatHour(hour) }}
          </div>
          
          <!-- Court Columns -->
          <div 
            v-for="court in courts" 
            :key="`${hour}-${court.id}`"
            class="agenda-court-cell p-2 border-r border-gray-600 last:border-r-0 relative"
            style="min-height: 60px;"
            @click="onCellClick(court, hour)"
          >
            <div 
              v-for="rental in getRentalsForSlot(court.id, hour)" 
              :key="rental.id"
              v-show="getRentalPosition(rental, hour) !== 'hidden'"
              :ref="el => setRentalRef(rental.id, el)"
              class="agenda-rental-block rounded px-2 py-1 text-xs font-medium cursor-pointer shadow-sm"
              :class="getStatusColor(rental.status)"
              :style="getRentalPosition(rental, hour)"
              :title="getRentalTooltip(rental)"
              @click.stop="onRentalClick(rental)"
            >
              <div class="truncate">{{ rental.client?.full_name || t('rentals.unknownClient') }}</div>
              <div class="truncate text-xs opacity-75">
                {{ formatTime(rental.start_datetime) }} - {{ formatTime(rental.end_datetime) }}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4 text-xs text-secondary">
      {{ t('rentals.agenda.clickToAdd') }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, nextTick, watch } from 'vue'
import { useI18n } from '../../i18n/composable'
import { apiClient } from '../../utils/api.js'
import { parseUTCToLocal } from '../../utils/dateFormat.js'
import { DateTime } from 'luxon'

const { t } = useI18n()

const props = defineProps({
  date: {
    type: Date,
    required: true
  },
  rentals: {
    type: Array,
    default: () => []
  },
  courts: {
    type: Array,
    default: () => []
  },
  highlightedRentalId: {
    type: [String, Number],
    default: null
  }
})


const emit = defineEmits(['rental-click', 'cell-click'])

// Refs for DOM elements
const timeRowsContainer = ref(null)
const timeSlotRefs = ref({})
const rentalRefs = ref({})

// Platform settings for establishment hours
const establishmentStartHour = ref(8) // Default 8:00
const establishmentEndHour = ref(22) // Default 22:00

// Helper functions to set refs
const setTimeSlotRef = (hour, el) => {
  if (el) {
    timeSlotRefs.value[hour] = el
  }
}

const setRentalRef = (rentalId, el) => {
  if (el) {
    rentalRefs.value[rentalId] = el
  }
}

// Generate time slots based on establishment hours
const timeSlots = computed(() => {
  const slots = []
  for (let hour = establishmentStartHour.value; hour <= establishmentEndHour.value; hour++) {
    slots.push(hour)
  }
  return slots
})

const formatHour = (hour) => {
  return `${hour.toString().padStart(2, '0')}:00`
}

const formatTime = (utcDatetime) => {
  if (!utcDatetime) return ''

  const localDateTime = parseUTCToLocal(utcDatetime)
  return localDateTime.toFormat('HH:mm')
}

const getRentalsForSlot = (courtId, hour) => {
  const result = props.rentals.filter(rental => {

    // Get court ID from either court_id field or nested court.id
    const rentalCourtId = rental.court_id || (rental.court && rental.court.id)

    // Check if rental belongs to this court
    if (!rentalCourtId || String(rentalCourtId) !== String(courtId)) {
      return false
    }

    const localStartTime = parseUTCToLocal(rental.start_datetime)
    const localEndTime = parseUTCToLocal(rental.end_datetime)

    const startHour = localStartTime.hour

    // Check if rental start time is on the same date as the agenda (in local timezone)
    // For multi-day rentals, we show them on the day they start
    // Convert JavaScript Date prop to Luxon DateTime for comparison
    const agendaDate = DateTime.fromJSDate(props.date)

    if (!localStartTime.hasSame(agendaDate, 'day')) {
      return false
    }

    // Check if rental overlaps with this hour (in local timezone)
    const endHour = localEndTime.hour
    const endMinutes = localEndTime.minute

    // Check if end time is on a different day (overnight rental)
    // Use Luxon's hasSame method to compare dates
    const isOvernightRental = !localStartTime.hasSame(localEndTime, 'day')


    // Include hour if rental starts in this hour or if it spans into this hour
    let shouldInclude
    if (isOvernightRental) {
      // For overnight rentals, include all hours from start until midnight (23:59)
      shouldInclude = hour >= startHour
    } else {
      // For same-day rentals, normal logic
      shouldInclude = hour >= startHour && (hour < endHour || (hour === endHour && endMinutes > 0))
    }


    return shouldInclude
  })


  return result
}

const getRentalPosition = (rental, currentHour) => {
  const localStartTime = parseUTCToLocal(rental.start_datetime)
  const localEndTime = parseUTCToLocal(rental.end_datetime)
  const startHour = localStartTime.hour  // Use Luxon property, not JavaScript Date method
  const startMinute = localStartTime.minute  // Use Luxon property, not JavaScript Date method

  // Only show the rental block in its starting hour slot to avoid duplicates
  if (currentHour !== startHour) {
    return 'hidden'
  }

  // For overnight rentals, limit the height to show until midnight
  // Use Luxon's hasSame method to compare dates
  const isOvernightRental = !localStartTime.hasSame(localEndTime, 'day')
  const effectiveEndTime = isOvernightRental ?
    localStartTime.set({ hour: 24, minute: 0, second: 0 }) :  // Use Luxon's set method
    localEndTime
  const effectiveDurationHours = effectiveEndTime.diff(localStartTime, 'hours').hours  // Use Luxon's diff method

  const height = Math.max(effectiveDurationHours * 60, 40) // Minimum 40px for visibility

  // Calculate top position based on minutes within the hour
  const topOffset = (startMinute / 60) * 60 // 60px is the cell height

  return {
    position: 'absolute',
    top: `${topOffset}px`,
    left: '4px',
    right: '4px',
    height: `${height}px`,
    zIndex: 10
  }
}

const getRentalTooltip = (rental) => {
  const clientName = rental.client?.full_name || t('rentals.unknownClient')
  const courtName = rental.court?.name || t('rentals.unknownCourt')
  const startTime = formatTime(rental.start_datetime)
  const endTime = formatTime(rental.end_datetime)
  const status = getStatusText(rental.status)
  
  return `${clientName}\n${courtName}\n${startTime} - ${endTime}\n${t('common.status')}: ${status}\n${t('rentals.amount')}: $${rental.total_amount}`
}

const getStatusColor = (status) => {
  switch (status) {
    case 'confirmed':
      return 'bg-green-900/30 text-green-300 border-green-600'
    case 'pending':
      return 'bg-yellow-900/30 text-yellow-300 border-yellow-600'
    case 'completed':
      return 'bg-blue-900/30 text-blue-300 border-blue-600'
    case 'cancelled':
      return 'bg-red-900/30 text-red-300 border-red-600'
    default:
      return 'bg-gray-600/30 text-gray-300 border-gray-500'
  }
}

const getStatusText = (status) => {
  switch (status) {
    case 'confirmed':
      return t('rentals.confirmed')
    case 'pending':
      return t('rentals.pending')
    case 'completed':
      return t('rentals.completed')
    case 'cancelled':
      return t('rentals.cancelled')
    default:
      return status
  }
}

const onRentalClick = (rental) => {
  emit('rental-click', rental)
}

const onCellClick = (court, hour) => {
  // Create a DateTime object for the clicked time slot
  const agendaDate = DateTime.fromJSDate(props.date)
  const clickedDateTime = agendaDate.set({ hour, minute: 0, second: 0, millisecond: 0 })

  emit('cell-click', {
    court,
    datetime: clickedDateTime.toJSDate() // Convert back to JS Date for compatibility with parent component
  })
}

// Fetch establishment hours from platform settings
const fetchEstablishmentHours = async () => {
  try {
    const response = await apiClient.getPlatformSettings()
    if (response.start_time && response.end_time) {
      // Parse the time strings (format: "HH:MM:SS" or "HH:MM")
      const startTimeParts = response.start_time.split(':')
      const endTimeParts = response.end_time.split(':')
      
      establishmentStartHour.value = parseInt(startTimeParts[0], 10)
      
      // Handle special case for 23:59 (treat as end of day, show hour 23)
      const endHour = parseInt(endTimeParts[0], 10)
      const endMinute = parseInt(endTimeParts[1], 10)
      
      if (endHour === 23 && endMinute === 59) {
        establishmentEndHour.value = 23
      } else {
        establishmentEndHour.value = endHour
      }
    }
  } catch (error) {
    console.error('Error fetching establishment hours:', error)
    // Keep default values (8-22)
  }
}

// Scroll to a reasonable hour or find the first rental
const scrollToReasonableHour = async () => {
  await nextTick()

  // First, try to find the earliest rental to scroll to it
  if (props.rentals.length > 0) {
    const earliestRental = props.rentals.reduce((earliest, current) => {
      const currentStartTime = parseUTCToLocal(current.start_datetime)
      const earliestStartTime = parseUTCToLocal(earliest.start_datetime)
      return currentStartTime < earliestStartTime ? current : earliest
    })

    const earliestStartTime = parseUTCToLocal(earliestRental.start_datetime)
    const earliestHour = earliestStartTime.hour

    if (timeRowsContainer.value && timeSlotRefs.value[earliestHour]) {
      timeSlotRefs.value[earliestHour].scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
      return
    }
  }

  // If no rentals, scroll to establishment start hour as fallback
  if (timeRowsContainer.value && timeSlotRefs.value[establishmentStartHour.value]) {
    timeSlotRefs.value[establishmentStartHour.value].scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }
}

// Scroll to highlighted rental
const scrollToRental = async (rentalId) => {
  if (!rentalId) return
  
  await nextTick()
  if (timeRowsContainer.value && rentalRefs.value[rentalId]) {
    rentalRefs.value[rentalId].scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    })
  }
}

// Watch for changes in highlighted rental
watch(() => props.highlightedRentalId, (newRentalId) => {
  if (newRentalId) {
    scrollToRental(newRentalId)
  }
}, { immediate: true })

// Initialize scroll position on mount
onMounted(async () => {
  // Fetch establishment hours first
  await fetchEstablishmentHours()
  
  if (props.highlightedRentalId) {
    // If there's a highlighted rental, scroll to it
    scrollToRental(props.highlightedRentalId)
  }
})
</script>

<style scoped>
.agenda-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.agenda-grid {
  background: var(--card-bg);
}

.agenda-time-cell {
  font-size: 0.875rem;
  font-weight: 500;
  background: var(--card-bg);
}

.agenda-court-cell {
  cursor: pointer;
  transition: background-color 0.15s ease;
  background: var(--card-bg);
}

.agenda-court-cell:hover {
  background-color: var(--hover-bg);
}

.agenda-rental-block {
  border: 1px solid;
  transition: all 0.15s ease;
}

.agenda-rental-block:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>