<template>
  <div v-if="warning && shouldShowWarning" 
       :class="[
         'p-4 mb-4 border-l-4 rounded-r-lg shadow-md',
         warningClasses
       ]">
    <div class="flex items-start">
      <div class="mr-3 mt-1">
        <Icon v-if="warning.type === 'locked'" name="lock" class="h-6 w-6" />
        <Icon v-else-if="warning.type === 'grace_period'" name="clock" class="h-6 w-6" />
        <Icon v-else name="alert-triangle" class="h-6 w-6" />
      </div>
      <div class="flex-1">
        <h3 class="font-bold text-sm mb-2">{{ warningTitle }}</h3>
        <p class="text-sm mb-3">{{ translatedMessage }}</p>
        
        <div v-if="warning.finalDate && warning.type !== 'locked'" class="text-xs opacity-75 mb-3">
          {{ t('account.warning.finalAccessDate') }}: <strong>{{ localizedFinalDate }}</strong>
        </div>
        
        <div class="flex gap-2">
          <button @click="dismissWarning" 
                  class="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-xs font-medium transition-colors">
            {{ t('account.warning.dismiss') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { DateTime } from 'luxon'
import { apiClient } from '../../utils/api.js'
import { useI18n } from '../../i18n/composable.ts'
import { useDateLocalization } from '../../composables/useDateLocalization.ts'

export default {
  name: 'GracePeriodWarning',
  props: {
    account: {
      type: Object,
      default: null
    }
  },
  emits: ['payment-processed', 'warning-dismissed'],
  setup(props, { emit }) {
    const { t } = useI18n()
    const { formatDate } = useDateLocalization()
    const warning = ref(null)
    const dismissed = ref(false)
    const processing = ref(false)

    const paymentForm = ref({
      amount: '',
      payment_method: '',
      transaction_id: '',
      description: ''
    })

    const shouldShowWarning = computed(() => {
      return warning.value && !dismissed.value
    })

    const canMakePayment = computed(() => {
      return props.account?.subscription_plan !== 'trial'
    })

    const warningClasses = computed(() => {
      if (!warning.value) return {}
      
      switch (warning.value.type) {
        case 'locked':
          return {
            'border-red-500 bg-red-50 text-red-800': true
          }
        case 'grace_period':
          return {
            'border-orange-500 bg-orange-50 text-orange-800': true
          }
        case 'trial_warning':
          return {
            'border-yellow-500 bg-yellow-50 text-yellow-800': true
          }
        default:
          return {
            'border-blue-500 bg-blue-50 text-blue-800': true
          }
      }
    })

    const warningTitle = computed(() => {
      if (!warning.value) return ''
      
      switch (warning.value.type) {
        case 'locked':
          return t('account.warning.accountLocked')
        case 'grace_period':
          return t('account.warning.gracePeriod')
        case 'trial_warning':
          return t('account.warning.trialEnding')
        default:
          return t('account.warning.accountNotice')
      }
    })

    const localizedFinalDate = computed(() => {
      if (!warning.value?.finalDate) return ''

      // If finalDate is already a formatted string (like "8/27/2025"), try to parse it
      // Otherwise assume it's a UTC date string
      try {
        let dateToFormat = warning.value.finalDate

        // Check if it's a UTC date string from backend
        if (dateToFormat.includes('T') || dateToFormat.includes('Z')) {
          return formatDate(dateToFormat, {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          })
        }

        // If it's already formatted, try to parse and reformat consistently
        const parsedDate = DateTime.fromISO(dateToFormat)
        if (parsedDate.isValid) {
          return formatDate(parsedDate.toISO(), {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          })
        }

        // Fallback to original string
        return dateToFormat
      } catch (error) {
        return warning.value.finalDate
      }
    })

    const translatedMessage = computed(() => {
      if (!warning.value) return ''
      
      switch (warning.value.type) {
        case 'locked':
          return t('account.warning.lockedMessage')
        case 'grace_period':
          return t('account.warning.gracePeriodMessage', { 
            days: warning.value.daysUntilLockout || 0 
          })
        case 'trial_warning':
          return t('account.warning.trialMessage', { 
            days: warning.value.daysUntilLockout || 0,
            date: localizedFinalDate.value
          })
        default:
          return warning.value.message || ''
      }
    })

    const fetchWarning = async () => {
      try {
        const response = await apiClient.getAccountWarning()
        warning.value = response.warning
      } catch (error) {
        console.error('Failed to fetch account warning:', error)
      }
    }

    const dismissWarning = () => {
      dismissed.value = true
      emit('warning-dismissed')
    }

    onMounted(() => {
      fetchWarning()
    })

    return {
      t,
      warning,
      shouldShowWarning,
      canMakePayment,
      warningClasses,
      warningTitle,
      translatedMessage,
      localizedFinalDate,
      processing,
      paymentForm,
      dismissWarning
    }
  }
}
</script>

<style scoped>
/* Additional custom styles if needed */
</style>