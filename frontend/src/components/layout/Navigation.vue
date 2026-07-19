<template>
  <!-- Mobile top bar with title -->
  <div class="lg:hidden fixed top-0 left-0 right-0 z-40 bg-primary border-b border-gray-600">
    <div class="px-4 py-3 flex items-center">
      <button 
        @click="toggleMobileMenu"
        class="text-primary hover:text-accent p-1 rounded-md transition-colors cursor-pointer mr-3"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path v-if="!showMobileMenu" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div class="flex items-center">
        <h1 class="text-lg font-semibold text-primary">{{ currentPageTitle }}</h1>
      </div>
    </div>
    <!-- Subtitle section -->
    <div v-if="currentPageSubtitle" class="px-4 pb-3">
      <p class="text-sm text-secondary">{{ currentPageSubtitle }}</p>
    </div>
  </div>

  <!-- Mobile overlay/backdrop -->
  <div 
    v-if="showMobileMenu && !isDesktop"
    @click="closeMobileMenu"
    class="fixed inset-0 backdrop-blur-lg z-40"
  ></div>

  <!-- Slide-out menu -->
  <div 
    v-if="showMobileMenu || isDesktop" 
    class="fixed top-0 left-0 z-50 h-full"
  >
    <!-- Menu panel -->
    <div 
      class="h-full bg-primary shadow-xl transform transition-all duration-300 ease-out border-r border-gray-600"
      :class="[
        showMobileMenu || isDesktop ? 'translate-x-0' : '-translate-x-full',
        getMenuWidth()
      ]"
      @transitionend="onMenuTransitionEnd"
      style="overflow: visible;"
    >
      <div class="flex flex-col h-full">
        <!-- Menu header with title -->
        <div class="p-4 border-b border-gray-600">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 rounded-full overflow-hidden border border-gray-600 flex items-center justify-center bg-gray-700 ml-2">
                <!-- Logo or fallback icon -->
                <img 
                  v-if="platformLogo"
                  :src="platformLogo" 
                  alt="Platform Logo" 
                  class="w-full h-full object-cover"
                >
                <!-- Tennis ball icon fallback -->
                <svg v-else class="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                  <path d="M2 12c0 2.2.7 4.2 2 6 1.3-1.8 2-4 2-6s-.7-4.2-2-6c-1.3 1.8-2 3.8-2 6z" fill="currentColor"/>
                  <path d="M22 12c0-2.2-.7-4.2-2-6-1.3 1.8-2 4-2 6s.7 4.2 2 6c1.3-1.8 2-3.8 2-6z" fill="currentColor"/>
                </svg>
              </div>
              <div v-if="!isDesktopCollapsed" class="flex-1 min-w-0 transition-all duration-300 ease-out">
                <div class="flex items-center flex-1 min-w-0 ml-3">
                  <div class="flex-1 min-w-0">
                    <!-- Title -->
                    <a 
                      href="/dashboard" 
                      class="text-xl font-bold text-primary hover:text-accent transition-colors cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis block"
                    >
                      {{ platformTitle || t('login.title') }}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Toggle button positioned on the border -->
        <div v-if="isDesktop" class="relative overflow-visible">
          <button
            @click="toggleDesktopMenu"
            class="absolute -right-4 -top-4 w-8 h-8 bg-accent hover:bg-accent/80 border-2 border-primary rounded-full flex items-center justify-center text-black hover:text-black transition-all duration-200 cursor-pointer shadow-xl z-50"
            :title="isDesktopExpanded ? 'Contraer menú' : 'Expandir menú'"
            style="overflow: visible;"
          >
            <!-- ChatGPT-style toggle icon -->
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
              <path v-if="isDesktopExpanded" stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path>
              <path v-else stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </div>
        
        <!-- Navigation items -->
        <div class="flex-1 py-6">
          <nav class="space-y-2 px-4">
            <a 
              v-for="item in navigationItems" 
              :key="item.key"
              :href="item.href" 
              :class="getMobileNavClasses(item.key) + ' cursor-pointer'"
              @click="closeMobileMenu"
              :title="isDesktopCollapsed ? t(item.translationKey) : ''"
            >
              <div class="flex items-center transition-all duration-300 ease-out" :class="isDesktopCollapsed ? 'justify-center' : 'space-x-3'">
                <!-- Icons for each section -->
                <div class="flex-shrink-0 w-5 h-5 flex items-center justify-center" v-html="getIconSvg(item.key)"></div>
                <span v-if="!isDesktopCollapsed" class="transition-all duration-300 ease-out">{{ t(item.translationKey) }}</span>
              </div>
            </a>
          </nav>
        </div>
        
        <!-- Footer section with user actions -->
        <div class="border-t border-gray-600 p-4">
          <div class="space-y-2">
            <!-- User info -->
            <div class="text-sm px-3 py-2" :class="isDesktopCollapsed ? 'flex justify-center' : 'flex items-center justify-between'">
              <div class="flex items-center min-w-0" :class="isDesktopCollapsed ? 'justify-center' : 'space-x-2'">
                <!-- User avatar -->
                <div 
                  v-if="isDesktopCollapsed"
                  @click="goToSettings"
                  class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-accent hover:bg-accent/80 cursor-pointer transition-colors"
                  :title="t('nav.settings')"
                >
                  <span class="text-black font-semibold">{{ userAvatar || userName.charAt(0).toUpperCase() }}</span>
                </div>
                <div 
                  v-else
                  class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-accent"
                >
                  <span class="text-black font-semibold">{{ userAvatar || userName.charAt(0).toUpperCase() }}</span>
                </div>
                <!-- User name -->
                <div v-if="!isDesktopCollapsed" class="flex items-center flex-1 min-w-0 ml-3 transition-all duration-300 ease-out">
                  <div class="flex-1 min-w-0">
                    <span class="text-secondary whitespace-nowrap overflow-hidden text-ellipsis block transition-all duration-300 ease-out">{{ userName }}</span>
                  </div>
                </div>
              </div>
              <button 
                v-if="!isDesktopCollapsed"
                @click="openSettingsAndCloseMobile"
                class="text-secondary hover:text-accent hover:scale-105 p-1 rounded-md transition-all duration-200 cursor-pointer"
                :title="t('nav.settings')"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <hr class="border-gray-600">
            <button 
              @click="logout"
              class="text-red-400 hover:bg-red-900 hover:text-red-300 hover:scale-105 flex items-center px-4 py-3 text-base font-medium rounded-lg cursor-pointer w-full transition-all duration-200"
              :class="isDesktopCollapsed ? 'justify-center' : 'justify-start space-x-3'"
              :title="isDesktopCollapsed ? t('nav.logout') : ''"
            >
              <!-- Logout icon -->
              <div class="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
              </div>
              <!-- Logout text -->
              <div v-if="!isDesktopCollapsed" class="flex items-center min-w-0 ml-3 transition-all duration-300 ease-out">
                <div class="min-w-0">
                  <span class="whitespace-nowrap overflow-hidden text-ellipsis block transition-all duration-300 ease-out">{{ t('nav.logout') }}</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  
  <!-- Password Change Modal -->
  <PasswordChangeModal 
    :showModal="showPasswordModal"
    :isForced="isForced"
    @close="closePasswordChangeModal"
    @success="onPasswordChangeSuccess"
  />

