<template>
  <div class="min-h-screen bg-gray-50">
    <AdminNavigation 
      :currentPage="activeTab" 
      @tab-changed="handleTabChange" 
    />
    <AdminDashboard :activeTab="activeTab" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import AdminNavigation from './AdminNavigation.vue'
import AdminDashboard from './AdminDashboard.vue'
import { useI18n } from '../../i18n/composable'

const { t } = useI18n()

const activeTab = ref('overview')

// Title mapping for each tab
const tabTitles = {
  overview: 'admin.overview.title',
  accounts: 'admin.accounts.title', 
  users: 'admin.users.title',
  payments: 'admin.payments.title'
}

const handleTabChange = (newTab) => {
  activeTab.value = newTab
}

// Watch for tab changes and emit title change events
watch(activeTab, (newTab) => {
  const titleKey = tabTitles[newTab] || 'admin.panel.title'
  const translatedTitle = t(titleKey)
  
  // Emit custom event for title change
  window.dispatchEvent(new CustomEvent('adminTitleChanged', {
    detail: { title: `Admin - ${translatedTitle}` }
  }))
}, { immediate: true })

// Also watch for language changes to update title
watch(() => t('admin.tabs.overview'), () => {
  const titleKey = tabTitles[activeTab.value] || 'admin.panel.title'
  const translatedTitle = t(titleKey)
  
  window.dispatchEvent(new CustomEvent('adminTitleChanged', {
    detail: { title: `Admin - ${translatedTitle}` }
  }))
})
</script>
