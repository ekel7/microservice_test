<template>
  <div class="bg-primary min-h-screen">
    <div class="px-4 py-6 lg:px-0 lg:py-6">
      <!-- Welcome Message - Hidden on mobile, shown on desktop -->
      <div class="mb-6 hidden lg:block">
        <h1 class="text-3xl font-bold text-primary">
          {{ currentUser ? `${t('dashboard.welcome')}, ${currentUser.full_name}!` : t('dashboard.welcome') }}
        </h1>
        <p class="mt-2 text-secondary">{{ dynamicSubtitle }}</p>
      </div>

      <!-- Grace Period Warning -->
      <GracePeriodWarning 
        :account="currentAccount" 
        @payment-processed="onPaymentProcessed" 
        @warning-dismissed="onWarningDismissed" />
      
      <div v-if="showLockedAccountMessage" 
           class="mb-6 p-4 border-l-4 border-red-500 bg-red-50 text-red-800 rounded-r-lg shadow-md">
        <h3 class="font-bold text-sm mb-2">Account Locked</h3>
        <p class="text-sm">Your account has been locked due to overdue payment. Please contact support to restore access.</p>
      </div>

      <!-- Unified Single Container -->
      <div class="mb-6">
        <div class="bg-card rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-gray-600">
          <div class="p-6">
            <!-- Three Column Layout Inside Single Container -->
            <div class="flex flex-col lg:flex-row gap-4">
              
              <!-- Left Column: Weather (200px width) -->
              <div class="lg:w-[200px] lg:flex-shrink-0 lg:border-r lg:border-gray-600 lg:pr-4">
                <h3 class="text-sm font-semibold text-primary mb-2">{{ t('dashboard.weather.title') }}</h3>
                
                <div v-if="weatherLoading" class="text-center py-4">
                  <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto"></div>
                  <p class="mt-2 text-sm text-secondary">{{ t('dashboard.weather.loading') }}</p>
                </div>
                <div v-else-if="weatherError" class="text-center py-4">
                  <p class="text-sm text-red-400">{{ t('dashboard.weather.error') }}</p>
                </div>
                <div v-else-if="weather" class="space-y-2">
                  <!-- Current Weather -->
                  <div class="text-center">
                    <p v-if="usingDefaultLocation" class="text-xs text-yellow-400 mb-1">
                      📍
                    </p>
                    <div class="flex flex-col items-center mb-1">
                      <img 
                        v-if="weather.current.icon" 
                        :src="`https://openweathermap.org/img/wn/${weather.current.icon}@2x.png`"
                        :alt="weather.current.description"
                        class="w-10 h-10 mb-1"
                      />
                      <p class="text-lg font-bold text-primary">{{ Math.round(weather.current.temp) }}°</p>
                      <p class="text-xs text-secondary capitalize leading-tight">{{ weather.current.description }}</p>
                    </div>
                    <div v-if="weather.current.humidity" class="text-xs text-secondary">
                      <div>{{ weather.current.humidity }}% • {{ Math.round(weather.current.windSpeed) }}m/s</div>
                    </div>
                  </div>
                  
                  <!-- Weekly Forecast - Responsive -->
                  <div class="space-y-1">
                    <p class="text-xs text-secondary font-medium">{{ t('dashboard.weather.forecast') }}</p>
                    
                    <!-- Desktop: Vertical Layout -->
                    <div class="hidden lg:block space-y-2">
                      <div v-for="day in weather.weekly.slice(0, 4)" :key="day.date" class="flex items-center text-xs py-1">
                        <span class="text-secondary min-w-[32px] text-xs">{{ formatDate(day.date).split(' ')[0].substring(0, 2) }}</span>
                        <div class="flex items-center ml-auto space-x-1">
                          <img 
                            v-if="day.icon" 
                            :src="`https://openweathermap.org/img/wn/${day.icon}.png`"
                            :alt="day.description"
                            class="w-4 h-4"
                          />
                          <span class="text-primary font-medium text-xs">{{ day.temp_max }}°</span>
                          <span class="text-secondary text-xs">{{ day.temp_min }}°</span>
                        </div>
                      </div>
                    </div>

                    <!-- Mobile: Horizontal Layout -->
                    <div class="lg:hidden flex gap-4 overflow-x-auto pb-2">
                      <div v-for="day in weather.weekly.slice(0, 5)" :key="day.date" class="flex-shrink-0 text-center min-w-[50px]">
                        <div class="text-xs text-secondary mb-1">{{ formatDate(day.date).split(' ')[0] }}</div>
                        <img 
                          v-if="day.icon" 
                          :src="`https://openweathermap.org/img/wn/${day.icon}.png`"
                          :alt="day.description"
                          class="w-8 h-8 mx-auto mb-1"
                        />
                        <div class="text-xs space-y-0.5">
                          <div class="text-primary font-medium">{{ day.temp_max }}°</div>
                          <div class="text-secondary">{{ day.temp_min }}°</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Center Column: Rentals Table -->
              <div class="lg:flex-1 cursor-pointer hover:bg-hover/10 rounded transition-colors lg:border-r lg:border-gray-600 lg:pr-6" @click="goToRentals">
                <h3 class="text-lg font-semibold text-primary mb-4">{{ t('dashboard.rentals.title') }}</h3>
                
                <div v-if="rentalsLoading" class="text-center py-4">
                  <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto"></div>
                  <p class="mt-2 text-sm text-secondary">{{ t('dashboard.rentals.loading') }}</p>
                </div>
                <div v-else-if="rentalsError" class="text-center py-4">
                  <p class="text-sm text-red-400">{{ t('dashboard.rentals.error') }}</p>
                </div>
                <div v-else-if="courtRentals.length === 0" class="text-center py-4">
                  <p class="text-sm text-secondary">{{ t('dashboard.rentals.noRentals') }}</p>
                </div>
                <div v-else class="bg-hover border border-gray-600 rounded-lg overflow-hidden">
                  <!-- Table Header -->
                  <div class="grid grid-cols-5 bg-card border-b border-gray-600 text-xs font-semibold text-secondary">
                    <div class="p-3 border-r border-gray-600">Cancha</div>
                    <div class="p-3 border-r border-gray-600 text-center">{{ t('dashboard.rentals.confirmed') }}</div>
                    <div class="p-3 border-r border-gray-600 text-center">{{ t('dashboard.rentals.pending') }}</div>
                    <div class="p-3 border-r border-gray-600 text-center">{{ t('dashboard.rentals.cancelled') }}</div>
                    <div class="p-3 text-center">Total</div>
                  </div>
                  
                  <!-- Table Rows -->
                  <div 
                    v-for="(court, index) in courtRentals" 
                    :key="court.id"
                    class="grid grid-cols-5 hover:bg-primary/5 transition-colors"
                    :class="{ 'border-b border-gray-600': index < courtRentals.length - 1 }"
                  >
                    <div class="p-3 border-r border-gray-600">
                      <div class="text-sm font-medium text-primary">{{ court.name }}</div>
                      <div class="text-xs text-secondary">{{ court.type }}</div>
                    </div>
                    <div class="p-3 border-r border-gray-600 text-center">
                      <span class="text-sm font-bold text-green-400">{{ getCourtStatusCount(court.rentalsToday, 'confirmed') }}</span>
                    </div>
                    <div class="p-3 border-r border-gray-600 text-center">
                      <span class="text-sm font-bold text-yellow-400">{{ getCourtStatusCount(court.rentalsToday, 'pending') }}</span>
                    </div>
                    <div class="p-3 border-r border-gray-600 text-center">
                      <span class="text-sm font-bold text-red-400">{{ getCourtStatusCount(court.rentalsToday, 'cancelled') }}</span>
                    </div>
                    <div class="p-3 text-center">
                      <span class="text-sm font-bold text-accent">{{ court.todayRentals }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right Column: Summary Stats (300px width) -->
              <div class="lg:w-[300px] lg:flex-shrink-0 space-y-2">
                <h4 class="text-lg font-semibold text-primary mb-3">{{ t('dashboard.rentals.summary') }}</h4>
                <div v-if="rentalsLoading" class="text-center py-4">
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-accent mx-auto"></div>
                </div>
                <div v-else class="text-sm space-y-2">
                  <div class="text-secondary">{{ t('dashboard.rentals.totalToday') }}: <span class="font-bold text-accent">{{ rentalStats.total || 0 }}</span></div>
                  <div class="text-secondary">{{ t('dashboard.rentals.confirmed') }}: <span class="font-bold text-green-400">{{ rentalStats.confirmed || 0 }}</span></div>
                  <div class="text-secondary">{{ t('dashboard.rentals.pending') }}: <span class="font-bold text-yellow-400">{{ rentalStats.pending || 0 }}</span></div>
                  <div class="text-secondary">{{ t('dashboard.rentals.cancelled') }}: <span class="font-bold text-red-400">{{ rentalStats.cancelled || 0 }}</span></div>
                  <div class="text-secondary">{{ t('dashboard.rentals.totalRevenue') }}: <span class="font-bold text-green-500">${{ formatCurrency(rentalStats.totalRevenue || 0) }}</span></div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { DateTime } from 'luxon'
import { useI18n } from '../../i18n/composable'
import { apiClient } from '../../utils/api.js'
import { weatherService } from '../../utils/weatherApi.js'
import { getCurrentDateString, parseUTCToLocal, formatTime as formatTimeUtil } from '../../utils/dateFormat.js'
import { expandRecurringEvents } from '../../utils/recurringRentals.js'
import GracePeriodWarning from './GracePeriodWarning.vue'

const { t } = useI18n()

// Reactive data
const currentUser = ref(null)
const currentAccount = ref(null)
const showLockedAccountMessage = ref(false)
const weather = ref(null)
const weatherLoading = ref(false)
const weatherError = ref(false)
const usingDefaultLocation = ref(false)
const rentalStats = ref({ total: 0, confirmed: 0, pending: 0, cancelled: 0, totalRevenue: 0 })
const courtRentals = ref([])
const rentalsLoading = ref(false)
const rentalsError = ref(false)

// Computed
const dynamicSubtitle = computed(() => {
  if (!weather.value?.current?.condition) {
    return t('dashboard.subtitle')
  }

  const condition = weather.value.current.condition

  switch (condition) {
    case 'bad':
      const encouragingMessages = [
        t('dashboard.subtitle.badWeather.indoor'),
        t('dashboard.subtitle.badWeather.cozy'),
        t('dashboard.subtitle.badWeather.planning'),
        t('dashboard.subtitle.badWeather.admin')
      ]
      return encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)]
    
    case 'perfect':
      const perfectMessages = [
        t('dashboard.subtitle.perfectWeather.tennis'),
        t('dashboard.subtitle.perfectWeather.outdoor'),
        t('dashboard.subtitle.perfectWeather.beautiful'),
        t('dashboard.subtitle.perfectWeather.ideal')
      ]
      return perfectMessages[Math.floor(Math.random() * perfectMessages.length)]
    
    case 'good':
      const goodMessages = [
        t('dashboard.subtitle.goodWeather.nice'),
        t('dashboard.subtitle.goodWeather.courts'),
        t('dashboard.subtitle.goodWeather.active'),
        t('dashboard.subtitle.goodWeather.great')
      ]
      return goodMessages[Math.floor(Math.random() * goodMessages.length)]
    
    default:
      return t('dashboard.subtitle')
  }
})

