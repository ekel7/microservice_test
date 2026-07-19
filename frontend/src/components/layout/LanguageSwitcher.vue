<template>
  <div class="relative inline-block text-left w-full">
    <button
      @click="toggleDropdown"
      class="inline-flex justify-between w-full px-3 py-2 text-sm font-medium text-secondary bg-card border border-gray-600 rounded-md shadow-sm hover:bg-hover hover:text-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent cursor-pointer transition-colors"
    >
      {{ languages[currentLanguage] }}
      <svg class="ml-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      class="origin-top-left absolute left-0 mt-2 w-full rounded-md shadow-lg bg-card border border-gray-600 z-50"
    >
      <div class="py-1">
        <button
          v-for="(label, code) in languages"
          :key="code"
          @click="changeLanguage(code)"
          :class="[
            'block w-full text-left px-4 py-2 text-sm hover:bg-hover hover:text-primary cursor-pointer transition-colors',
            currentLanguage === code ? 'bg-hover text-primary' : 'text-secondary'
          ]"
        >
          {{ label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { languages } from '../../i18n/ui'
import { useI18n } from '../../i18n/composable'

const { currentLanguage, setLanguage } = useI18n()
const isOpen = ref(false)

// Debug: Watch currentLanguage changes
watch(currentLanguage, (newLang, oldLang) => {
  console.log('LanguageSwitcher: Language changed from', oldLang, 'to', newLang)
}, { immediate: true })

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const changeLanguage = (lang) => {
  console.log('LanguageSwitcher: Changing language to', lang)
  setLanguage(lang)
  isOpen.value = false
}

const handleClickOutside = (event) => {
  if (!event.target.closest('.relative')) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
