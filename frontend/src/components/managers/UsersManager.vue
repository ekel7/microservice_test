<template>
  <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <div class="bg-card shadow rounded-lg mb-6 border border-gray-600">
      <div class="px-4 py-5 sm:p-6">
        <!-- Title - Hidden on mobile, shown on desktop inside card -->
        <div class="mb-6 hidden lg:block">
          <h1 class="text-3xl font-bold text-primary">{{ t('users.management') }}</h1>
          <p class="mt-2 text-secondary">{{ t('users.subtitle') }}</p>
        </div>

        <div class="flex justify-end items-center mb-4">
          <button 
            @click="openUserModal()"
            class="bg-accent hover:bg-lime-300 hover:scale-105 text-black px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
          >
            {{ t('users.addNewUser') }}
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
          <p class="mt-2 text-secondary">{{ t('users.loading') }}</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-900/30 border border-red-600 rounded-md p-4 mb-4">
          <p class="text-red-300">{{ error }}</p>
          <button @click="loadUsers" class="mt-2 text-red-400 hover:text-red-300 hover:scale-105 text-sm transition-all duration-200">
            {{ t('users.tryAgain') }}
          </button>
        </div>

        <!-- Users List -->
        <div v-else-if="users.length > 0" class="space-y-4">
          <div 
            v-for="user in users" 
            :key="user.id"
            class="border border-gray-600 rounded-lg p-4 hover:bg-hover"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3 class="text-lg font-medium text-primary">{{ user.full_name }}</h3>
                <p class="text-sm text-secondary">{{ t('common.email') }}: {{ user.email }}</p>
                <p class="text-sm text-secondary">{{ t('users.role') }}: {{ t(`users.${user.role}`) }}</p>
              </div>
              <div class="flex items-center space-x-2">
                <button 
                  @click="openUserModal(user)"
                  class="text-accent hover:text-lime-300 hover:scale-105 text-sm font-medium transition-all duration-200"
                >
                  {{ t('common.edit') }}
                </button>
                <button 
                  v-if="currentUser && user.id !== currentUser.id"
                  @click="deleteUserConfirm(user)"
                  class="text-red-400 hover:text-red-300 hover:scale-105 text-sm font-medium transition-all duration-200"
                >
                  {{ t('common.delete') }}
                </button>
                <span 
                  v-else-if="currentUser && user.id === currentUser.id"
                  class="text-secondary text-sm font-medium"
                >
                  {{ t('users.cannotDeleteSelf') }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 class="mt-2 text-lg font-medium text-primary">{{ t('users.noData') }}</h3>
          <p class="mt-1 text-secondary">{{ t('users.getStarted') }}</p>
        </div>
      </div>
    </div>

    <!-- Add/Edit User Modal -->
    <div 
      v-if="showModal"
      class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-8 p-4"
      @click.self="closeUserModal"
    >
      <div class="relative mx-auto border border-gray-600 shadow-lg rounded-xl bg-card max-h-[90vh] overflow-y-auto" style="width: 480px;">
        <div class="p-5">
          <h3 class="text-lg font-medium text-primary mb-4">
            {{ editingUser ? t('users.editUser') : t('users.addNewUser') }}
          </h3>
          <form @submit.prevent="saveUser">
            <div class="mb-4">
              <label class="block text-sm font-medium text-secondary mb-2">{{ t('common.email') }}</label>
              <input 
                type="email" 
                v-model="userForm.email" 
                required 
                class="w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              >
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-secondary mb-2">{{ t('users.fullName') }}</label>
              <input 
                type="text" 
                v-model="userForm.full_name" 
                required 
                class="w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              >
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-secondary mb-2">{{ t('users.role') }}</label>
              <select 
                v-model="userForm.role" 
                required 
                class="w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              >
                <option value="">{{ t('users.selectRole') }}</option>
                <option value="admin">{{ t('users.admin') }}</option>
                <option value="employee">{{ t('users.employee') }}</option>
              </select>
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-secondary mb-2">
                {{ editingUser ? t('users.newPassword') : t('users.password') }}
              </label>
              <input 
                type="password" 
                v-model="userForm.password" 
                :required="!editingUser"
                :placeholder="editingUser ? t('users.passwordPlaceholder') : ''"
                class="w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              >
              <p v-if="editingUser" class="text-xs text-secondary mt-1">
                {{ t('users.passwordHint') }}
              </p>
            </div>
            <div class="flex justify-end space-x-3">
              <button 
                type="button" 
                @click="closeUserModal"
                class="px-4 py-2 text-sm font-medium text-secondary bg-hover border border-gray-600 rounded-md hover:bg-gray-600 hover:scale-105 transition-all duration-200"
              >
                {{ t('common.cancel') }}
              </button>
              <button 
                type="submit"
                :disabled="saving"
                class="px-4 py-2 text-sm font-medium text-black bg-accent border border-transparent rounded-md hover:bg-lime-300 hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 transition-all duration-200"
              >
                {{ saving ? t('users.saving') : (editingUser ? t('users.updateUser') : t('users.addUser')) }}
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

const users = ref([])
const loading = ref(false)
const error = ref('')
const showModal = ref(false)
const editingUser = ref(null)
const saving = ref(false)
const currentUser = ref(null)

const userForm = ref({
  email: '',
  full_name: '',
  role: '',
  password: ''
})

const loadCurrentUser = async () => {
  try {
    const response = await apiClient.getCurrentUser()
    currentUser.value = response.user
    
    // Redirect employees away from this page
    if (currentUser.value && currentUser.value.role === 'employee') {
      window.location.href = '/dashboard'
      return
    }
  } catch (err) {
    console.error('Error loading current user:', err)
  }
}

const loadUsers = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const response = await apiClient.getUsers()
    users.value = response.data || response
  } catch (err) {
    error.value = err.message || t('users.errorLoadFailed')
    console.error('Error loading users:', err)
  } finally {
    loading.value = false
  }
}

