import { reactive, watch, toRef } from 'vue'
import { getTranslation, getCurrentLanguage, setCurrentLanguage, formatMessage } from './utils'
import { defaultLang, ui } from './ui'

// Global reactive state for language
const state = reactive({
  currentLanguage: getCurrentLanguage(),
})

console.log('i18n composable: Initial language state:', state.currentLanguage)

// Watch for storage changes
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'language') {
      const newLang = e.newValue as keyof typeof ui
      console.log('i18n composable: Storage change detected, new language:', newLang)
      state.currentLanguage = newLang in ui ? newLang : defaultLang
    }
  })
  
  // Listen for custom language change events
  window.addEventListener('languageChanged', (e) => {
    const newLang = (e as CustomEvent).detail?.lang || getCurrentLanguage()
    console.log('i18n composable: Custom languageChanged event, new language:', newLang)
    if (newLang in ui) {
      state.currentLanguage = newLang as keyof typeof ui
    }
  })
}

export function useI18n() {
  // Sync state with localStorage on each call (in case it changed)
  const currentLang = getCurrentLanguage()
  if (state.currentLanguage !== currentLang) {
    state.currentLanguage = currentLang
  }

  const t = (key, params = {}) => {
    const translation = getTranslation(key, state.currentLanguage)
    if (Object.keys(params).length > 0) {
      return formatMessage(translation, params)
    }
    return translation
  }

  const setLanguage = (lang) => {
    console.log('useI18n: setLanguage called with', lang)
    state.currentLanguage = lang
    setCurrentLanguage(lang)
  }

  return {
    t,
    currentLanguage: toRef(state, 'currentLanguage'),
    setLanguage,
  }
}