</template>

<script setup>
import { ref, onMounted, computed, onBeforeUnmount, watch } from 'vue'
import { DateTime } from 'luxon'
import { useI18n } from '../../i18n/composable'
import { apiClient } from '../../utils/api.js'
import PasswordChangeModal from '../auth/PasswordChangeModal.vue'

// Props
const props = defineProps({
  currentPage: {
    type: String,
    default: ''
  }
})

// Composables
const { t } = useI18n()

// Reactive data
const userName = ref('')
const userRole = ref('')
const userAvatar = ref('')
const showUserMenu = ref(false)
const showPasswordModal = ref(false)
const isForced = ref(false)
const showMobileMenu = ref(false)
const platformTitle = ref('')
const platformLogo = ref('')
const dashboardSubtitleStorage = ref('')
const isDesktopExpanded = ref(false)

// Cache keys
const PLATFORM_CACHE_KEY = 'cachedPlatformSettings'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 horas en milliseconds

// Cache functions
const getCachedPlatformSettings = () => {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(PLATFORM_CACHE_KEY)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    const now = DateTime.now().toMillis()

    // Check if cache is still valid
    if (now - timestamp < CACHE_DURATION) {
      return data
    } else {
      // Cache expired, remove it
      localStorage.removeItem(PLATFORM_CACHE_KEY)
      return null
    }
  } catch (error) {
    console.error('Error reading platform settings cache:', error)
    return null
  }
}

