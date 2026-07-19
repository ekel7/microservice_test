<template>
  <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-primary min-h-screen">
    <!-- Courts Management Content -->
    <div class="bg-card shadow-lg rounded-lg border border-gray-600">
      <div class="px-4 py-5 sm:p-6">
        <!-- Title - Hidden on mobile, shown on desktop inside card -->
        <div class="mb-6 hidden lg:block">
          <h1 class="text-3xl font-bold text-primary">{{ t('courts.title') }}</h1>
          <p class="mt-2 text-secondary">{{ t('courts.subtitle') }}</p>
        </div>

        <div class="flex justify-end items-center mb-6">
          <button 
            @click="openCourtModal()"
            class="bg-accent hover:bg-accent/80 hover:scale-105 text-black px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
          >
            {{ t('courts.addNewCourt') }}
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
          <p class="mt-2 text-secondary">{{ t('courts.loading') }}</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-900/20 border border-red-400 rounded-md p-4 mb-4">
          <p class="text-red-400">{{ error }}</p>
          <button @click="loadCourts" class="mt-2 text-red-300 hover:text-red-100 hover:scale-105 text-sm transition-all duration-200">
            {{ t('common.tryAgain') }}
          </button>
        </div>

        <!-- Courts List -->
        <div v-else-if="courts.length > 0" class="space-y-4">
          <div 
            v-for="court in courts" 
            :key="court.id"
            class="border border-gray-600 rounded-lg p-4 hover:bg-hover bg-card"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3 class="text-lg font-medium text-primary">{{ court.name }}</h3>
                <p class="text-sm text-secondary">{{ t('courts.typeLabel') }}: {{ translateSurfaceType(court.surface_type) }}</p>
                <p class="text-sm text-secondary">{{ t('courts.rateLabel') }}: ${{ formatCurrency(court.hourly_rate) }}/{{ t('courts.hour') }}</p>
                <p v-if="court.description" class="text-sm text-secondary">{{ court.description }}</p>
                <p v-if="court.max_capacity" class="text-sm text-secondary">{{ t('courts.maxCapacityLabel') }}: {{ court.max_capacity }}</p>
                <p v-if="court.is_covered" class="text-sm text-secondary">{{ t('courts.coveredLabel') }}: {{ t('courts.yes') }}</p>
              </div>
              <div class="flex items-center space-x-2">
                <span 
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="court.status === 'available' ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'"
                >
                  {{ court.status === 'available' ? t('common.available') : 
                     court.status === 'maintenance' ? t('courts.maintenance') : 
                     t('common.unavailable') }}
                </span>
                <button 
                  @click="openCourtModal(court)"
                  class="text-accent hover:text-accent/80 hover:scale-105 text-sm font-medium transition-all duration-200"
                >
                  {{ t('common.edit') }}
                </button>
                <button 
                  @click="deleteCourtConfirm(court)"
                  class="text-red-400 hover:text-red-300 hover:scale-105 text-sm font-medium transition-all duration-200"
                >
                  {{ t('common.delete') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h2M7 7h.01M7 3h5c1.4 0 2.4.6 3 1.4m-3.4 13.6c-.6.8-1.6 1.4-3 1.4H7" />
          </svg>
          <h3 class="mt-2 text-lg font-medium text-primary">{{ t('courts.noData') }}</h3>
          <p class="mt-1 text-secondary">{{ t('courts.getStarted') }}</p>
        </div>
      </div>
    </div>

    <!-- Add/Edit Court Modal -->
    <div 
      v-if="showModal"
      class="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-start justify-center pt-8 p-4"
      @click.self="closeCourtModal"
    >
      <div class="relative mx-auto border border-gray-600 shadow-lg rounded-xl bg-card max-h-[90vh] overflow-y-auto" style="width: 480px;">
        <div class="p-5">
          <h3 class="text-lg font-medium text-primary mb-4">
            {{ editingCourt ? t('courts.editCourt') : t('courts.addNewCourt') }}
          </h3>
          <form @submit.prevent="saveCourt">
            <div class="mb-4">
              <label class="block text-sm font-medium text-secondary mb-2">{{ t('courts.courtName') }}</label>
              <input 
                type="text" 
                v-model="courtForm.name" 
                required 
                class="w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-secondary mb-2">{{ t('courts.surfaceType') }}</label>
              <select 
                v-model="courtForm.surface_type" 
                required 
                class="w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">{{ t('courts.selectSurfaceType') }}</option>
                <option value="clay">{{ t('courts.clay') }}</option>
                <option value="grass">{{ t('courts.grass') }}</option>
                <option value="hard">{{ t('courts.hard') }}</option>
                <option value="synthetic">{{ t('courts.synthetic') }}</option>
              </select>
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-secondary mb-2">{{ t('courts.hourlyRateLabel') }}</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary">$</span>
                <input 
                  type="text" 
                  :value="formattedHourlyRate"
                  @input="onHourlyRateInput"
                  placeholder="0"
                  required 
                  class="w-full pl-8 pr-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
                >
              </div>
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-secondary mb-2">{{ t('courts.description') }}</label>
              <textarea 
                v-model="courtForm.description" 
                rows="3" 
                class="w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              ></textarea>
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-secondary mb-2">{{ t('courts.maxCapacity') }}</label>
              <input 
                type="number" 
                v-model.number="courtForm.max_capacity" 
                min="1" 
                class="w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
            </div>
            <div class="mb-4">
              <label class="flex items-center">
                <input 
                  type="checkbox" 
                  v-model="courtForm.is_covered" 
                  class="rounded border-gray-600 text-accent focus:ring-accent bg-hover"
                >
                <span class="ml-2 text-sm text-secondary">{{ t('courts.coveredCourt') }}</span>
              </label>
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-secondary mb-2">{{ t('courts.status') }}</label>
              <select 
                v-model="courtForm.status" 
                class="w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="available">{{ t('common.available') }}</option>
                <option value="maintenance">{{ t('courts.maintenance') }}</option>
                <option value="unavailable">{{ t('common.unavailable') }}</option>
              </select>
            </div>
            <div class="flex justify-end space-x-3">
              <button 
                type="button" 
                @click="closeCourtModal"
                class="px-4 py-2 text-sm font-medium text-secondary bg-hover border border-gray-600 rounded-md hover:bg-card hover:text-primary hover:scale-105 transition-all duration-200"
              >
                {{ t('common.cancel') }}
              </button>
              <button 
                type="submit"
                :disabled="saving"
                class="px-4 py-2 text-sm font-medium text-black bg-accent border border-transparent rounded-md hover:bg-accent/80 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 transition-all duration-200"
              >
                {{ saving ? t('common.save') + '...' : (editingCourt ? t('courts.updateCourt') : t('courts.addCourt')) }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { apiClient } from '../../utils/api.js'
import { useI18n } from '../../i18n/composable.ts'

const { t } = useI18n()

const courts = ref([])
const loading = ref(false)
const error = ref('')
const showModal = ref(false)
const editingCourt = ref(null)
const saving = ref(false)

const courtForm = ref({
  name: '',
  surface_type: '',
  hourly_rate: 0,
  description: '',
  max_capacity: null,
  is_covered: false,
  status: 'available'
})

// Separate reactive variable for formatted hourly rate display
const formattedHourlyRate = ref('')

// Format number with Argentine peso formatting (thousands separator)
const formatCurrency = (value) => {
  if (!value && value !== 0) return ''
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/\./g, '')) : value
  if (isNaN(numValue)) return ''
  return numValue.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// Parse formatted string back to number
const parseCurrency = (formatted) => {
  if (!formatted) return 0
  const cleaned = formatted.replace(/\./g, '').replace(/,/g, '.')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

// Handle hourly rate input change
const onHourlyRateInput = (event) => {
  const value = event.target.value
  // Remove non-numeric characters except dots and commas
  const cleaned = value.replace(/[^\d]/g, '')
  const numValue = cleaned === '' ? 0 : parseInt(cleaned, 10)
  
  // Update the actual form value
  courtForm.value.hourly_rate = numValue
  
  // Update the formatted display
  formattedHourlyRate.value = formatCurrency(numValue)
}

const loadCourts = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const response = await apiClient.getCourts()
    courts.value = response.data || response
  } catch (err) {
    error.value = err.message || 'Failed to load courts'
    console.error('Error loading courts:', err)
  } finally {
    loading.value = false
  }
}

const openCourtModal = (court = null) => {
  if (court) {
    // Edit mode
    editingCourt.value = court
    courtForm.value = {
      name: court.name || '',
      surface_type: court.surface_type || '',
      hourly_rate: court.hourly_rate || 0,
      description: court.description || '',
      max_capacity: court.max_capacity || null,
      is_covered: court.is_covered || false,
      status: court.status || 'available'
    }
    // Set formatted hourly rate for editing
    formattedHourlyRate.value = formatCurrency(court.hourly_rate || 0)
  } else {
    // Add mode
    editingCourt.value = null
    courtForm.value = {
      name: '',
      surface_type: '',
      hourly_rate: 0,
      description: '',
      max_capacity: null,
      is_covered: false,
      status: 'available'
    }
    // Clear formatted hourly rate for new court
    formattedHourlyRate.value = ''
  }
  
  showModal.value = true
}

const closeCourtModal = () => {
  showModal.value = false
  editingCourt.value = null
  courtForm.value = {
    name: '',
    surface_type: '',
    hourly_rate: 0,
    description: '',
    max_capacity: null,
    is_covered: false,
    status: 'available'
  }
  // Clear formatted hourly rate
  formattedHourlyRate.value = ''
}

const saveCourt = async () => {
  saving.value = true
  
  try {
    const courtData = {
      name: courtForm.value.name,
      surface_type: courtForm.value.surface_type,
      hourly_rate: parseFloat(courtForm.value.hourly_rate),
      description: courtForm.value.description,
      max_capacity: courtForm.value.max_capacity ? parseInt(courtForm.value.max_capacity) : null,
      is_covered: courtForm.value.is_covered,
      status: courtForm.value.status
    }

    if (editingCourt.value) {
      await apiClient.updateCourt(editingCourt.value.id, courtData)
    } else {
      await apiClient.createCourt(courtData)
    }
    
    closeCourtModal()
    loadCourts()
  } catch (err) {
    error.value = err.message || 'Failed to save court'
    console.error('Error saving court:', err)
  } finally {
    saving.value = false
  }
}

const deleteCourtConfirm = (court) => {
  const confirmMessage = t('courts.deleteConfirm', { name: court.name })
  if (confirm(confirmMessage)) {
    deleteCourt(court.id)
  }
}

const deleteCourt = async (id) => {
  try {
    await apiClient.deleteCourt(id)
    loadCourts()
  } catch (err) {
    error.value = err.message || 'Failed to delete court'
    console.error('Error deleting court:', err)
  }
}

const translateSurfaceType = (surfaceType) => {
  switch (surfaceType) {
    case 'clay':
      return t('courts.clay')
    case 'grass':
      return t('courts.grass')
    case 'hard':
      return t('courts.hard')
    case 'synthetic':
      return t('courts.synthetic')
    default:
      return surfaceType
  }
}

// ESC key handling
const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    if (showModal.value) {
      closeCourtModal()
      event.preventDefault()
      event.stopPropagation()
    }
  }
}

onMounted(() => {
  loadCourts()
  // Add ESC key listener
  document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  // Clean up event listener
  document.removeEventListener('keydown', handleKeyDown)
})
</script>
