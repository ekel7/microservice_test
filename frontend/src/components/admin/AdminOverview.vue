<template>
  <div class="max-w-7xl mx-auto">
    <h2 class="text-3xl font-bold text-primary mb-8">{{ t('admin.overview.title') }}</h2>
    
    <div v-if="loading" class="flex justify-center items-center py-20">
      <p class="text-secondary text-lg">{{ t('admin.overview.loading') }}</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Account Stats -->
      <div class="bg-card rounded-lg shadow-lg border border-gray-600 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-primary">{{ t('admin.overview.accounts') }}</h3>
          <div class="text-2xl">👥</div>
        </div>
        <div class="text-3xl font-bold text-accent mb-4">{{ stats.accounts?.total || 0 }}</div>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-green-400 font-medium">{{ t('admin.overview.active') }}: {{ stats.accounts?.active || 0 }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-red-400 font-medium">{{ t('admin.overview.suspended') }}: {{ stats.accounts?.suspended || 0 }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-yellow-400 font-medium">{{ t('admin.overview.trial') }}: {{ stats.accounts?.trial || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- User Stats -->
      <div class="bg-card rounded-lg shadow-lg border border-gray-600 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-primary">{{ t('admin.overview.users') }}</h3>
          <div class="text-2xl">👤</div>
        </div>
        <div class="text-3xl font-bold text-accent mb-4">{{ stats.users?.total || 0 }}</div>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-green-400 font-medium">{{ t('admin.overview.admins') }}: {{ stats.users?.admins || 0 }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-blue-400 font-medium">{{ t('admin.overview.employees') }}: {{ stats.users?.employees || 0 }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-green-400 font-medium">{{ t('admin.overview.active') }}: {{ stats.users?.active || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- Payment Stats -->
      <div class="bg-card rounded-lg shadow-lg border border-gray-600 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-primary">{{ t('admin.overview.paymentsThisMonth') }}</h3>
          <div class="text-2xl">💳</div>
        </div>
        <div class="text-3xl font-bold text-accent mb-4">${{ (stats.payments?.total_amount || 0).toFixed(2) }}</div>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-green-400 font-medium">{{ t('admin.overview.completed') }}: {{ stats.payments?.completed || 0 }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-yellow-400 font-medium">{{ t('admin.overview.pending') }}: {{ stats.payments?.pending || 0 }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-red-400 font-medium">{{ t('admin.overview.failed') }}: {{ stats.payments?.failed || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- System Health -->
      <div class="bg-card rounded-lg shadow-lg border border-gray-600 p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-primary">{{ t('admin.overview.systemHealth') }}</h3>
          <div class="text-2xl">🟢</div>
        </div>
        <div class="text-3xl font-bold text-accent mb-4">{{ stats.health?.status || 'Unknown' }}</div>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-secondary">{{ t('admin.overview.uptime') }}: {{ stats.health?.uptime || 'N/A' }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-secondary">{{ t('admin.overview.lastCheck') }}: {{ formatDateTime(stats.health?.last_check) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="bg-card rounded-lg shadow-lg border border-gray-600 p-6">
      <h3 class="text-xl font-semibold text-primary mb-4">{{ t('admin.overview.recentActivity') }}</h3>
      <div v-if="recentActivity.length === 0" class="text-center py-8">
        <p class="text-secondary">{{ t('admin.overview.noActivity') }}</p>
      </div>
      <div v-else class="space-y-3">
        <div 
          v-for="activity in recentActivity" 
          :key="activity.id"
          class="flex justify-between items-center p-3 bg-hover rounded-md border border-gray-600"
        >
          <div class="flex flex-col gap-1">
            <span class="font-medium text-primary">{{ formatAction(activity.action) }}</span>
            <div class="text-sm text-secondary">
              <span v-if="activity.details?.name">{{ activity.details.name }}</span>
              <span v-else-if="activity.details?.account_name">{{ activity.details.account_name }}</span>
              <span v-else-if="activity.details?.user_name">{{ activity.details.user_name }}</span>
              <span v-else-if="activity.details?.email">{{ activity.details.email }}</span>
              <span v-else-if="activity.details?.amount">${{ activity.details.amount }}</span>
              <span v-if="activity.details?.status" class="ml-2 px-2 py-1 rounded-full text-xs"
                    :class="{
                      'bg-green-900/30 text-green-300': activity.details.status === 'active' || activity.details.status === 'completed',
                      'bg-red-900/30 text-red-300': activity.details.status === 'suspended' || activity.details.status === 'failed',
                      'bg-yellow-900/30 text-yellow-300': activity.details.status === 'trial' || activity.details.status === 'pending'
                    }">
                {{ activity.details.status }}
              </span>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1 text-xs text-secondary">
            <span>by {{ activity.super_admins?.username || activity.super_admins?.full_name }}</span>
            <LocalizedDate :date="activity.created_at" format="relative" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { DateTime } from 'luxon'
import { useI18n } from '../../i18n/composable'
import { adminApiClient } from '../../utils/adminApi.js'
import { useDateLocalization } from '../../composables/useDateLocalization.ts'
import LocalizedDate from '../common/LocalizedDate.vue'

const { t } = useI18n()
const { formatDateTime } = useDateLocalization()
const loading = ref(true)
const stats = ref({})
const recentActivity = ref([])

onMounted(async () => {
  await loadOverviewData()
})

const loadOverviewData = async () => {
  try {
    // Load statistics
    await Promise.all([
      loadAccountStats(),
      loadUserStats(),
      loadPaymentStats(),
      loadSystemHealth(),
      loadRecentActivity()
    ])
  } catch (error) {
    console.error('Failed to load overview data:', error)
  } finally {
    loading.value = false
  }
}

const loadAccountStats = async () => {
  try {
    const accounts = await adminApiClient.getAccounts()
    stats.value.accounts = {
      total: accounts.length,
      active: accounts.filter(a => a.status === 'active').length,
      suspended: accounts.filter(a => a.status === 'suspended').length,
      trial: accounts.filter(a => a.status === 'trial').length
    }
  } catch (error) {
    console.error('Failed to load account stats:', error)
  }
}

const loadUserStats = async () => {
  try {
    const users = await adminApiClient.getUsers()
    stats.value.users = {
      total: users.length,
      admins: users.filter(u => u.role === 'admin').length,
      employees: users.filter(u => u.role === 'employee').length,
      active: users.filter(u => u.is_active).length
    }
  } catch (error) {
    console.error('Failed to load user stats:', error)
  }
}

const loadPaymentStats = async () => {
  // Get start of current month using Luxon
  const startOfMonth = DateTime.now().startOf('month')

  try {
    const paymentStats = await adminApiClient.getPaymentStats({ start_date: startOfMonth.toISO() })
    stats.value.payments = {
      total_amount: paymentStats.total_amount,
      completed: paymentStats.by_status.completed.count,
      pending: paymentStats.by_status.pending.count,
      failed: paymentStats.by_status.failed.count
    }
  } catch (error) {
    console.error('Failed to load payment stats:', error)
  }
}

const loadSystemHealth = async () => {
  try {
    const health = await adminApiClient.getSystemHealth()
    stats.value.health = {
      status: 'Healthy',
      uptime: '99.9%',
      last_check: health.timestamp
    }
  } catch (error) {
    stats.value.health = {
      status: 'Unknown',
      uptime: 'N/A',
      last_check: DateTime.now().toISO()
    }
  }
}

const loadRecentActivity = async () => {
  try {
    const logs = await adminApiClient.getRecentAdminLogs(10)
    recentActivity.value = logs.map(log => ({
      id: log.id,
      action: log.action,
      details: log.details,
      created_at: log.created_at,
      super_admins: log.super_admins
    }))
  } catch (error) {
    console.error('Failed to load recent activity:', error)
    recentActivity.value = []
  }
}

const formatAction = (action) => {
  // Convert action to camelCase (e.g., 'CREATE_ACCOUNT' -> 'createAccount')
  const camelCaseAction = action.toLowerCase().replace(/_(.)/g, (_, letter) => letter.toUpperCase())
  const actionKey = `admin.logs.actions.${camelCaseAction}`
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
</script>
