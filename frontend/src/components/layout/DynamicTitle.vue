<script setup>
import { useI18n } from '../../i18n/composable'
import { watch, nextTick, onMounted, onUnmounted, ref } from 'vue'

const { t } = useI18n()

const props = defineProps({
  title: {
    type: String,
    default: 'common.loading'
  }
})

const currentTitle = ref(props.title)

// Update document title when title changes
const updateDocumentTitle = (title) => {
  nextTick(() => {
    document.title = `${title} - ${t('login.title')}`
  })
}

// Handle admin title changes
const handleAdminTitleChange = (event) => {
  currentTitle.value = event.detail.title
  updateDocumentTitle(event.detail.title)
}

// Watch for prop title changes (for non-admin pages)
watch(() => t(props.title), (newTitle) => {
  // Only update if we haven't received an admin title change
  if (!currentTitle.value.includes('Admin -')) {
    currentTitle.value = newTitle
    updateDocumentTitle(newTitle)
  }
}, { immediate: true })

// Watch for current title changes
watch(currentTitle, (newTitle) => {
  updateDocumentTitle(newTitle)
}, { immediate: true })

onMounted(() => {
  // Listen for admin title changes
  window.addEventListener('adminTitleChanged', handleAdminTitleChange)
})

onUnmounted(() => {
  window.removeEventListener('adminTitleChanged', handleAdminTitleChange)
})
</script>

<template>
  <!-- This component is invisible but handles title updates -->
</template>