const openUserModal = (user = null) => {
  if (user) {
    // Edit mode
    editingUser.value = user
    userForm.value = {
      email: user.email || '',
      full_name: user.full_name || '',
      role: user.role || '',
      password: '' // Always empty for editing
    }
  } else {
    // Add mode
    editingUser.value = null
    userForm.value = {
      email: '',
      full_name: '',
      role: '',
      password: ''
    }
  }
  
  showModal.value = true
}

const closeUserModal = () => {
  showModal.value = false
  editingUser.value = null
  userForm.value = {
    email: '',
    full_name: '',
    role: '',
    password: ''
  }
}

const saveUser = async () => {
  saving.value = true
  
  try {
    const userData = {
      email: userForm.value.email,
      full_name: userForm.value.full_name,
      role: userForm.value.role
    }

    // Add password if provided
    if (userForm.value.password) {
      userData.password = userForm.value.password
    }

    if (editingUser.value) {
      // For editing, only send password if it's provided (reset password)
      await apiClient.updateUser(editingUser.value.id, userData)
    } else {
      // For creating, password is required
      if (!userForm.value.password) {
        throw new Error('Password is required for new users')
      }
      await apiClient.createUser(userData)
    }
    
    closeUserModal()
    loadUsers()
  } catch (err) {
    error.value = err.message || t('users.errorSaveFailed')
    console.error('Error saving user:', err)
  } finally {
    saving.value = false
  }
}

const deleteUserConfirm = (user) => {
  if (confirm(t('users.deleteConfirm', { name: user.full_name }))) {
    deleteUser(user.id)
  }
}

const deleteUser = async (id) => {
  try {
    await apiClient.deleteUser(id)
    loadUsers()
  } catch (err) {
    error.value = err.message || t('users.errorDeleteFailed')
    console.error('Error deleting user:', err)
  }
}

// ESC key handling
const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    if (showModal.value) {
      closeUserModal()
      event.preventDefault()
      event.stopPropagation()
    }
  }
}

onMounted(async () => {
  await loadCurrentUser()
  loadUsers()
  // Add ESC key listener
  document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  // Clean up event listener
  document.removeEventListener('keydown', handleKeyDown)
})
</script>