// Watch dynamicSubtitle and save to localStorage for Navigation component
watch(dynamicSubtitle, (newSubtitle) => {
  if (newSubtitle && typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('dashboardSubtitle', newSubtitle)
  }
})

// Methods
const formatDate = (dateString) => {
  // Parse date correctly using Luxon - dateString is in YYYY-MM-DD format
  const [year, month, day] = dateString.split('-').map(Number)
  const date = DateTime.local(year, month, day) // Luxon months are 1-based

  const dayNames = {
    1: t('calendar.mon'),
    2: t('calendar.tue'),
    3: t('calendar.wed'),
    4: t('calendar.thu'),
    5: t('calendar.fri'),
    6: t('calendar.sat'),
    7: t('calendar.sun')
  }

  const monthNames = {
    1: t('calendar.january'),
    2: t('calendar.february'),
    3: t('calendar.march'),
    4: t('calendar.april'),
    5: t('calendar.may'),
    6: t('calendar.june'),
    7: t('calendar.july'),
    8: t('calendar.august'),
    9: t('calendar.september'),
    10: t('calendar.october'),
    11: t('calendar.november'),
    12: t('calendar.december')
  }

  const dayName = dayNames[date.weekday] // Luxon weekday is 1-7 (Mon-Sun)
  const monthName = monthNames[date.month].substring(0, 3) // Luxon month is 1-12
  const dayNumber = date.day

  return `${dayName} ${dayNumber} ${monthName}`
}

