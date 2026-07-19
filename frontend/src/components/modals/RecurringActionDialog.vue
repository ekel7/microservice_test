<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
    @click.self="closeDialog"
  >
    <div class="relative mx-auto border border-gray-600 shadow-lg rounded-xl bg-card max-w-md w-full">
      <div class="p-6">
        <h3 class="text-lg font-medium text-primary mb-2">
          {{ title }}
        </h3>
        <p class="text-sm text-secondary mb-6">
          {{ description }}
        </p>

        <div class="space-y-3">
          <button
            v-if="showSingleOption"
            @click="handleSelection('single')"
            class="w-full text-left px-4 py-3 border border-gray-600 bg-hover hover:bg-card hover:border-accent text-primary rounded-md transition-all duration-200 hover:scale-105"
          >
            <div class="font-medium">{{ t('recurring.onlyThisEvent') }}</div>
            <div class="text-xs text-secondary mt-1">
              {{ actionType === 'cancel' ? t('recurring.onlyThisEventCancelDesc') : t('recurring.onlyThisEventEditDesc') }}
            </div>
          </button>

          <button
            v-if="showFutureOption"
            @click="handleSelection('all_future')"
            class="w-full text-left px-4 py-3 border border-gray-600 bg-hover hover:bg-card hover:border-accent text-primary rounded-md transition-all duration-200 hover:scale-105"
          >
            <div class="font-medium">{{ t('recurring.thisAndFutureEvents') }}</div>
            <div class="text-xs text-secondary mt-1">
              {{ actionType === 'cancel' ? t('recurring.thisAndFutureEventsCancelDesc') : t('recurring.thisAndFutureEventsEditDesc') }}
            </div>
          </button>

          <button
            @click="handleSelection('all')"
            class="w-full text-left px-4 py-3 border border-gray-600 bg-hover hover:bg-card hover:border-accent text-primary rounded-md transition-all duration-200 hover:scale-105"
          >
            <div class="font-medium">{{ t('recurring.allEvents') }}</div>
            <div class="text-xs text-secondary mt-1">
              {{ actionType === 'cancel' ? t('recurring.allEventsCancelDesc') : t('recurring.allEventsEditDesc') }}
            </div>
          </button>
        </div>

        <div class="flex justify-end mt-6">
          <button
            type="button"
            @click="closeDialog"
            class="px-4 py-2 text-sm font-medium text-secondary bg-hover hover:bg-card hover:text-primary hover:scale-105 border border-gray-600 rounded-md transition-all duration-200"
          >
            {{ t('common.cancel') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../../i18n/composable.ts'

const { t } = useI18n()

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  actionType: {
    type: String,
    required: true,
    validator: (value) => ['cancel', 'edit'].includes(value)
  },
  showSingleOption: {
    type: Boolean,
    default: true
  },
  showFutureOption: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'select'])

const title = computed(() => {
  return props.actionType === 'cancel'
    ? t('recurring.cancelRecurringEvent')
    : t('recurring.editRecurringEvent')
})

const description = computed(() => {
  return props.actionType === 'cancel'
    ? t('recurring.cancelRecurringEventDesc')
    : t('recurring.editRecurringEventDesc')
})

const closeDialog = () => {
  emit('update:modelValue', false)
}

const handleSelection = (scope) => {
  emit('select', scope)
  closeDialog()
}
</script>
