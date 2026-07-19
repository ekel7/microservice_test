<template>
  <nav class="bg-primary shadow-lg border-b border-gray-600">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center space-x-8">
          <span class="text-xl font-semibold text-primary">
            Admin Panel
          </span>
          <div class="flex space-x-4">
            <button 
              v-for="item in navigationItems" 
              :key="item.key"
              @click="$emit('tab-changed', item.key)"
              :class="getNavClasses(item.key)"
            >
              {{ t(item.translationKey) }}
            </button>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <LanguageSwitcher />
          <button 
            @click="logout"
            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {{ t('nav.logout') }}
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from '../../i18n/composable'
import LanguageSwitcher from '../layout/LanguageSwitcher.vue'

// Props
const props = defineProps({
  currentPage: {
    type: String,
    default: 'overview'
  }
})

// Emits
const emit = defineEmits(['tab-changed'])

// Composables
const { t } = useI18n()

// Reactive data
const userName = ref('')

// Navigation items configuration
const navigationItems = [
  { key: 'overview', translationKey: 'admin.tabs.overview' },
  { key: 'accounts', translationKey: 'admin.tabs.accounts' },
  { key: 'users', translationKey: 'admin.tabs.users' },
  { key: 'payments', translationKey: 'admin.tabs.payments' },
  { key: 'logs', translationKey: 'admin.tabs.logs' }
]

// Computed styles for navigation items
const getNavClasses = (itemKey) => {
  return props.currentPage === itemKey 
    ? 'bg-accent text-black px-3 py-2 rounded-md text-sm font-medium border-none cursor-pointer'
    : 'text-secondary hover:text-accent px-3 py-2 rounded-md text-sm font-medium border-none cursor-pointer bg-transparent'
}

// Authentication and user management
const checkAuth = () => {
  const token = localStorage.getItem('admin_token')
  const user = localStorage.getItem('admin_user')
  
  if (!token || !user) {
    window.location.href = '/admin-login'
    return false
  }
  
  try {
    const userData = JSON.parse(user)
    userName.value = userData.full_name || userData.email || ''
    return true
  } catch (error) {
    console.error('Error parsing user data:', error)
    window.location.href = '/admin-login'
    return false
  }
}

const logout = () => {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
  window.location.href = '/admin-login'
}

// Lifecycle
onMounted(() => {
  checkAuth()
})
</script>
