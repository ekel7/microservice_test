<template>
  <div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-3xl font-bold text-primary">{{ t('admin.payments.title') }}</h2>
      <button @click="showRegisterModal = true" class="bg-accent hover:bg-lime-300 text-black px-4 py-2 rounded-md text-sm font-medium transition-colors">
        + {{ t('admin.payments.registerPayment') }}
      </button>
    </div>

    <div v-if="loading" class="flex justify-center items-center py-20">
      <p class="text-secondary text-lg">{{ t('admin.payments.loading') }}</p>
    </div>

    <div v-else>
      <!-- Filters -->
      <div class="bg-card rounded-lg shadow-sm border border-gray-600 p-4 mb-6">
        <div class="flex flex-wrap gap-4 items-center">
          <select 
            v-model="accountFilter" 
            @change="loadPayments"
            class="px-3 py-2 border border-gray-600 rounded-md text-sm bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          >
            <option value="">{{ t('admin.payments.allAccounts') }}</option>
            <option 
              v-for="account in uniqueAccounts" 
              :key="account.id" 
              :value="account.id"
            >
              {{ account.name }}
            </option>
          </select>

          <select 
            v-model="statusFilter" 
            @change="applyFilters"
            class="px-3 py-2 border border-gray-600 rounded-md text-sm bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          >
            <option value="">{{ t('admin.payments.allStatus') }}</option>
            <option value="completed">{{ t('admin.payments.completed') }}</option>
            <option value="pending">{{ t('admin.payments.pending') }}</option>
            <option value="failed">{{ t('admin.payments.failed') }}</option>
            <option value="refunded">{{ t('admin.payments.refunded') }}</option>
          </select>

          <input
            v-model="startDate"
            @change="applyFilters"
            type="date"
            class="px-3 py-2 border border-gray-600 rounded-md text-sm bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            :title="t('admin.payments.startDate')"
          />
          
          <input
            v-model="endDate"
            @change="applyFilters"
            type="date"
            class="px-3 py-2 border border-gray-600 rounded-md text-sm bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            :title="t('admin.payments.endDate')"
          />
        </div>
      </div>

      <!-- Payment Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-card rounded-lg shadow-sm border border-gray-600 p-4">
          <div class="text-sm font-medium text-secondary">{{ t('admin.payments.totalAmount') }}</div>
          <div class="text-2xl font-bold text-accent">${{ totalAmount.toFixed(2) }}</div>
        </div>
        <div class="bg-card rounded-lg shadow-sm border border-gray-600 p-4">
          <div class="text-sm font-medium text-secondary">{{ t('admin.payments.totalPayments') }}</div>
          <div class="text-2xl font-bold text-accent">{{ filteredPayments.length }}</div>
        </div>
        <div class="bg-card rounded-lg shadow-sm border border-gray-600 p-4">
          <div class="text-sm font-medium text-secondary">{{ t('admin.payments.completedCount') }}</div>
          <div class="text-2xl font-bold text-green-400">{{ completedCount }}</div>
        </div>
        <div class="bg-card rounded-lg shadow-sm border border-gray-600 p-4">
          <div class="text-sm font-medium text-secondary">{{ t('admin.payments.pendingCount') }}</div>
          <div class="text-2xl font-bold text-yellow-400">{{ pendingCount }}</div>
        </div>
      </div>

      <!-- Payments Table -->
      <div class="bg-card rounded-lg shadow-sm border border-gray-600 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-600">
            <thead class="bg-hover">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.payments.account') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.payments.amount') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.payments.method') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.payments.status') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.payments.transactionId') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.payments.billingPeriod') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.payments.created') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.payments.actions') }}</th>
              </tr>
            </thead>
            <tbody class="bg-card divide-y divide-gray-600">
              <tr v-for="payment in filteredPayments" :key="payment.id" class="hover:bg-hover">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{{ payment.accounts?.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <div class="flex flex-col">
                    <span class="text-secondary text-xs">{{ payment.currency }}</span>
                    <span class="font-semibold text-primary">${{ parseFloat(payment.amount).toFixed(2) }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">{{ formatPaymentMethod(payment.payment_method) }}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="[
                    'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                    payment.payment_status === 'completed' ? 'bg-green-900/30 text-green-300' :
                    payment.payment_status === 'pending' ? 'bg-yellow-900/30 text-yellow-300' :
                    payment.payment_status === 'failed' ? 'bg-red-900/30 text-red-300' :
                    payment.payment_status === 'refunded' ? 'bg-purple-900/30 text-purple-300' :
                    'bg-gray-700/30 text-gray-300'
                  ]">
                    {{ payment.payment_status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary font-mono">{{ payment.transaction_id || 'N/A' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                  {{ formatBillingPeriod(payment.billing_period_start, payment.billing_period_end) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                  <LocalizedDate :date="payment.created_at" />
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex space-x-2">
                    <button 
                      @click="viewPayment(payment)"
                      class="text-blue-400 hover:text-blue-300 transition-colors p-1 rounded hover:bg-hover"
                      :title="t('admin.payments.viewDetails')"
                    >
                      👁️
                    </button>
                    <button 
                      @click="editPayment(payment)"
                      class="text-secondary hover:text-primary transition-colors p-1 rounded hover:bg-hover"
                      :title="t('admin.payments.editPayment')"
                    >
                      ✏️
                    </button>
                    <button 
                      v-if="payment.payment_status === 'pending'"
                      @click="markAsCompleted(payment)"
                      class="text-green-400 hover:text-green-300 transition-colors p-1 rounded hover:bg-hover"
                      :title="t('admin.payments.markCompleted')"
                    >
                      ✅
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="filteredPayments.length === 0" class="text-center py-12">
          <p class="text-secondary text-lg">{{ t('admin.payments.noPayments') }}</p>
        </div>
      </div>
    </div>

    <!-- Register Payment Modal -->
    <div v-if="showRegisterModal" class="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4" @click="closeRegisterModal">
      <div class="relative mx-auto border border-gray-600 w-full max-w-2xl bg-card rounded-lg shadow-lg max-h-[90vh] overflow-y-auto" @click.stop>
        <div class="p-5">
          <div class="flex justify-between items-center pb-4 border-b border-gray-600">
            <h3 class="text-lg font-semibold text-primary">{{ t('admin.payments.registerNew') }}</h3>
            <button @click="closeRegisterModal" class="text-secondary hover:text-primary text-2xl leading-none">&times;</button>
          </div>
        
        <form @submit.prevent="registerPayment" class="mt-4">
          <div class="mb-4">
            <label for="account" class="block text-sm font-medium text-secondary mb-2">{{ t('admin.payments.account') }} *</label>
            <select id="account" v-model="newPayment.account_id" required 
              class="w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent">
              <option value="">{{ t('admin.payments.selectAccount') }}</option>
              <option 
                v-for="account in allAccounts" 
                :key="account.id" 
                :value="account.id"
              >
                {{ account.name }} ({{ account.slug }})
              </option>
            </select>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label for="amount" class="block text-sm font-medium text-secondary mb-2">{{ t('admin.payments.amount') }} *</label>
              <input
                id="amount"
                v-model.number="newPayment.amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                class="w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </div>

            <div>
              <label for="currency" class="block text-sm font-medium text-secondary mb-2">{{ t('admin.payments.currency') }}</label>
              <select id="currency" v-model="newPayment.currency"
                class="w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            <div>
              <label for="method" class="block text-sm font-medium text-secondary mb-2">{{ t('admin.payments.paymentMethod') }} *</label>
              <select id="method" v-model="newPayment.payment_method" required
                class="w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent">
                <option value="">{{ t('admin.payments.selectMethod') }}</option>
                <option value="credit_card">{{ t('admin.payments.creditCard') }}</option>
                <option value="bank_transfer">{{ t('admin.payments.bankTransfer') }}</option>
                <option value="cash">{{ t('admin.payments.cash') }}</option>
                <option value="check">{{ t('admin.payments.check') }}</option>
              </select>
            </div>
          </div>

          <div class="mb-4">
            <label for="transaction_id" class="block text-sm font-medium text-secondary mb-2">{{ t('admin.payments.transactionIdLabel') }}</label>
            <input
              id="transaction_id"
              v-model="newPayment.transaction_id"
              type="text"
              :placeholder="t('admin.payments.transactionIdPlaceholder')"
              class="w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>

          <div class="mb-4">
            <label for="description" class="block text-sm font-medium text-secondary mb-2">{{ t('admin.payments.description') }}</label>
            <textarea
              id="description"
              v-model="newPayment.description"
              rows="3"
              :placeholder="t('admin.payments.descriptionPlaceholder')"
              class="w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label for="period_start" class="block text-sm font-medium text-secondary mb-2">{{ t('admin.payments.billingPeriodStart') }}</label>
              <input
                id="period_start"
                v-model="newPayment.billing_period_start"
                type="date"
                class="w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </div>

            <div>
              <label for="period_end" class="block text-sm font-medium text-secondary mb-2">{{ t('admin.payments.billingPeriodEnd') }}</label>
              <input
                id="period_end"
                v-model="newPayment.billing_period_end"
                type="date"
                class="w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t border-gray-600">
            <button type="button" @click="closeRegisterModal" 
              class="px-4 py-2 text-sm font-medium text-secondary bg-hover border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors">
              {{ t('admin.payments.cancel') }}
            </button>
            <button type="submit" :disabled="registerLoading" 
              class="px-4 py-2 text-sm font-medium text-black bg-accent border border-transparent rounded-md hover:bg-lime-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {{ registerLoading ? t('admin.payments.registering') : t('admin.payments.registerButton') }}
            </button>
          </div>

          <div v-if="registerError" class="mt-4 p-3 bg-red-900/30 border border-red-600 text-red-300 rounded-md">
            {{ registerError }}
          </div>
        </form>
        </div>
      </div>
      </div>
    </div>

    <!-- Payment Details Modal -->
    <div v-if="showDetailsModal" class="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4" @click="closeDetailsModal">
      <div class="relative mx-auto border border-gray-600 w-full max-w-4xl bg-card rounded-lg shadow-lg max-h-[90vh] overflow-y-auto" @click.stop>
        <div class="p-5">
          <div class="flex justify-between items-center pb-4 border-b border-gray-600">
            <h3 class="text-lg font-semibold text-primary">{{ t('admin.payments.paymentDetails') }}</h3>
            <button @click="closeDetailsModal" class="text-secondary hover:text-primary text-2xl leading-none">&times;</button>
          </div>
        
        <div class="mt-6 space-y-6">
          <div class="bg-hover rounded-lg p-4">
            <h4 class="text-md font-semibold text-primary mb-4">{{ t('admin.payments.paymentInformation') }}</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="text-sm font-medium text-secondary">{{ t('admin.payments.account') }}:</label>
                <span class="block text-sm text-primary">{{ selectedPayment?.accounts?.name }}</span>
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium text-secondary">{{ t('admin.payments.amount') }}:</label>
                <span class="block text-sm font-semibold text-primary">
                  {{ selectedPayment?.currency }} ${{ parseFloat(selectedPayment?.amount || 0).toFixed(2) }}
                </span>
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium text-secondary">{{ t('admin.payments.method') }}:</label>
                <span class="block text-sm text-primary">{{ formatPaymentMethod(selectedPayment?.payment_method) }}</span>
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium text-secondary">{{ t('admin.payments.status') }}:</label>
                <span :class="[
                  'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                  selectedPayment?.payment_status === 'completed' ? 'bg-green-900/30 text-green-300' :
                  selectedPayment?.payment_status === 'pending' ? 'bg-yellow-900/30 text-yellow-300' :
                  selectedPayment?.payment_status === 'failed' ? 'bg-red-900/30 text-red-300' :
                  selectedPayment?.payment_status === 'refunded' ? 'bg-purple-900/30 text-purple-300' :
                  'bg-gray-700/30 text-gray-300'
                ]">
                  {{ selectedPayment?.payment_status }}
                </span>
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium text-secondary">{{ t('admin.payments.transactionId') }}:</label>
                <span class="block text-sm text-primary font-mono">{{ selectedPayment?.transaction_id || t('admin.payments.na') }}</span>
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium text-secondary">{{ t('admin.payments.created') }}:</label>
                <LocalizedDate :date="selectedPayment?.created_at" format="datetime" />
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium text-secondary">{{ t('admin.payments.processedBy') }}:</label>
                <span class="block text-sm text-primary">{{ selectedPayment?.super_admins?.full_name || t('admin.payments.na') }}</span>
              </div>
              <div class="space-y-1">
                <label class="text-sm font-medium text-secondary">{{ t('admin.payments.processedAt') }}:</label>
                <LocalizedDate :date="selectedPayment?.processed_at" format="datetime" />
              </div>
            </div>
          </div>

          <div v-if="selectedPayment?.description" class="bg-hover rounded-lg p-4">
            <h4 class="text-md font-semibold text-primary mb-2">{{ t('admin.payments.description') }}</h4>
            <p class="text-sm text-secondary leading-relaxed">{{ selectedPayment.description }}</p>
          </div>

          <div v-if="selectedPayment?.billing_period_start || selectedPayment?.billing_period_end" class="bg-hover rounded-lg p-4">
            <h4 class="text-md font-semibold text-primary mb-2">{{ t('admin.payments.billingPeriod') }}</h4>
            <p class="text-sm text-secondary">
              {{ formatBillingPeriod(selectedPayment.billing_period_start, selectedPayment.billing_period_end) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { DateTime } from 'luxon'
import { useI18n } from '../../i18n/composable'
import { adminApiClient } from '../../utils/adminApi.js'
import { useDateLocalization } from '../../composables/useDateLocalization.ts'
import { parseUTCToLocal } from '../../utils/dateFormat.js'
import LocalizedDate from '../common/LocalizedDate.vue'

const { t } = useI18n()
const { formatDate } = useDateLocalization()
const loading = ref(true)
const payments = ref([])
const allAccounts = ref([])
const accountFilter = ref('')
const statusFilter = ref('')
const startDate = ref('')
const endDate = ref('')
const showRegisterModal = ref(false)
const showDetailsModal = ref(false)
const selectedPayment = ref(null)
const registerLoading = ref(false)
const registerError = ref('')

const newPayment = ref({
  account_id: '',
  amount: '',
  currency: 'USD',
  payment_method: '',
  transaction_id: '',
  description: '',
  billing_period_start: '',
  billing_period_end: ''
})

onMounted(async () => {
  await Promise.all([loadPayments(), loadAccounts()])
})

const uniqueAccounts = computed(() => {
  const accounts = payments.value.map(payment => payment.accounts).filter(Boolean)
  const unique = accounts.reduce((acc, account) => {
    if (!acc.find(a => a.id === account.id)) {
      acc.push(account)
    }
    return acc
  }, [])
  return unique.sort((a, b) => a.name.localeCompare(b.name))
})

const filteredPayments = computed(() => {
  let filtered = payments.value

  if (accountFilter.value) {
    filtered = filtered.filter(payment => payment.account_id === accountFilter.value)
  }

  if (statusFilter.value) {
    filtered = filtered.filter(payment => payment.payment_status === statusFilter.value)
  }

  if (startDate.value) {
    // Parse start date using Luxon
    const startDateTime = DateTime.fromISO(startDate.value)
    filtered = filtered.filter(payment => {
      const paymentDate = parseUTCToLocal(payment.created_at)
      return paymentDate >= startDateTime
    })
  }

  if (endDate.value) {
    // Parse end date and set to end of day using Luxon
    const endDateTime = DateTime.fromISO(endDate.value).endOf('day')
    filtered = filtered.filter(payment => {
      const paymentDate = parseUTCToLocal(payment.created_at)
      return paymentDate <= endDateTime
    })
  }

  return filtered.sort((a, b) => {
    const dateA = parseUTCToLocal(a.created_at)
    const dateB = parseUTCToLocal(b.created_at)
    return dateB - dateA
  })
})

const totalAmount = computed(() => {
  return filteredPayments.value.reduce((sum, payment) => 
    sum + parseFloat(payment.amount), 0
  )
})

const completedCount = computed(() => {
  return filteredPayments.value.filter(p => p.payment_status === 'completed').length
})

const pendingCount = computed(() => {
  return filteredPayments.value.filter(p => p.payment_status === 'pending').length
})

const loadPayments = async () => {
  try {
    const filters = { limit: 100 }
    if (accountFilter.value) {
      filters.account_id = accountFilter.value
    }
    payments.value = await adminApiClient.getPayments(filters)
  } catch (error) {
    console.error('Load payments error:', error)
  } finally {
    loading.value = false
  }
}

const loadAccounts = async () => {
  try {
    allAccounts.value = await adminApiClient.getAccounts()
  } catch (error) {
    console.error('Load accounts error:', error)
  }
}

const applyFilters = () => {
  // Filters are applied via computed property
}

const registerPayment = async () => {
  if (!newPayment.value.account_id || !newPayment.value.amount || !newPayment.value.payment_method) {
    registerError.value = t('admin.payments.validationError')
    return
  }

  registerLoading.value = true
  registerError.value = ''

  try {
    const payment = await adminApiClient.registerPayment(newPayment.value)
    payments.value.unshift(payment)
    closeRegisterModal()
  } catch (error) {
    registerError.value = error.message
  } finally {
    registerLoading.value = false
  }
}

const viewPayment = async (payment) => {
  try {
    selectedPayment.value = await adminApiClient.getPayment(payment.id)
    showDetailsModal.value = true
  } catch (error) {
    console.error('Failed to load payment details:', error)
  }
}

const editPayment = (payment) => {
  // This would open an edit modal
  console.log('Edit payment:', payment)
}

const markAsCompleted = async (payment) => {
  try {
    const updatedPayment = await adminApiClient.updatePaymentStatus(payment.id, 'completed')
    const index = payments.value.findIndex(p => p.id === payment.id)
    if (index !== -1) {
      payments.value[index] = { ...payments.value[index], ...updatedPayment }
    }
  } catch (error) {
    console.error('Failed to update payment status:', error)
  }
}

const closeRegisterModal = () => {
  showRegisterModal.value = false
  registerError.value = ''
  newPayment.value = {
    account_id: '',
    amount: '',
    currency: 'USD',
    payment_method: '',
    transaction_id: '',
    description: '',
    billing_period_start: '',
    billing_period_end: ''
  }
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
  selectedPayment.value = null
}

const formatPaymentMethod = (method) => {
  const methodMap = {
    'credit_card': t('admin.payments.creditCard'),
    'bank_transfer': t('admin.payments.bankTransfer'),
    'cash': t('admin.payments.cash'),
    'check': t('admin.payments.check')
  }
  return methodMap[method] || method
}

const formatBillingPeriod = (start, end) => {
  if (!start && !end) return t('admin.payments.na')
  if (!start) return `${t('admin.payments.until')} ${formatDate(end)}`
  if (!end) return `${t('admin.payments.from')} ${formatDate(start)}`
  return `${formatDate(start)} - ${formatDate(end)}`
}
</script>
