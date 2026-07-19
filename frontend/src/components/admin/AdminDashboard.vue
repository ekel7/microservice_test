<template>
  <div class="min-h-screen bg-primary">
    <div v-if="!isAuthenticated" class="flex justify-center items-center min-h-screen">
      <p class="text-secondary text-lg">{{ t('common.loading') }}</p>
    </div>

    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Main Content -->
      <main>
        <!-- Dashboard Overview -->
        <div v-if="props.activeTab === 'overview'">
          <AdminOverview />
        </div>

        <!-- Account Management -->
        <div v-else-if="props.activeTab === 'accounts'">
          <AdminAccounts />
        </div>

        <!-- User Management -->
        <div v-else-if="props.activeTab === 'users'">
          <AdminUsers />
        </div>

        <!-- Payment Management -->
        <div v-else-if="props.activeTab === 'payments'">
          <AdminPayments />
        </div>

        <!-- Admin Logs -->
        <div v-else-if="props.activeTab === 'logs'">
          <AdminLogs />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useI18n } from '../../i18n/composable'
import { adminApiClient } from '../../utils/adminApi.js'
import AdminOverview from './AdminOverview.vue'
import AdminAccounts from './AdminAccounts.vue'
import AdminUsers from './AdminUsers.vue'
import AdminPayments from './AdminPayments.vue'
import AdminLogs from './AdminLogs.vue'

// Props
const props = defineProps({
  activeTab: {
    type: String,
    default: 'overview'
  }
})

const { t } = useI18n()

const isAuthenticated = ref(false)
const adminUser = ref(null)

onMounted(async () => {
  await checkAuthentication()
})

const checkAuthentication = async () => {
  const token = localStorage.getItem('admin_token')
  if (!token) {
    window.location.href = '/admin-login'
    return
  }

  try {
    const admin = await adminApiClient.getCurrentAdmin()
    adminUser.value = admin
    isAuthenticated.value = true
  } catch (error) {
    console.error('Authentication failed:', error)
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    window.location.href = '/admin-login'
  }
}

const handleLogout = async () => {
  try {
    await adminApiClient.logout()
  } catch (error) {
    console.error('Logout error:', error)
  }

  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
  window.location.href = '/admin-login'
}
</script>
