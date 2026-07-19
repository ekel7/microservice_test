<template>
  <div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-8">
      <h2 class="text-3xl font-bold text-primary">{{ t('admin.logs.title') }}</h2>
    </div>

    <!-- Filters -->
    <div class="bg-card rounded-lg shadow-sm border border-gray-600 p-4 mb-6">
      <div class="flex flex-wrap gap-4 items-center">
        <select 
          v-model="filters.action" 
          @change="loadLogs"
          class="px-3 py-2 border border-gray-600 rounded-md text-sm bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        >
          <option value="">{{ t('admin.logs.allActions') }}</option>
          <option value="LOGIN">{{ t('admin.logs.actions.login') }}</option>
          <option value="LOGOUT">{{ t('admin.logs.actions.logout') }}</option>
          <option value="CREATE_ACCOUNT">{{ t('admin.logs.actions.createAccount') }}</option>
          <option value="UPDATE_ACCOUNT">{{ t('admin.logs.actions.updateAccount') }}</option>
          <option value="UPDATE_ACCOUNT_STATUS">{{ t('admin.logs.actions.updateAccountStatus') }}</option>
          <option value="DELETE_ACCOUNT">{{ t('admin.logs.actions.deleteAccount') }}</option>
          <option value="REGISTER_PAYMENT">{{ t('admin.logs.actions.registerPayment') }}</option>
          <option value="RESET_PASSWORD">{{ t('admin.logs.actions.resetPassword') }}</option>
        </select>

        <select 
          v-model="filters.target_type" 
          @change="loadLogs"
          class="px-3 py-2 border border-gray-600 rounded-md text-sm bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        >
          <option value="">{{ t('admin.logs.allTargets') }}</option>
          <option value="account">{{ t('admin.logs.targetTypes.account') }}</option>
          <option value="user">{{ t('admin.logs.targetTypes.user') }}</option>
          <option value="payment">{{ t('admin.logs.targetTypes.payment') }}</option>
        </select>

        <div class="flex flex-col">
          <label class="text-xs text-secondary mb-1">{{ t('admin.logs.startDate') }}</label>
          <input
            v-model="filters.start_date"
            @change="loadLogs"
            type="date"
            class="px-3 py-2 border border-gray-600 rounded-md text-sm bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            :title="`${t('admin.logs.startDate')} (${dateFormatHint})`"
            :aria-label="t('admin.logs.startDate')"
          />
        </div>

        <div class="flex flex-col">
          <label class="text-xs text-secondary mb-1">{{ t('admin.logs.endDate') }}</label>
          <input
            v-model="filters.end_date"
            @change="loadLogs"
            type="date"
            class="px-3 py-2 border border-gray-600 rounded-md text-sm bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            :title="`${t('admin.logs.endDate')} (${dateFormatHint})`"
            :aria-label="t('admin.logs.endDate')"
          />
        </div>

        <button
          @click="clearFilters"
          class="px-4 py-2 bg-hover text-secondary border border-gray-600 rounded-md hover:bg-gray-600 transition-colors"
        >
          {{ t('admin.logs.clearFilters') }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center items-center py-20">
      <p class="text-secondary text-lg">{{ t('admin.logs.loading') }}</p>
    </div>

    <div v-else-if="error" class="bg-red-900/30 border border-red-600 rounded-md p-4 mb-6">
      <p class="text-red-300">{{ error }}</p>
    </div>

    <div v-else>
      <!-- Logs Table -->
      <div class="bg-card rounded-lg shadow-sm border border-gray-600 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-600">
            <thead class="bg-hover">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {{ t('admin.logs.timestamp') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {{ t('admin.logs.admin') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {{ t('admin.logs.action') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {{ t('admin.logs.target') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {{ t('admin.logs.details') }}
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                  {{ t('admin.logs.ipAddress') }}
                </th>
              </tr>
            </thead>
            <tbody class="bg-card divide-y divide-gray-600">
              <tr v-for="log in logs" :key="log.id" class="hover:bg-hover">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-primary">
                  <LocalizedDate :date="log.created_at" format="datetime" />
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-primary">
                    {{ log.super_admins?.full_name || log.super_admins?.username }}
                  </div>
                  <div class="text-sm text-secondary">
                    {{ log.super_admins?.username }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        :class="getActionClass(log.action)">
                    {{ formatAction(log.action) }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-primary">
                  <div v-if="log.target_type" class="flex flex-col">
                    <span class="font-medium">{{ log.target_type }}</span>
                    <span class="text-xs text-secondary">{{ log.target_id }}</span>
                  </div>
                  <span v-else class="text-secondary">-</span>
                </td>
                <td class="px-6 py-4 text-sm text-primary">
                  <div class="max-w-xs">
                    <div v-if="log.details && Object.keys(log.details).length > 0">
                      <div v-for="(value, key) in log.details" :key="key" class="text-xs">
                        <span class="font-medium">{{ key }}:</span> 
                        <span v-if="typeof value === 'object'">{{ JSON.stringify(value) }}</span>
                        <span v-else>{{ value }}</span>
                      </div>
                    </div>
                    <span v-else class="text-secondary">-</span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                  {{ log.ip_address || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty state -->
        <div v-if="logs.length === 0" class="text-center py-12">
          <p class="text-secondary">{{ t('admin.logs.noLogs') }}</p>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="pagination && pagination.total_pages > 1" class="mt-6 flex items-center justify-between">
        <div class="text-sm text-secondary">
          {{ t('admin.logs.showing') }} {{ Math.min((pagination.current_page - 1) * pagination.per_page + 1, pagination.total) }} 
          {{ t('admin.logs.to') }} {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} 
          {{ t('admin.logs.of') }} {{ pagination.total }} {{ t('admin.logs.results') }}
        </div>
        
        <div class="flex space-x-2">
          <button
            @click="changePage(pagination.current_page - 1)"
            :disabled="pagination.current_page <= 1"
            class="px-3 py-2 text-sm bg-hover text-secondary border border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
          >
            {{ t('admin.logs.previous') }}
          </button>
          
          <button
            v-for="page in getPageNumbers()"
            :key="page"
            @click="changePage(page)"
            :class="[
              'px-3 py-2 text-sm border rounded-md',
              page === pagination.current_page 
                ? 'bg-accent text-black border-accent' 
                : 'bg-hover text-secondary border-gray-600 hover:bg-gray-600'
            ]"
          >
            {{ page }}
          </button>
          
          <button
            @click="changePage(pagination.current_page + 1)"
            :disabled="pagination.current_page >= pagination.total_pages"
            class="px-3 py-2 text-sm bg-hover text-secondary border border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600"
          >
            {{ t('admin.logs.next') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from '../../i18n/composable'
import { adminApiClient } from '../../utils/adminApi.js'
import LocalizedDate from '../common/LocalizedDate.vue'

const { t, currentLanguage } = useI18n()
const loading = ref(true)
const error = ref(null)
const logs = ref([])
const pagination = ref(null)

const filters = ref({
  action: '',
  target_type: '',
  start_date: '',
  end_date: '',
  page: 1,
  limit: 50
})

// Computed property for date format hints
const dateFormatHint = computed(() => {
  return currentLanguage.value === 'es' ? 'DD/MM/AAAA' : 'MM/DD/YYYY'
})

onMounted(async () => {
  await loadLogs()
})

const loadLogs = async () => {
  try {
    loading.value = true
    error.value = null
    
    const response = await adminApiClient.getAdminLogs(filters.value)
    logs.value = response.logs
    pagination.value = response.pagination
  } catch (err) {
    error.value = err.message || 'Failed to load admin logs'
  } finally {
    loading.value = false
  }
}

const clearFilters = async () => {
  filters.value = {
    action: '',
    target_type: '',
    start_date: '',
    end_date: '',
    page: 1,
    limit: 50
  }
  await loadLogs()
}

const changePage = async (page) => {
  if (page >= 1 && page <= pagination.value.total_pages) {
    filters.value.page = page
    await loadLogs()
  }
}

const getPageNumbers = () => {
  if (!pagination.value) return []
  
  const { current_page, total_pages } = pagination.value
  const pages = []
  const delta = 2 // Show 2 pages on each side of current page
  
  for (let i = Math.max(1, current_page - delta); i <= Math.min(total_pages, current_page + delta); i++) {
    pages.push(i)
  }
  
  return pages
}

const formatAction = (action) => {
  const actionKey = `admin.logs.actions.${action.toLowerCase().replace(/_/g, '')}`
  const translation = t(actionKey)
  
  // If translation key is not found, fallback to formatted action name
  if (translation === actionKey) {
    const actionMap = {
      'LOGIN': t('admin.logs.actions.login') || 'Logged in',
      'LOGOUT': t('admin.logs.actions.logout') || 'Logged out',
      'CREATE_ACCOUNT': t('admin.logs.actions.createAccount') || 'Created account',
      'UPDATE_ACCOUNT': t('admin.logs.actions.updateAccount') || 'Updated account',
      'UPDATE_ACCOUNT_STATUS': t('admin.logs.actions.updateAccountStatus') || 'Updated account status',
      'DELETE_ACCOUNT': t('admin.logs.actions.deleteAccount') || 'Suspended account',
      'RESET_PASSWORD': t('admin.logs.actions.resetPassword') || 'Reset user password',
      'ACTIVATE_USER': 'Activated user',
      'DEACTIVATE_USER': 'Deactivated user',
      'UPDATE_USER_ROLE': 'Updated user role',
      'REGISTER_PAYMENT': t('admin.logs.actions.registerPayment') || 'Registered payment',
      'UPDATE_PAYMENT': 'Updated payment',
      'UPDATE_PAYMENT_STATUS': 'Updated payment status'
    }
    return actionMap[action] || action
  }
  
  return translation
}

const getActionClass = (action) => {
  const classMap = {
    'LOGIN': 'bg-green-900/30 text-green-300',
    'LOGOUT': 'bg-gray-700/30 text-gray-300',
    'CREATE_ACCOUNT': 'bg-blue-900/30 text-blue-300',
    'UPDATE_ACCOUNT': 'bg-yellow-900/30 text-yellow-300',
    'UPDATE_ACCOUNT_STATUS': 'bg-orange-900/30 text-orange-300',
    'DELETE_ACCOUNT': 'bg-red-900/30 text-red-300',
    'RESET_PASSWORD': 'bg-purple-900/30 text-purple-300',
    'ACTIVATE_USER': 'bg-green-900/30 text-green-300',
    'DEACTIVATE_USER': 'bg-red-900/30 text-red-300',
    'UPDATE_USER_ROLE': 'bg-indigo-900/30 text-indigo-300',
    'REGISTER_PAYMENT': 'bg-emerald-900/30 text-emerald-300',
    'UPDATE_PAYMENT': 'bg-yellow-900/30 text-yellow-300',
    'UPDATE_PAYMENT_STATUS': 'bg-cyan-900/30 text-cyan-300'
  }
  return classMap[action] || 'bg-gray-700/30 text-gray-300'
}
</script>

<style scoped>
/* Enhanced date input styling for better UX */
input[type="date"] {
  position: relative;
}

/* Add visual hint for date format based on language */
input[type="date"]:before {
  content: attr(title);
  position: absolute;
  top: -20px;
  left: 0;
  font-size: 11px;
  color: #6b7280;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
}

input[type="date"]:focus:before,
input[type="date"]:hover:before {
  opacity: 1;
}

/* Ensure proper date format display in different browsers */
input[type="date"]::-webkit-datetime-edit-fields-wrapper {
  display: flex;
}

input[type="date"]::-webkit-datetime-edit-text {
  padding: 0 2px;
}

input[type="date"]::-webkit-datetime-edit-month-field,
input[type="date"]::-webkit-datetime-edit-day-field,
input[type="date"]::-webkit-datetime-edit-year-field {
  padding: 0 1px;
}
</style>
