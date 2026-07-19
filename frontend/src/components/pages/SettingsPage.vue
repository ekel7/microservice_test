<template>
  <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-primary min-h-screen">
    <!-- Title - Hidden on mobile, shown on desktop -->
    <div class="mb-6 hidden lg:block">
      <h1 class="text-3xl font-bold text-primary">Configuración</h1>
      <p class="mt-2 text-secondary">Personaliza tu experiencia y configura la plataforma</p>
    </div>

    <!-- Error display -->
    <div v-if="error" class="bg-red-900/20 border border-red-400 rounded-md p-4 mb-6">
      <p class="text-red-400">{{ error }}</p>
    </div>

    <!-- Success message -->
    <div v-if="successMessage" class="bg-green-900/20 border border-green-400 rounded-md p-4 mb-6">
      <p class="text-green-400">{{ successMessage }}</p>
    </div>

    <div class="space-y-6">
      <!-- Establishment Hours - FIRST -->
      <div v-if="isAdmin" class="bg-card shadow-lg rounded-lg border border-gray-600">
        <div class="px-6 py-4 border-b border-gray-600">
          <h3 class="text-lg font-semibold text-primary">Horarios del Establecimiento</h3>
          <p class="text-sm text-secondary mt-1">Configura el horario de apertura y cierre para la vista de agenda</p>
        </div>
        <div class="px-6 py-4">
          <div class="space-y-4 max-w-md">
            <div class="flex items-center space-x-4">
              <!-- Start Time -->
              <div class="flex-1 relative" ref="startTimeContainer">
                <label class="block text-sm font-medium text-secondary mb-2">Hora de Apertura</label>
                <button
                  type="button"
                  @click="toggleStartTimePicker"
                  class="w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-left flex items-center justify-between text-sm"
                >
                  <span>{{ adminSettings.startTime || 'Seleccionar hora' }}</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                
                <!-- Time Dropdown -->
                <div v-if="showStartTimePicker" ref="startTimeDropdown" class="absolute z-20 mt-1 bg-card border border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto" style="width: 150px;">
                  <div 
                    v-for="time in timeOptions" 
                    :key="time"
                    @click="selectStartTime(time)"
                    class="px-3 py-2 hover:bg-accent hover:text-black cursor-pointer text-sm text-primary transition-colors"
                    :class="{ 'bg-accent text-black': adminSettings.startTime === time }"
                  >
                    {{ time }}
                  </div>
                </div>
              </div>
              
              <!-- End Time -->
              <div class="flex-1 relative" ref="endTimeContainer">
                <label class="block text-sm font-medium text-secondary mb-2">Hora de Cierre</label>
                <button
                  type="button"
                  @click="toggleEndTimePicker"
                  class="w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-left flex items-center justify-between text-sm"
                >
                  <span>{{ adminSettings.endTime || 'Seleccionar hora' }}</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                
                <!-- Time Dropdown -->
                <div v-if="showEndTimePicker" ref="endTimeDropdown" class="absolute z-20 mt-1 bg-card border border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto" style="width: 150px;">
                  <div 
                    v-for="time in timeOptions" 
                    :key="time"
                    @click="selectEndTime(time)"
                    class="px-3 py-2 hover:bg-accent hover:text-black cursor-pointer text-sm text-primary transition-colors"
                    :class="{ 'bg-accent text-black': adminSettings.endTime === time }"
                  >
                    {{ time }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Save button for establishment hours -->
            <div class="mt-6 pt-4 border-t border-gray-600">
              <button 
                type="button"
                @click="saveEstablishmentHours"
                :disabled="saving"
                class="px-6 py-2 text-sm font-medium text-black bg-accent border border-transparent rounded-md hover:bg-accent/80 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all duration-200"
              >
                {{ saving ? 'Guardando...' : 'Guardar Horarios' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Admin Settings -->
      <div v-if="isAdmin" class="bg-card shadow-lg rounded-lg border border-gray-600">
        <div class="px-6 py-4 border-b border-gray-600">
          <h3 class="text-lg font-semibold text-primary">Personaliza el título y logo de la plataforma</h3>
          <p class="text-sm text-secondary mt-1">Configura el nombre y logo que aparecerán en toda la aplicación</p>
        </div>
        <div class="px-6 py-4">
          <div class="space-y-6 max-w-md">
            <!-- Platform Title -->
            <div>
              <label class="block text-sm font-medium text-secondary mb-2">Título de la Plataforma</label>
              <div class="relative">
                <input 
                  type="text" 
                  v-model="adminSettings.platformTitle"
                  :maxlength="platformTitleMaxLength"
                  placeholder="Ej: Mi Centro de Tenis"
                  :class="[
                    'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-accent',
                    titleCharactersLeft < 5 ? 'border-red-400 bg-red-900/10 text-primary' : 'border-gray-600 bg-hover text-primary'
                  ]"
                >
                <!-- Character counter -->
                <div class="absolute -bottom-6 right-0 text-xs" :class="titleCharactersLeft < 5 ? 'text-red-400' : 'text-secondary'">
                  {{ titleCharactersLeft }} caracteres restantes
                </div>
              </div>
              <p class="text-xs text-secondary mt-2 mb-2">Máximo {{ platformTitleMaxLength }} caracteres para que se lea completamente en el menú</p>
            </div>

            <!-- Platform Logo -->
            <div>
              <label class="block text-sm font-medium text-secondary mb-2">Logo de la Plataforma</label>
              <p class="text-xs text-secondary mb-2">Imagen máximo 500KB, se mostrará en círculo al lado del título</p>
              
              <div class="flex items-center space-x-4">
                <!-- Current logo preview -->
                <div v-if="adminSettings.platformLogo" class="w-12 h-12 rounded-full border border-gray-600 overflow-hidden">
                  <img 
                    :src="adminSettings.platformLogo" 
                    alt="Platform Logo" 
                    class="w-full h-full object-cover"
                  >
                </div>
                <div v-else class="w-12 h-12 rounded-full border border-gray-600 bg-hover flex items-center justify-center">
                  <svg class="h-6 w-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                
                <!-- File input -->
                <input 
                  type="file" 
                  ref="logoFileInput"
                  @change="handleLogoUpload"
                  accept="image/*"
                  class="hidden"
                >
                <button
                  type="button"
                  @click="$refs.logoFileInput.click()"
                  class="px-3 py-2 text-sm font-medium text-secondary bg-card border border-gray-600 rounded-md hover:bg-hover hover:text-primary hover:scale-105 focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
                >
                  Subir Logo
                </button>
                <button
                  v-if="adminSettings.platformLogo"
                  type="button"
                  @click="removeLogo"
                  class="px-3 py-2 text-sm font-medium text-red-400 bg-card border border-red-400 rounded-md hover:bg-red-900/20 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-200"
                >
                  Eliminar
                </button>
              </div>
            </div>
            
            <!-- Save button for admin settings -->
            <div class="mt-6 pt-4 border-t border-gray-600">
              <button 
                type="button"
                @click="saveAllSettings"
                :disabled="saving"
                class="px-6 py-2 text-sm font-medium text-black bg-accent border border-transparent rounded-md hover:bg-accent/80 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all duration-200"
              >
                {{ saving ? 'Guardando...' : 'Guardar Configuración' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Language Selection -->
      <div class="bg-card shadow-lg rounded-lg border border-gray-600">
        <div class="px-6 py-4 border-b border-gray-600">
          <h3 class="text-lg font-semibold text-primary">Idioma</h3>
          <p class="text-sm text-secondary mt-1">Cambia el idioma de la plataforma</p>
        </div>
        <div class="px-6 py-4">
          <LanguageSwitcher />
        </div>
      </div>

      <!-- Password Change -->
      <div class="bg-card shadow-lg rounded-lg border border-gray-600">
        <div class="px-6 py-4 border-b border-gray-600">
          <h3 class="text-lg font-semibold text-primary">Cambiar Contraseña</h3>
          <p class="text-sm text-secondary mt-1">Actualiza tu contraseña de acceso</p>
        </div>
        <div class="px-6 py-4">
          <form @submit.prevent="changePassword" class="space-y-4 max-w-md">
            <div>
              <label class="block text-sm font-medium text-secondary mb-2">Contraseña Actual</label>
              <input 
                type="password" 
                v-model="passwordForm.currentPassword" 
                required 
                class="w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-secondary mb-2">Nueva Contraseña</label>
              <input 
                type="password" 
                v-model="passwordForm.newPassword" 
                required 
                minlength="6"
                class="w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
            </div>
            <div>
              <label class="block text-sm font-medium text-secondary mb-2">Confirmar Nueva Contraseña</label>
              <input 
                type="password" 
                v-model="passwordForm.confirmPassword" 
                required 
                minlength="6"
                class="w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
            </div>
            <button 
              type="submit"
              :disabled="passwordSaving"
              class="px-4 py-2 text-sm font-medium text-black bg-accent border border-transparent rounded-md hover:bg-accent/80 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-all duration-200"
            >
              {{ passwordSaving ? 'Guardando...' : 'Cambiar Contraseña' }}
            </button>
          </form>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, onBeforeUnmount } from 'vue'
import { useI18n } from '../../i18n/composable'
import { apiClient } from '../../utils/api.js'
import LanguageSwitcher from '../layout/LanguageSwitcher.vue'

const { t } = useI18n()

// Get user role from localStorage (client-side only)
const getUserRole = () => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return ''
  }
  
  try {
    const user = localStorage.getItem('user')
    if (user) {
      const userData = JSON.parse(user)
      return userData.role || ''
    }
  } catch (error) {
    console.error('Error getting user role:', error)
  }
  return ''
}

// Reactive data
const error = ref('')
const successMessage = ref('')
const saving = ref(false)
const passwordSaving = ref(false)
const selectedAvatar = ref('')
const currentUser = ref(null)
const userRole = ref('')

// Time picker states
const showStartTimePicker = ref(false)
const showEndTimePicker = ref(false)

// Template refs for time dropdowns
const startTimeDropdown = ref(null)
const endTimeDropdown = ref(null)
const startTimeContainer = ref(null)
const endTimeContainer = ref(null)


// Password form
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Admin settings
const adminSettings = ref({
  platformTitle: '',
  platformLogo: '',
  startTime: '',
  endTime: ''
})

// Platform title limits
const platformTitleMaxLength = 18 // Optimal length for menu display

// Computed
const isAdmin = computed(() => userRole.value === 'admin')

const titleCharactersLeft = computed(() => {
  return platformTitleMaxLength - (adminSettings.value.platformTitle?.length || 0)
})

// Time options for time picker (24h format, 30-minute intervals)
const timeOptions = computed(() => {
  const times = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      times.push(timeString)
    }
  }
  // Add 23:59 as the last available time for establishments that close at midnight
  times.push('23:59')
  return times
})

