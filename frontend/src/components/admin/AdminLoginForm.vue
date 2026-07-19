<template>
  <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-primary">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-primary">
          {{ t('admin.login.title') }}
        </h2>
        <p class="mt-2 text-center text-sm text-secondary">
          {{ t('admin.login.subtitle') }}
        </p>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <input type="hidden" name="remember" value="true" />
        <div class="rounded-md shadow-lg -space-y-px bg-card border border-gray-600">
          <div>
            <label for="username" class="sr-only">{{ t('admin.login.username') }}</label>
            <input
              id="username"
              name="username"
              type="text"
              autocomplete="username"
              required
              v-model="credentials.username"
              :disabled="loading"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 placeholder-secondary text-primary bg-hover rounded-t-md focus:outline-none focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
              :placeholder="t('admin.login.username')"
            />
          </div>
          <div>
            <label for="password" class="sr-only">{{ t('admin.login.password') }}</label>
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              v-model="credentials.password"
              :disabled="loading"
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-600 placeholder-secondary text-primary bg-hover rounded-b-md focus:outline-none focus:ring-accent focus:border-accent focus:z-10 sm:text-sm"
              :placeholder="t('admin.login.password')"
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
            <span v-if="loading">{{ t('admin.login.signingIn') }}</span>
            <span v-else>{{ t('admin.login.signIn') }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from '../../i18n/composable'
import { adminApiClient } from '../../utils/adminApi.js'

const { t } = useI18n()

const credentials = ref({
  username: '',
  password: ''
})

const loading = ref(false)
const error = ref('')

onMounted(() => {
  // Check if already logged in as admin
  const adminToken = localStorage.getItem('admin_token')
  if (adminToken) {
    window.location.href = '/admin'
  }
})

const handleLogin = async () => {
  if (!credentials.value.username || !credentials.value.password) {
    error.value = 'Please enter both username and password'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const data = await adminApiClient.login(credentials.value)

    // Store admin token and user data
    localStorage.setItem('admin_token', data.token)
    localStorage.setItem('admin_user', JSON.stringify(data.admin))

    // Redirect to admin dashboard
    window.location.href = '/admin'
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>
