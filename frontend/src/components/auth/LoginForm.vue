<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-primary">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-primary">
          {{ t('login.title') }}
        </h2>
        <p class="mt-2 text-center text-sm text-secondary">
          {{ t('login.subtitle') }}
        </p>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <input type="hidden" name="remember" value="true" />
        <div class="rounded-md shadow-lg -space-y-px bg-card border border-gray-600">
          <div>
            <label for="email-address" class="sr-only">{{ t('login.email') }}</label>
            <input
              id="email-address"
              name="email"
              type="email"
              autocomplete="email"
              required
              v-model="form.email"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 placeholder-secondary text-primary bg-hover rounded-t-md focus:outline-none focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
              :placeholder="t('login.email')"
            />
          </div>
          <div>
            <label for="password" class="sr-only">{{ t('login.password') }}</label>
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              v-model="form.password"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 placeholder-secondary text-primary bg-hover rounded-b-md focus:outline-none focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
              :placeholder="t('login.password')"
            />
          </div>
        </div>

        <div v-if="error" class="text-red-400 text-sm text-center">
          {{ error }}
        </div>

        <div>
          <button
            type="submit"
            :disabled="loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-accent hover:bg-accent/80 hover:scale-105 disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition-all duration-200"
          >
            <span v-if="loading">{{ t('login.signingIn') }}</span>
            <span v-else>{{ t('login.signIn') }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiClient } from '../../utils/api.js'
import { useI18n } from '../../i18n/composable.ts'

const { t } = useI18n()

const form = ref({
  email: '',
  password: ''
})

const loading = ref(false)
const error = ref('')

// Check for session expired parameter on component mount
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('error') === 'session_expired') {
    error.value = t('login.sessionExpired')
  }
})

const handleSubmit = async () => {
  if (!form.value.email || !form.value.password) {
    error.value = t('login.fillFields')
    return
  }

  loading.value = true
  error.value = ''

  try {
    const data = await apiClient.login(form.value.email, form.value.password)

    // Store the token
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))

    // Redirect to dashboard
    window.location.href = '/dashboard'
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>