// Methods
const clearMessages = () => {
  error.value = ''
  successMessage.value = ''
}


const fetchCurrentUser = async () => {
  try {
    const response = await apiClient.getCurrentUser()
    currentUser.value = response.user || response
    selectedAvatar.value = currentUser.value.avatar || ''
  } catch (error) {
    console.error('Error fetching current user:', error)
    // Fallback to localStorage (client-side only)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const user = localStorage.getItem('user')
        if (user) {
          currentUser.value = JSON.parse(user)
          selectedAvatar.value = currentUser.value.avatar || ''
        }
      } catch (e) {
        console.error('Error parsing user from localStorage:', e)
      }
    }
  }
}

const fetchPlatformSettings = async () => {
  if (!isAdmin.value) return
  
  try {
    const response = await apiClient.getPlatformSettingsAdmin()
    console.log('DEBUG - Platform settings response:', response)
    
    // Handle time format conversion (remove seconds if present)
    const startTime = response.start_time ? response.start_time.split(':').slice(0, 2).join(':') : '08:00'
    const endTime = response.end_time ? response.end_time.split(':').slice(0, 2).join(':') : '22:00'
    
    adminSettings.value = {
      platformTitle: response.platform_title || 'Alquiler de Canchas',
      platformLogo: response.platform_logo || '',
      startTime: startTime,
      endTime: endTime
    }
    
    console.log('DEBUG - AdminSettings after fetch:', JSON.stringify(adminSettings.value, null, 2))
  } catch (error) {
    console.error('Error fetching platform settings:', error)
    // Set default values on error
    adminSettings.value = {
      platformTitle: 'Alquiler de Canchas',
      platformLogo: '',
      startTime: '08:00',
      endTime: '22:00'
    }
  }
}