const setCachedPlatformSettings = (data) => {
  if (typeof window === 'undefined') return

  try {
    const cacheData = {
      data,
      timestamp: DateTime.now().toMillis()
    }
    localStorage.setItem(PLATFORM_CACHE_KEY, JSON.stringify(cacheData))
  } catch (error) {
    console.error('Error saving platform settings cache:', error)
  }
}

// Loading states
const userLoading = ref(true)
const menuTransitionComplete = ref(false)

// Reactive desktop detection
const isDesktop = ref(false)

// Function to check if we're on desktop
const checkDesktop = () => {
  if (typeof window !== 'undefined') {
    isDesktop.value = window.innerWidth >= 1024
  }
}

// Update body class when desktop state changes
const updateBodyClass = () => {
  if (typeof document !== 'undefined') {
    if (isDesktop.value) {
      document.body.classList.add('sidebar-open')
    } else {
      document.body.classList.remove('sidebar-open')
    }
  }
}

// Base navigation items configuration
const allNavigationItems = [
  { translationKey: 'nav.dashboard', href: '/dashboard', key: 'dashboard' },
  { translationKey: 'nav.rentals', href: '/rentals', key: 'rentals' },
  { translationKey: 'nav.clients', href: '/clients', key: 'clients' },
  { translationKey: 'nav.courts', href: '/courts', key: 'courts' },
  { translationKey: 'nav.users', href: '/users', key: 'users', adminOnly: true }
]