const goToRentals = () => {
  window.location.href = '/rentals'
}

const goToCourtRentals = (court) => {
  if (court.rentalsToday && court.rentalsToday.length > 0) {
    // Get the first rental for this court and navigate to it
    const firstRental = court.rentalsToday[0]
    const today = getCurrentDateString()
    window.location.href = `/rentals?rentalId=${firstRental.id}&date=${today}`
  } else {
    // If no rentals, just go to rentals page with today's date
    const today = getCurrentDateString()
    window.location.href = `/rentals?date=${today}`
  }
}

const formatTime = (utcDatetime) => {
  if (!utcDatetime) return ''

  // Use the dateFormat utility to handle UTC to local conversion
  return formatTimeUtil(utcDatetime)
}

const fetchCurrentUser = async () => {
  try {
    const response = await apiClient.getCurrentUser()
    currentUser.value = response.user
  } catch (error) {
    console.error('Failed to fetch current user:', error)
    // Check if error is due to locked account
    if (error.message?.includes('account_locked') || error.message?.includes('locked')) {
      showLockedAccountMessage.value = true
    }
  }
}

const fetchCurrentAccount = async () => {
  try {
    const response = await apiClient.getCurrentAccount()
    currentAccount.value = response
  } catch (error) {
    console.error('Failed to fetch current account:', error)
  }
}