const changePassword = async () => {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    error.value = 'Las contraseñas no coinciden'
    return
  }
  
  passwordSaving.value = true
  clearMessages()
  
  try {
    await apiClient.changePassword({
      current_password: passwordForm.value.currentPassword,
      new_password: passwordForm.value.newPassword
    })
    
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
    
    successMessage.value = 'Contraseña cambiada exitosamente'
  } catch (err) {
    error.value = err.message || 'Error al cambiar la contraseña'
  } finally {
    passwordSaving.value = false
  }
}

const saveAdminSettings = async () => {
  if (!isAdmin.value) return true
  
  try {
    console.log('Saving admin settings:', adminSettings.value)
    
    // Validate time range
    if (adminSettings.value.startTime && adminSettings.value.endTime) {
      const [startHour, startMinute] = adminSettings.value.startTime.split(':').map(Number)
      const [endHour, endMinute] = adminSettings.value.endTime.split(':').map(Number)
      
      const startTimeMinutes = startHour * 60 + startMinute
      const endTimeMinutes = endHour * 60 + endMinute
      
      if (endTimeMinutes <= startTimeMinutes) {
        error.value = 'La hora de cierre debe ser posterior a la hora de apertura'
        return false
      }
    }
    
    await apiClient.updatePlatformSettings({
      platformTitle: adminSettings.value.platformTitle,
      platformLogo: adminSettings.value.platformLogo,
      startTime: adminSettings.value.startTime,
      endTime: adminSettings.value.endTime
    })
    
    // Trigger storage event for platform settings (client-side only)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'platformSettings',
        newValue: JSON.stringify({
          platform_title: adminSettings.value.platformTitle,
          platform_logo: adminSettings.value.platformLogo,
          start_time: adminSettings.value.startTime,
          end_time: adminSettings.value.endTime
        })
      }))
    }
    
    return true
  } catch (err) {
    console.error('Error updating admin settings:', err)
    return false
  }
}

