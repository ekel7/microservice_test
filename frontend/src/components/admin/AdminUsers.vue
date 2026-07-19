<template>
  <div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-3xl font-bold text-primary">{{ t('admin.users.title') }}</h2>
    </div>

    <div v-if="loading" class="flex justify-center items-center py-20">
      <p class="text-secondary text-lg">{{ t('admin.users.loading') }}</p>
    </div>

    <div v-else>
      <!-- Filters -->
      <div class="bg-card rounded-lg shadow-lg border border-gray-600 p-4 mb-6">
        <div class="flex flex-wrap gap-4 items-center">
          <select 
            v-model="accountFilter" 
            @change="loadUsers"
            class="px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          >
            <option value="">{{ t('admin.users.allAccounts') }}</option>
            <option 
              v-for="account in uniqueAccounts" 
              :key="account.id" 
              :value="account.id"
            >
              {{ account.name }}
            </option>
          </select>

          <select 
            v-model="roleFilter" 
            @change="applyFilters"
            class="px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          >
            <option value="">{{ t('admin.users.allRoles') }}</option>
            <option value="admin">{{ t('admin.users.admin') }}</option>
            <option value="employee">{{ t('admin.users.employee') }}</option>
          </select>

          <select 
            v-model="statusFilter" 
            @change="applyFilters"
            class="px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          >
            <option value="">{{ t('admin.users.allStatus') }}</option>
            <option value="true">{{ t('admin.users.active') }}</option>
            <option value="false">{{ t('admin.users.inactive') }}</option>
          </select>
          
          <input
            v-model="searchQuery"
            @input="debounceSearch"
            type="text"
            :placeholder="t('admin.users.searchPlaceholder')"
            class="flex-1 max-w-sm px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>
      </div>

      <!-- Users Table -->
      <div class="bg-card rounded-lg shadow-lg border border-gray-600 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-600">
            <thead class="bg-hover">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.users.name') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.users.email') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.users.account') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.users.role') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.users.status') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.users.created') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.users.actions') }}</th>
              </tr>
            </thead>
            <tbody class="bg-card divide-y divide-gray-600">
              <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-hover">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="font-medium text-primary">{{ user.full_name }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-secondary">{{ user.email }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-secondary">{{ user.accounts?.name }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="[
                    'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                    user.role === 'admin' ? 'bg-teal-900/30 text-teal-300' : 'bg-blue-900/30 text-blue-300'
                  ]">
                    {{ user.role }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="[
                    'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                    user.is_active ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
                  ]">
                    {{ user.is_active ? t('admin.users.active') : t('admin.users.inactive') }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                  <LocalizedDate :date="user.created_at" />
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex space-x-2">
                    <button 
                      @click="viewUser(user)"
                      class="p-2 text-secondary hover:text-primary border border-gray-600 rounded-md hover:bg-hover transition-colors"
                      :title="t('admin.users.viewDetails')"
                    >
                      ✏️
                    </button>
                    <button 
                      @click="resetPassword(user)"
                      class="p-2 text-yellow-400 hover:text-yellow-300 border border-gray-600 rounded-md hover:bg-yellow-900/20 transition-colors"
                      :title="t('admin.users.resetPassword')"
                    >
                      🔑
                    </button>
                    <button 
                      @click="toggleUserStatus(user)"
                      :class="[
                        'p-2 border border-gray-600 rounded-md transition-colors',
                        user.is_active 
                          ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                          : 'text-green-400 hover:text-green-300 hover:bg-green-900/20'
                      ]"
                      :title="user.is_active ? t('admin.users.deactivateUser') : t('admin.users.activateUser')"
                    >
                      {{ user.is_active ? '⏸️' : '▶️' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="filteredUsers.length === 0" class="text-center py-12">
            <p class="text-secondary">{{ t('admin.users.noUsers') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Reset Password Modal -->
    <div v-if="showResetModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" @click="closeResetModal">
      <div class="bg-card rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto border border-gray-600" @click.stop>
        <div class="flex justify-between items-center p-6 border-b border-gray-600">
          <h3 class="text-lg font-semibold text-primary">{{ t('admin.users.resetPassword') }}</h3>
          <button @click="closeResetModal" class="text-secondary hover:text-primary text-2xl leading-none">×</button>
        </div>
        
        <div class="p-6">
          <p class="text-secondary mb-6">{{ t('admin.users.resetPasswordFor') }} <strong class="text-primary">{{ selectedUser?.full_name }}</strong> ({{ selectedUser?.email }})?</p>
          
          <form @submit.prevent="confirmResetPassword" class="space-y-4">
            <div>
              <label for="new-password" class="block text-sm font-medium text-secondary mb-1">{{ t('admin.users.newPassword') }} *</label>
              <input
                id="new-password"
                v-model="newPassword"
                type="password"
                required
                minlength="6"
                :placeholder="t('admin.users.newPasswordPlaceholder')"
                class="w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </div>

            <div>
              <label for="confirm-password" class="block text-sm font-medium text-secondary mb-1">{{ t('admin.users.confirmPassword') }} *</label>
              <input
                id="confirm-password"
                v-model="confirmPassword"
                type="password"
                required
                :placeholder="t('admin.users.confirmPasswordPlaceholder')"
                class="w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button type="button" @click="closeResetModal" class="px-4 py-2 text-sm text-secondary bg-hover border border-gray-600 rounded-md hover:bg-card hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                {{ t('common.cancel') }}
              </button>
              <button type="submit" class="px-4 py-2 text-sm text-black bg-accent border border-transparent rounded-md hover:bg-accent/80 focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50" :disabled="loading">
                {{ t('admin.users.resetPassword') }}
              </button>
            </div>
          </form>

          <div v-if="resetError" class="mt-4 p-3 bg-red-900/30 border border-red-600 text-red-300 rounded-md text-sm">
            {{ resetError }}
          </div>

          <div v-if="resetSuccess" class="mt-4 p-3 bg-green-900/30 border border-green-600 text-green-300 rounded-md text-sm">
            {{ t('admin.users.passwordResetSuccess') }}
          </div>
        </div>
      </div>
    </div>

    <!-- User Details Modal -->
    <div v-if="showDetailsModal" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" @click="closeDetailsModal">
      <div class="bg-card rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto border border-gray-600" @click.stop>
        <div class="flex justify-between items-center p-6 border-b border-gray-600">
          <h3 class="text-lg font-semibold text-primary">{{ selectedUser?.full_name }} - {{ t('admin.users.userDetails') }}</h3>
          <button @click="closeDetailsModal" class="text-secondary hover:text-primary text-2xl leading-none">×</button>
        </div>
        
        <div class="p-6">
          <div class="mb-8">
            <h4 class="text-base font-semibold text-primary mb-4 pb-2 border-b border-gray-600">{{ t('admin.users.userInformation') }}</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex flex-col">
                <label class="text-sm font-medium text-secondary">{{ t('admin.users.fullName') }}:</label>
                <span class="text-primary">{{ selectedUser?.full_name }}</span>
              </div>
              <div class="flex flex-col">
                <label class="text-sm font-medium text-secondary">{{ t('admin.users.email') }}:</label>
                <span class="text-primary">{{ selectedUser?.email }}</span>
              </div>
              <div class="flex flex-col">
                <label class="text-sm font-medium text-secondary">{{ t('admin.users.role') }}:</label>
                <span :class="[
                  'inline-flex px-2 py-1 text-xs font-medium rounded-full w-fit',
                  selectedUser?.role === 'admin' ? 'bg-teal-900/30 text-teal-300' : 'bg-blue-900/30 text-blue-300'
                ]">
                  {{ selectedUser?.role }}
                </span>
              </div>
              <div class="flex flex-col">
                <label class="text-sm font-medium text-secondary">{{ t('admin.users.status') }}:</label>
                <span :class="[
                  'inline-flex px-2 py-1 text-xs font-medium rounded-full w-fit',
                  selectedUser?.is_active ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
                ]">
                  {{ selectedUser?.is_active ? t('admin.users.active') : t('admin.users.inactive') }}
                </span>
              </div>
              <div class="flex flex-col">
                <label class="text-sm font-medium text-secondary">{{ t('admin.users.phone') }}:</label>
                <span class="text-primary">{{ selectedUser?.phone || t('admin.users.na') }}</span>
              </div>
              <div class="flex flex-col">
                <label class="text-sm font-medium text-secondary">{{ t('admin.users.account') }}:</label>
                <span class="text-primary">{{ selectedUser?.accounts?.name }}</span>
              </div>
              <div class="flex flex-col">
                <label class="text-sm font-medium text-secondary">{{ t('admin.users.createdAt') }}:</label>
                <LocalizedDate :date="selectedUser?.created_at" format="datetime" />
              </div>
              <div class="flex flex-col">
                <label class="text-sm font-medium text-secondary">{{ t('admin.users.lastLoginAt') }}:</label>
                <LocalizedDate :date="selectedUser?.updated_at" format="datetime" />
              </div>
            </div>
          </div>

          <div class="mb-8">
            <h4 class="text-base font-semibold text-primary mb-4 pb-2 border-b border-gray-600">{{ t('admin.users.quickActions') }}</h4>
            <div class="space-y-3">
              <button 
                @click="changeRole(selectedUser)"
                class="w-full text-left p-3 border border-gray-600 rounded-md bg-hover hover:bg-card hover:text-primary text-secondary transition-colors"
              >
                {{ t('admin.users.changeRole') }} ({{ selectedUser?.role === 'admin' ? t('admin.users.makeEmployee') : t('admin.users.makeAdmin') }})
              </button>
              <button 
                @click="resetPasswordFromDetails(selectedUser)"
                class="w-full text-left p-3 border border-gray-600 rounded-md bg-hover hover:bg-card hover:text-primary text-secondary transition-colors"
              >
                {{ t('admin.users.resetPassword') }}
              </button>
              <button 
                @click="toggleUserStatusFromDetails(selectedUser)"
                :class="[
                  'w-full text-left p-3 border rounded-md transition-colors',
                  selectedUser?.is_active 
                    ? 'text-red-400 border-red-600 hover:bg-red-900/20' 
                    : 'text-green-400 border-green-600 hover:bg-green-900/20'
                ]"
              >
                {{ selectedUser?.is_active ? t('admin.users.deactivateUser') : t('admin.users.activateUser') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '../../i18n/composable'
import { adminApiClient } from '../../utils/adminApi.js'
import LocalizedDate from '../common/LocalizedDate.vue'

const { t } = useI18n()
const loading = ref(true)
const users = ref([])
const accountFilter = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
const searchQuery = ref('')
const showResetModal = ref(false)
const showDetailsModal = ref(false)
const selectedUser = ref(null)
const resetLoading = ref(false)
const resetError = ref('')
const resetSuccess = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')

let searchTimeout = null

onMounted(async () => {
  await loadUsers()
})

const uniqueAccounts = computed(() => {
  const accounts = users.value.map(user => user.accounts).filter(Boolean)
  const unique = accounts.reduce((acc, account) => {
    if (!acc.find(a => a.id === account.id)) {
      acc.push(account)
    }
    return acc
  }, [])
  return unique.sort((a, b) => a.name.localeCompare(b.name))
})

const filteredUsers = computed(() => {
  let filtered = users.value

  if (accountFilter.value) {
    filtered = filtered.filter(user => user.account_id === accountFilter.value)
  }

  if (roleFilter.value) {
    filtered = filtered.filter(user => user.role === roleFilter.value)
  }

  if (statusFilter.value) {
    const isActive = statusFilter.value === 'true'
    filtered = filtered.filter(user => user.is_active === isActive)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(user => 
      user.full_name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.accounts?.name.toLowerCase().includes(query)
    )
  }

  return filtered
})

const loadUsers = async () => {
  try {
    const filters = {}
    if (accountFilter.value) {
      filters.account_id = accountFilter.value
    }
    users.value = await adminApiClient.getUsers(filters)
  } catch (error) {
    console.error('Load users error:', error)
  } finally {
    loading.value = false
  }
}

const applyFilters = () => {
  // Filters are applied via computed property
}

const debounceSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    // Search is handled by computed property
  }, 300)
}

const viewUser = (user) => {
  selectedUser.value = user
  showDetailsModal.value = true
}

const resetPassword = (user) => {
  selectedUser.value = user
  showResetModal.value = true
  resetError.value = ''
  resetSuccess.value = false
  newPassword.value = ''
  confirmPassword.value = ''
}

const resetPasswordFromDetails = (user) => {
  closeDetailsModal()
  resetPassword(user)
}

const confirmResetPassword = async () => {
  if (newPassword.value !== confirmPassword.value) {
    resetError.value = 'Passwords do not match'
    return
  }

  if (newPassword.value.length < 6) {
    resetError.value = 'Password must be at least 6 characters long'
    return
  }

  resetLoading.value = true
  resetError.value = ''

  try {
    await adminApiClient.resetUserPassword(selectedUser.value.id, newPassword.value)
    resetSuccess.value = true
    setTimeout(() => {
      closeResetModal()
    }, 2000)
  } catch (error) {
    resetError.value = error.message
  } finally {
    resetLoading.value = false
  }
}

const toggleUserStatus = async (user) => {
  const newStatus = !user.is_active

  try {
    const updatedUser = await adminApiClient.updateUserStatus(user.id, newStatus)
    const index = users.value.findIndex(u => u.id === user.id)
    if (index !== -1) {
      users.value[index] = { ...users.value[index], ...updatedUser }
    }
    
    if (selectedUser.value && selectedUser.value.id === user.id) {
      selectedUser.value = { ...selectedUser.value, ...updatedUser }
    }
  } catch (error) {
    console.error('Failed to update user status:', error)
  }
}

const toggleUserStatusFromDetails = async (user) => {
  await toggleUserStatus(user)
}

const changeRole = async (user) => {
  const newRole = user.role === 'admin' ? 'employee' : 'admin'

  if (!confirm(`Change ${user.full_name}'s role to ${newRole}?`)) {
    return
  }

  try {
    const updatedUser = await adminApiClient.updateUserRole(user.id, newRole)
    const index = users.value.findIndex(u => u.id === user.id)
    if (index !== -1) {
      users.value[index] = { ...users.value[index], ...updatedUser }
    }
    
    if (selectedUser.value && selectedUser.value.id === user.id) {
      selectedUser.value = { ...selectedUser.value, ...updatedUser }
    }
  } catch (error) {
    console.error('Failed to update user role:', error)
  }
}

const closeResetModal = () => {
  showResetModal.value = false
  selectedUser.value = null
  resetError.value = ''
  resetSuccess.value = false
  newPassword.value = ''
  confirmPassword.value = ''
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
  selectedUser.value = null
}
</script>