const onPaymentProcessed = (response) => {
  // Refresh account data after payment
  fetchCurrentAccount()
  console.log('Payment processed successfully:', response)
}

const onWarningDismissed = () => {
  console.log('Warning dismissed by user')
}

const fetchWeather = async () => {
  weatherLoading.value = true
  weatherError.value = false
  
  
  try {
    let weatherData
    
    try {
      // Try to get user's location
      const location = await weatherService.getUserLocation()
      // Check if we're using default location
      usingDefaultLocation.value = (location.lat === weatherService.defaultLat && location.lon === weatherService.defaultLon)
      // Fetch real weather data
      weatherData = await weatherService.getWeatherData(location.lat, location.lon)
    } catch (apiError) {
      console.warn('Weather API unavailable, using fallback data:', apiError)
      // Use fallback data if API is not available or API key is missing
      weatherData = weatherService.getFallbackWeatherData()
    }
    
    weather.value = weatherData
  } catch (error) {
    console.error('Failed to fetch weather:', error)
    weatherError.value = true
    // Set fallback data even on error
    weather.value = weatherService.getFallbackWeatherData()
  } finally {
    weatherLoading.value = false
  }
}

const fetchRentalStats = async () => {
  rentalsLoading.value = true
  rentalsError.value = false

  try {
    const today = getCurrentDateString()
    console.log('[Dashboard] Fetching rental stats for date:', today)

    // Fetch today's rentals using the same endpoint as calendar for consistency
    const { rentals, exceptions } = await apiClient.getCalendarView(today, today)

    // Extract rentals and exceptions from response
    const rentalsData = rentals || []
    const exceptionsData = exceptions || []
    console.log('[Dashboard] Backend returned rentals:', rentalsData?.length || 0)
    console.log('[Dashboard] Backend returned exceptions:', exceptionsData?.length || 0)

    // Also fetch courts
    const courtsResponse = await apiClient.getCourts()

    // Calculate stats
    const todayRentals = rentalsData || []
    const courts = courtsResponse.courts || courtsResponse.data || courtsResponse || []

    // Expand recurring rentals into individual instances for today, applying exceptions
    const todayDateTime = DateTime.fromISO(today)
    console.log('[Dashboard] Expanding recurring rentals for today:', todayDateTime.toISODate())
    const expandedRentals = expandRecurringEvents(todayRentals, todayDateTime, todayDateTime, exceptionsData)
    console.log('[Dashboard] After expansion, total rentals:', expandedRentals.length)

    // Use expanded rentals
    const validRentals = expandedRentals
    
    // Calculate revenue from confirmed rentals only
    const confirmedRentals = validRentals.filter(r => r.status === 'confirmed')
    const totalRevenue = confirmedRentals.reduce((sum, rental) => {
      return sum + (rental.total_amount || 0)
    }, 0)
    
    rentalStats.value = {
      total: validRentals.length,
      confirmed: confirmedRentals.length,
      pending: validRentals.filter(r => r.status === 'pending').length,
      cancelled: validRentals.filter(r => r.status === 'cancelled').length,
      totalRevenue: totalRevenue
    }
    
    // Calculate per-court rentals (use validRentals instead of todayRentals)
    courtRentals.value = courts.map(court => {
      const courtId = court.id || court.court_id
      const courtRentalsToday = validRentals.filter(rental => {
        const rentalCourtId = rental.court_id || rental.courtId || rental.court?.id
        return rentalCourtId === courtId
      })

      return {
        ...court,
        todayRentals: courtRentalsToday.length,
        rentalsToday: courtRentalsToday.sort((a, b) => {
          // Sort by start time using Luxon
          const timeA = parseUTCToLocal(a.start_datetime)
          const timeB = parseUTCToLocal(b.start_datetime)
          return timeA - timeB
        })
      }
    }).sort((a, b) => b.todayRentals - a.todayRentals)
    
  } catch (error) {
    console.error('Failed to fetch rental stats:', error)
    rentalsError.value = true
    
    // Set fallback data on error
    rentalStats.value = { total: 0, confirmed: 0, pending: 0, cancelled: 0, totalRevenue: 0 }
    courtRentals.value = []
  } finally {
    rentalsLoading.value = false
  }
}