const saveAllSettings = async () => {
  if (!isAdmin.value) {
    error.value = 'Solo los administradores pueden cambiar la configuración de la plataforma'
    return
  }
  
  // Validate platform title length
  if (adminSettings.value.platformTitle && adminSettings.value.platformTitle.length > platformTitleMaxLength) {
    error.value = `El título debe tener máximo ${platformTitleMaxLength} caracteres`
    return
  }
  
  saving.value = true
  clearMessages()
  
  try {
    const adminResult = await saveAdminSettings()
    
    if (adminResult) {
      successMessage.value = 'Configuración de plataforma guardada exitosamente'
      
      // Reload to show changes everywhere
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } else {
      error.value = 'Error al guardar la configuración de plataforma'
    }
  } catch (err) {
    error.value = 'Error al guardar la configuración'
  } finally {
    saving.value = false
  }
}

const handleLogoUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  // Validate file size (max 800KB for original file)
  if (file.size > 800 * 1024) {
    error.value = 'El archivo es muy grande. Máximo 800KB permitido'
    return
  }
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    error.value = 'Solo se permiten archivos de imagen'
    return
  }
  
  // Convert to base64 for storage
  const reader = new FileReader()
  reader.onload = (e) => {
    adminSettings.value.platformLogo = e.target.result
    clearMessages()
  }
  reader.readAsDataURL(file)
}

const removeLogo = () => {
  adminSettings.value.platformLogo = ''
  clearMessages()
}

// Time picker functions
const toggleStartTimePicker = () => {
  showStartTimePicker.value = !showStartTimePicker.value
  showEndTimePicker.value = false // Close end time picker if open
  
  // If opening and there's a selected time, scroll to it
  if (showStartTimePicker.value && adminSettings.value.startTime) {
    setTimeout(() => scrollToSelectedTime('start', adminSettings.value.startTime), 50)
  }
}

const toggleEndTimePicker = () => {
  showEndTimePicker.value = !showEndTimePicker.value
  showStartTimePicker.value = false // Close start time picker if open
  
  // If opening and there's a selected time, scroll to it
  if (showEndTimePicker.value && adminSettings.value.endTime) {
    setTimeout(() => scrollToSelectedTime('end', adminSettings.value.endTime), 50)
  }
}