// Function to get the correct SVG icon for each section
const getIconSvg = (key) => {
  const icons = {
    // Casa para Dashboard/Inicio
    dashboard: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
    </svg>`,
    // Agenda para Alquileres
    rentals: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
    </svg>`,
    // Múltiples personas para Clientes
    clients: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
    </svg>`,
    // Cancha de tenis para Canchas
    courts: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" stroke-width="2"/>
      <line x1="12" y1="4" x2="12" y2="20" stroke-width="1.5"/>
      <line x1="2" y1="12" x2="22" y2="12" stroke-width="1"/>
      <rect x="6" y="8" width="4" height="8" fill="none" stroke-width="1"/>
      <rect x="14" y="8" width="4" height="8" fill="none" stroke-width="1"/>
    </svg>`,
    // Persona individual para Usuarios
    users: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
    </svg>`
  }
  return icons[key] || icons.dashboard
}

// Computed navigation items based on user role
const navigationItems = computed(() => {
  return allNavigationItems.filter(item => {
    if (item.adminOnly) {
      return userRole.value === 'admin'
    }
    return true
  })
})

// Computed page title for mobile header
const currentPageTitle = computed(() => {
  const pageTitles = {
    dashboard: `¡${t('dashboard.welcome')}, ${userName.value.split(' ')[0]}!`, // "¡Bienvenido, Daniel!"
    rentals: t('rentals.management'),
    clients: t('clients.title'),
    courts: t('courts.title'),
    users: t('users.title'),
    settings: t('nav.setup') // Using setup as fallback for settings
  }
  
  // Return the specific page title, or fallback to platform title
  return pageTitles[props.currentPage] || platformTitle.value || t('login.title')
})

// Computed page subtitle for mobile header
const currentPageSubtitle = computed(() => {
  const pageSubtitles = {
    dashboard: getDashboardSubtitle(), // Dynamic subtitle based on weather
    rentals: t('rentals.managementSubtitle'),
    clients: t('clients.subtitle'),
    courts: t('courts.subtitle'),
    users: t('users.subtitle'),
    settings: t('setup.subtitle') // Using setup subtitle
  }
  
  return pageSubtitles[props.currentPage] || ''
})

// Function to get dashboard subtitle (simplified version)
const getDashboardSubtitle = () => {
  // Use reactive ref for localStorage value
  if (dashboardSubtitleStorage.value) {
    return dashboardSubtitleStorage.value
  }
  
  // Fallback to a general encouraging message
  return t('dashboard.subtitle.perfectWeather.tennis')
}

// Computed styles for navigation items
const getNavClasses = (itemKey) => {
  return props.currentPage === itemKey 
    ? 'bg-accent text-black px-3 py-2 rounded-md text-sm font-medium'
    : 'text-secondary hover:text-accent px-3 py-2 rounded-md text-sm font-medium'
}

// Computed styles for mobile navigation items
const getMobileNavClasses = (itemKey) => {
  return props.currentPage === itemKey 
    ? 'bg-accent text-black block px-4 py-3 text-base font-medium rounded-lg transition-colors'
    : 'text-secondary nav-hover block px-4 py-3 text-base font-medium rounded-lg'
}

// Authentication and user management
const checkAuth = () => {
  const token = localStorage.getItem('token')
  const user = localStorage.getItem('user')
  
  if (!token || !user) {
    window.location.href = '/login'
    return false
  }
  
  try {
    const userData = JSON.parse(user)
    
    // Set user data immediately for mobile, with minimal delay for desktop
    const delay = isDesktop.value ? 100 : 50
    setTimeout(() => {
      userName.value = userData.full_name || userData.email || ''
      userRole.value = userData.role || ''
      userAvatar.value = userData.avatar || ''
      userLoading.value = false
    }, delay)
    
    // Check if password change is forced
    if (userData.force_password_change) {
      isForced.value = true
      showPasswordModal.value = true
    }
    
    return true
  } catch (error) {
    console.error('Error parsing user data:', error)
    window.location.href = '/login'
    return false
  }
}

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

const goToSettings = () => {
  window.location.href = '/settings'
}

const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
  if (showMobileMenu.value) {
    menuTransitionComplete.value = false
  }
}

const closeMobileMenu = () => {
  showMobileMenu.value = false
}

// Handle menu transition end event
const onMenuTransitionEnd = () => {
  if (showMobileMenu.value || isDesktop.value) {
    menuTransitionComplete.value = true
  }
}

// Computed property to determine if menu should be collapsed in desktop
const isDesktopCollapsed = computed(() => {
  return isDesktop.value && !isDesktopExpanded.value
})

// Toggle desktop menu expansion
const toggleDesktopMenu = () => {
  if (isDesktop.value) {
    isDesktopExpanded.value = !isDesktopExpanded.value
    // Update body class for content adjustment
    if (typeof document !== 'undefined') {
      if (isDesktopExpanded.value) {
        document.body.classList.add('sidebar-expanded')
      } else {
        document.body.classList.remove('sidebar-expanded')
      }
    }
  }
}

// Get menu width based on state
const getMenuWidth = () => {
  if (!isDesktop.value) {
    return 'w-72 sm:w-80'
  }
  
  if (!isDesktopExpanded.value) {
    return 'w-20'
  }
  
  return 'w-72'
}

const openPasswordChangeModal = () => {
  showPasswordModal.value = true
  showUserMenu.value = false
}

const openSettingsAndCloseMobile = () => {
  closeMobileMenu()
  window.location.href = '/settings'
}

const closePasswordChangeModal = () => {
  if (!isForced.value) {
    showPasswordModal.value = false
  }
}

const onPasswordChangeSuccess = async () => {
  // If it was a forced password change, update the user data in localStorage
  if (isForced.value) {
    const user = localStorage.getItem('user')
    if (user) {
      try {
        const userData = JSON.parse(user)
        userData.force_password_change = false
        localStorage.setItem('user', JSON.stringify(userData))
      } catch (error) {
        console.error('Error updating user data:', error)
      }
    }
  }
  
  showPasswordModal.value = false
  isForced.value = false
}


const handleClickOutside = (event) => {
  if (showUserMenu.value && !event.target.closest('.relative')) {
    showUserMenu.value = false
  }
}

// Handle window resize
const handleResize = () => {
  checkDesktop()
}

// Load platform settings
const loadPlatformSettings = async () => {
  // Try to load from cache first
  const cachedData = getCachedPlatformSettings()
  
  if (cachedData) {
    // Use cached data immediately
    platformTitle.value = cachedData.platform_title || ''
    platformLogo.value = cachedData.platform_logo || ''
    
    // Still fetch fresh data in background to update cache
    try {
      const response = await apiClient.getPlatformSettings()
      const freshData = {
        platform_title: response.platform_title || '',
        platform_logo: response.platform_logo || ''
      }
      
      // Update cache with fresh data
      setCachedPlatformSettings(freshData)
      
      // Update UI if data changed
      if (freshData.platform_title !== platformTitle.value || 
          freshData.platform_logo !== platformLogo.value) {
        platformTitle.value = freshData.platform_title
        platformLogo.value = freshData.platform_logo
      }
    } catch (error) {
      console.error('Error refreshing platform settings:', error)
      // Keep using cached data on error
    }
  } else {
    // No cache, load fresh data
    try {
      const response = await apiClient.getPlatformSettings()
      const freshData = {
        platform_title: response.platform_title || '',
        platform_logo: response.platform_logo || ''
      }
      
      // Set data immediately
      platformTitle.value = freshData.platform_title
      platformLogo.value = freshData.platform_logo
      
      // Save to cache
      setCachedPlatformSettings(freshData)
    } catch (error) {
      console.error('Error loading platform settings:', error)
      // Set default values on error
      platformTitle.value = ''
      platformLogo.value = ''
    }
  }
}


// Listen for storage changes to update avatar when changed in settings
const handleStorageChange = (event) => {
  if (event.key === 'user') {
    try {
      const userData = JSON.parse(event.newValue)
      userName.value = userData.full_name || userData.email || ''
      userRole.value = userData.role || ''
      userAvatar.value = userData.avatar || ''
    } catch (error) {
      console.error('Error parsing updated user data:', error)
    }
  }
  if (event.key === 'platformSettings') {
    try {
      const settings = JSON.parse(event.newValue)
      platformTitle.value = settings.platform_title || ''
      platformLogo.value = settings.platform_logo || ''
      
      // Update cache with new settings
      setCachedPlatformSettings({
        platform_title: settings.platform_title || '',
        platform_logo: settings.platform_logo || ''
      })
    } catch (error) {
      console.error('Error parsing platform settings:', error)
      loadPlatformSettings()
    }
  }
}

// Lifecycle
onMounted(() => {
  checkAuth()
  checkDesktop()
  updateBodyClass()
  loadPlatformSettings()
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', handleResize)
  window.addEventListener('storage', handleStorageChange)
  
  // Initialize dashboard subtitle from localStorage (safe for SSR)
  if (typeof window !== 'undefined' && window.localStorage) {
    dashboardSubtitleStorage.value = localStorage.getItem('dashboardSubtitle') || ''
  }
  
  // Set transition complete with optimized timing
  if (isDesktop.value) {
    setTimeout(() => {
      menuTransitionComplete.value = true
    }, 200) // Faster for desktop
  } else {
    // For mobile, set immediately to avoid skeleton loading
    setTimeout(() => {
      menuTransitionComplete.value = true
    }, 100)
  }
  
  // Listen for dashboard subtitle changes
  window.addEventListener('storage', (e) => {
    if (e.key === 'dashboardSubtitle') {
      // Update reactive ref
      dashboardSubtitleStorage.value = e.newValue || ''
    }
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('storage', handleStorageChange)
  // Clean up body classes
  if (typeof document !== 'undefined') {
    document.body.classList.remove('sidebar-open')
    document.body.classList.remove('sidebar-expanded')
  }
})

// Watch isDesktop changes
watch(isDesktop, () => {
  updateBodyClass()
})
</script>
