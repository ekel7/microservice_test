<template>
  <div v-if="showModal" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" aria-hidden="true" @click="handleClose"></div>
      
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
      
      <div class="relative inline-block align-bottom bg-primary rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 border border-gray-600">
        <div class="sm:flex sm:items-start">
          <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
            <h3 class="text-lg leading-6 font-medium text-primary mb-4" id="modal-title">
              {{ isForced ? t('auth.passwordChange.titleForced') : t('auth.passwordChange.title') }}
            </h3>
            
            <p v-if="isForced" class="text-sm text-secondary mb-6">
              {{ t('auth.passwordChange.forcedMessage') }}
            </p>
            
            <form @submit.prevent="handleSubmit" class="space-y-4">
              <div v-if="!isForced">
                <label for="current-password" class="block text-sm font-medium text-secondary">
                  {{ t('auth.passwordChange.currentPassword') }}
                </label>
                <input
                  id="current-password"
                  v-model="form.currentPassword"
                  type="password"
                  required
                  :disabled="loading"
                  class="mt-1 block w-full px-3 py-2 bg-hover border border-gray-600 rounded-md text-primary placeholder-secondary focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
                  :placeholder="t('auth.passwordChange.currentPassword')"
                />
              </div>
              
              <div>
                <label for="new-password" class="block text-sm font-medium text-secondary">
                  {{ t('auth.passwordChange.newPassword') }}
                </label>
                <input
                  id="new-password"
                  v-model="form.newPassword"
                  type="password"
                  required
                  :disabled="loading"
                  class="mt-1 block w-full px-3 py-2 bg-hover border border-gray-600 rounded-md text-primary placeholder-secondary focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
                  :placeholder="t('auth.passwordChange.newPassword')"
                />
              </div>
              
              <div>
                <label for="confirm-password" class="block text-sm font-medium text-secondary">
                  {{ t('auth.passwordChange.confirmPassword') }}
                </label>
                <input
                  id="confirm-password"
                  v-model="form.confirmPassword"
                  type="password"
                  required
                  :disabled="loading"
                  class="mt-1 block w-full px-3 py-2 bg-hover border border-gray-600 rounded-md text-primary placeholder-secondary focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
                  :placeholder="t('auth.passwordChange.confirmPassword')"
                />
              </div>
              
              <div v-if="error" class="text-red-400 text-sm">
                {{ error }}
              </div>
              
              <div class="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                <button
                  type="submit"
                  :disabled="loading"
                  class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-accent text-base font-medium text-black hover:bg-accent/80 hover:scale-105 disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 transition-all duration-200"
                >
                  <span v-if="loading">{{ t('auth.passwordChange.changing') }}</span>
                  <span v-else>{{ t('auth.passwordChange.change') }}</span>
                </button>
                <button
                  v-if="!isForced"
                  type="button"
                  @click="handleClose"
                  :disabled="loading"
                  class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-primary text-base font-medium text-secondary hover:bg-hover hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent sm:mt-0 sm:w-auto sm:text-sm transition-all duration-200"
                >
                  {{ t('common.cancel') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from '../../i18n/composable'
import { apiClient } from '../../utils/api.js'

const props = defineProps({
  showModal: {
    type: Boolean,
    default: false
  },
  isForced: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'success'])

const { t } = useI18n()

const form = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const loading = ref(false)
const error = ref('')

// Reset form when modal opens/closes
watch(() => props.showModal, (newValue) => {
  if (newValue) {
    resetForm()
  }
})

const resetForm = () => {
  form.value = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  error.value = ''
}

const handleClose = () => {
  if (!props.isForced && !loading.value) {
    emit('close')
  }
}

const handleSubmit = async () => {
  if (form.value.newPassword !== form.value.confirmPassword) {
    error.value = t('auth.passwordChange.passwordsNoMatch')
    return
  }
  
  if (form.value.newPassword.length < 6) {
    error.value = t('auth.passwordChange.passwordTooShort')
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    const payload = {
      new_password: form.value.newPassword
    }
    
    // Only include current password if it's not a forced change
    if (!props.isForced) {
      payload.current_password = form.value.currentPassword
    }
    
    await apiClient.changePassword(payload)
    
    resetForm()
    emit('success')
  } catch (err) {
    error.value = err.message || t('auth.passwordChange.error')
  } finally {
    loading.value = false
  }
}
</script>