const selectStartTime = (time) => {
  adminSettings.value.startTime = time
  showStartTimePicker.value = false
}

const selectEndTime = (time) => {
  adminSettings.value.endTime = time
  showEndTimePicker.value = false
}

// Scroll to selected time in dropdown
const scrollToSelectedTime = async (type, time) => {
  await nextTick()
  const dropdownRef = type === 'start' ? startTimeDropdown : endTimeDropdown
  if (dropdownRef.value) {
    const timeElements = dropdownRef.value.children
    for (let i = 0; i < timeElements.length; i++) {
      if (timeElements[i].textContent.trim() === time) {
        const element = timeElements[i]
        const dropdown = dropdownRef.value
        
        // Calculate position to center the selected element in the dropdown
        const elementTop = element.offsetTop
        const elementHeight = element.offsetHeight
        const dropdownHeight = dropdown.clientHeight
        
        // Center the element in the dropdown
        const scrollTop = elementTop - (dropdownHeight / 2) + (elementHeight / 2)
        dropdown.scrollTop = Math.max(0, scrollTop)
        break
      }
    }
  }
}

// Save establishment hours
const saveEstablishmentHours = async () => {
  if (!isAdmin.value) {
    error.value = 'Solo los administradores pueden cambiar los horarios del establecimiento'
    return
  }
  
  console.log('DEBUG - adminSettings before validation:', JSON.stringify(adminSettings.value, null, 2))
  
  // Validate that both times are selected
  if (!adminSettings.value.startTime || !adminSettings.value.endTime || 
      adminSettings.value.startTime.trim() === '' || adminSettings.value.endTime.trim() === '') {
    error.value = 'Debe seleccionar tanto la hora de apertura como la hora de cierre'
    return
  }
  
  // Validate time range
  const [startHour, startMinute] = adminSettings.value.startTime.split(':').map(Number)
  const [endHour, endMinute] = adminSettings.value.endTime.split(':').map(Number)
  
  const startTimeMinutes = startHour * 60 + startMinute
  const endTimeMinutes = endHour * 60 + endMinute
  
  if (endTimeMinutes <= startTimeMinutes) {
    error.value = 'La hora de cierre debe ser posterior a la hora de apertura'
    return
  }
  
  saving.value = true
  clearMessages()
  
  try {
    console.log('Sending platform settings:', {
      startTime: adminSettings.value.startTime,
      endTime: adminSettings.value.endTime,
      startTimeType: typeof adminSettings.value.startTime,
      endTimeType: typeof adminSettings.value.endTime
    })
    
    // For establishment hours, always send both times
    const updateData = {
      platformTitle: adminSettings.value.platformTitle || 'Alquiler de Canchas',
      platformLogo: adminSettings.value.platformLogo || '',
      startTime: adminSettings.value.startTime,
      endTime: adminSettings.value.endTime
    }
    
    console.log('Final update data:', updateData)
    
    await apiClient.updatePlatformSettings(updateData)
    
    successMessage.value = 'Horarios del establecimiento guardados exitosamente'
    
    // Auto-clear success message after 3 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
    
  } catch (err) {
    console.error('Error saving establishment hours:', err)
    error.value = 'Error al guardar los horarios del establecimiento'
  } finally {
    saving.value = false
  }
}

// Handle clicks outside time pickers to close them
const handleClickOutside = (event) => {
  if (showStartTimePicker.value) {
    const target = event.target
    if (!startTimeContainer.value?.contains(target)) {
      showStartTimePicker.value = false
    }
  }
  
  if (showEndTimePicker.value) {
    const target = event.target
    if (!endTimeContainer.value?.contains(target)) {
      showEndTimePicker.value = false
    }
  }
}

// Initialize data on component mount
onMounted(() => {
  // Set user role from localStorage (now safe to use)
  userRole.value = getUserRole()
  
  fetchCurrentUser()
  fetchPlatformSettings()
  
  // Add click outside listener for time pickers
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  // Remove click outside listener
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* Additional styles if needed */
</style>