// Helper functions for status grouping
const getCourtStatusGroups = (rentals) => {
  const groups = {}
  rentals.forEach(rental => {
    const status = rental.status || 'pending'
    if (!groups[status]) {
      groups[status] = { count: 0 }
    }
    groups[status].count++
  })
  return groups
}

// Get count of rentals by status for a court
const getCourtStatusCount = (rentals, status) => {
  if (!rentals || rentals.length === 0) return 0
  return rentals.filter(rental => rental.status === status).length
}

// Get next confirmed rental for a court
const getNextConfirmedRental = (court) => {
  if (!court.rentalsToday || court.rentalsToday.length === 0) return null

  const now = DateTime.now()
  const confirmedRentals = court.rentalsToday
    .filter(rental => rental.status === 'confirmed')
    .filter(rental => {
      const startTime = parseUTCToLocal(rental.start_datetime)
      return startTime >= now
    })
    .sort((a, b) => {
      const timeA = parseUTCToLocal(a.start_datetime)
      const timeB = parseUTCToLocal(b.start_datetime)
      return timeA - timeB
    })

  return confirmedRentals.length > 0 ? confirmedRentals[0] : null
}

// Format number with Argentine peso formatting
const formatCurrency = (value) => {
  if (!value && value !== 0) return '0'
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/\./g, '')) : value
  if (isNaN(numValue)) return '0'
  return numValue.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const getStatusCircleColor = (status) => {
  switch (status) {
    case 'confirmed':
      return 'bg-green-600'
    case 'pending':
      return 'bg-yellow-600'
    case 'completed':
      return 'bg-blue-600'
    case 'cancelled':
      return 'bg-red-600'
    default:
      return 'bg-gray-500'
  }
}

const getStatusText = (status) => {
  switch(status) {
    case 'confirmed': return t('rentals.confirmed')
    case 'pending': return t('rentals.pending')
    case 'completed': return t('rentals.completed')
    case 'cancelled': return t('rentals.cancelled')
    default: return status
  }
}

// Initialize data on component mount
onMounted(async () => {
  await Promise.all([
    fetchCurrentUser(),
    fetchCurrentAccount(),
    fetchWeather(),
    fetchRentalStats()
  ])
  
  // Initialize localStorage with current subtitle when mounted
  if (typeof window !== 'undefined' && window.localStorage && dynamicSubtitle.value) {
    localStorage.setItem('dashboardSubtitle', dynamicSubtitle.value)
  }
})
</script>
