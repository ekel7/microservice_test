<template>
  <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-primary min-h-screen">
    <div class="bg-card shadow-lg rounded-lg border border-gray-600">
      <div class="px-4 py-5 sm:p-6">
        <!-- Title - Hidden on mobile, shown on desktop inside card -->
        <div class="mb-6 hidden lg:block">
          <h1 class="text-3xl font-bold text-primary">{{ t('clients.title') }}</h1>
          <p class="mt-2 text-secondary">{{ t('clients.subtitle') }}</p>
        </div>

        <!-- Search Bar, Sort Button and Add Button -->
        <div class="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 sm:space-x-4 mb-6">
          <input
            v-model="searchTerm"
            @input="debouncedSearch"
            type="text"
            :placeholder="t('clients.searchPlaceholder')"
            class="w-full sm:flex-1 px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-accent focus:border-accent"
          />
          <div class="flex space-x-2">
            <button 
              @click="toggleSortOrder"
              class="bg-gray-600 hover:bg-gray-500 hover:scale-105 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1 transition-all duration-200"
              :title="sortByAlphabetical ? t('clients.sortByMembership') : t('clients.sortAlphabetically')"
            >
              <span v-if="sortByAlphabetical" class="font-bold">N°</span>
              <span v-else class="font-bold">A-Z</span>
            </button>
            <button 
              @click="showCreateModal = true"
              class="w-full sm:w-auto bg-accent hover:bg-accent/80 hover:scale-105 text-black px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200"
            >
              {{ t('clients.addClient') }}
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          <p class="mt-2 text-secondary">{{ t('clients.loading') }}</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-900/20 border border-red-400 rounded-md p-4 mb-4">
          <p class="text-red-400">{{ error }}</p>
          <button @click="fetchClients" class="mt-2 text-red-300 hover:text-red-100 hover:scale-105 text-sm transition-all duration-200">
            {{ t('common.tryAgain') }}
          </button>
        </div>

        <!-- Clients Table -->
        <div v-else class="overflow-hidden border border-gray-600 rounded-md">
        <!-- Empty State -->
        <div v-if="clients.length === 0" class="text-center py-12">
          <div class="mx-auto w-12 h-12 text-secondary mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-full h-full">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h3 class="text-lg font-medium text-primary mb-2">{{ t('clients.noClients') }}</h3>
        </div>
        
        <ul v-else class="divide-y divide-gray-600">
          <li v-for="client in sortedClients" :key="client.id" class="px-6 py-4 hover:bg-hover">
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center">
                  <div class="flex-1">
                    <p class="text-sm font-medium text-primary">{{ client.full_name }}</p>
                    <p class="text-sm text-secondary">{{ client.email }}</p>
                    <p class="text-sm text-secondary">{{ client.phone }}</p>
                    <p v-if="client.membership_number" class="text-xs text-accent">
                      {{ t('clients.member') }}: {{ client.membership_number }}
                    </p>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span 
                      :class="client.is_active ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'"
                      class="px-2 py-1 text-xs font-medium rounded-full"
                    >
                      {{ client.is_active ? t('common.active') : t('common.inactive') }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <button 
                  @click="editClient(client)"
                  class="text-accent hover:text-accent/80 hover:scale-105 text-sm transition-all duration-200"
                >
                  {{ t('common.edit') }}
                </button>
                <button 
                  @click="deleteClientConfirm(client)"
                  class="text-red-400 hover:text-red-300 hover:scale-105 text-sm transition-all duration-200"
                >
                  {{ t('common.delete') }}
                </button>
              </div>
            </div>
          </li>
        </ul>

        <!-- Pagination -->
        <div v-if="clients.length > 0 && pagination.totalPages > 1" class="bg-card px-4 py-3 border-t border-gray-600 sm:px-6">
          <div class="flex items-center justify-between">
            <div class="text-sm text-secondary">
              {{ t('clients.showingResults', { 
                start: (pagination.page - 1) * pagination.limit + 1,
                end: Math.min(pagination.page * pagination.limit, pagination.total),
                total: pagination.total
              }) }}
            </div>
            <div class="flex space-x-2">
              <button 
                @click="changePage(pagination.page - 1)"
                :disabled="pagination.page <= 1"
                class="px-3 py-1 text-sm bg-hover hover:bg-accent hover:text-black hover:scale-105 disabled:hover:scale-100 text-secondary rounded disabled:opacity-50 transition-all duration-200"
              >
                {{ t('common.previous') }}
              </button>
              <button 
                @click="changePage(pagination.page + 1)"
                :disabled="pagination.page >= pagination.totalPages"
                class="px-3 py-1 text-sm bg-hover hover:bg-accent hover:text-black hover:scale-105 disabled:hover:scale-100 text-secondary rounded disabled:opacity-50 transition-all duration-200"
              >
                {{ t('common.next') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <CreateClientModal
      v-model="showCreateModal"
      :clients="clients"
      :show-membership-number="true"
      :show-address="true"
      @client-created="handleClientCreated"
    />

    <!-- Edit Modal -->
    <div 
      v-if="editingClient" 
      class="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-start justify-center pt-8 p-4"
      @click.self="closeModal"
    >
        <div class="relative mx-auto border border-gray-600 shadow-lg rounded-xl bg-card max-h-[90vh] overflow-y-auto" style="width: 480px;">
          <div class="p-5">
            <h3 class="text-lg font-medium text-primary mb-4">
              {{ t('clients.editClient') }}
            </h3>
            <form @submit.prevent="saveClient">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-secondary">{{ t('clients.fullName') }}</label>
                  <input
                    v-model="clientForm.full_name"
                    type="text"
                    required
                    class="mt-1 block w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-accent focus:border-accent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-secondary">{{ t('clients.email') }}</label>
                  <input
                    v-model="clientForm.email"
                    type="email"
                    class="mt-1 block w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-accent focus:border-accent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-secondary">{{ t('clients.phone') }}</label>
                  <input
                    v-model="clientForm.phone"
                    type="tel"
                    required
                    class="mt-1 block w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-accent focus:border-accent"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-secondary">{{ t('clients.membershipNumber') }}</label>
                  <div class="mt-1 flex items-center">
                    <input
                      :value="clientForm.membership_number"
                      type="text"
                      readonly
                      class="block w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-300 rounded-md cursor-not-allowed"
                    />
                    <span class="ml-2 text-xs text-secondary">
                      {{ t('clients.membershipAssigned') }}
                    </span>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-secondary">{{ t('clients.address') }}</label>
                  <textarea
                    v-model="clientForm.address"
                    rows="3"
                    class="mt-1 block w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-accent focus:border-accent"
                  ></textarea>
                </div>
                <div>
                  <label class="flex items-center">
                    <input
                      v-model="clientForm.is_active"
                      type="checkbox"
                      class="rounded border-gray-600 text-accent focus:ring-accent bg-hover"
                    />
                    <span class="ml-2 text-sm text-secondary">{{ t('common.active') }}</span>
                  </label>
                </div>
              </div>
              
              <div class="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  @click="closeModal"
                  class="px-4 py-2 text-sm font-medium text-secondary bg-hover hover:bg-card hover:text-primary hover:scale-105 border border-gray-600 rounded-md transition-all duration-200"
                >
                  {{ t('common.cancel') }}
                </button>
                <button
                  type="submit"
                  :disabled="saving"
                  class="px-4 py-2 text-sm font-medium text-black bg-accent hover:bg-accent/80 hover:scale-105 disabled:hover:scale-100 rounded-md disabled:opacity-50 transition-all duration-200"
                >
                  {{ saving ? t('clients.saving') : t('clients.update') }}
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { apiClient } from '../../utils/api.js'
import { useI18n } from '../../i18n/composable.ts'
import CreateClientModal from '../modals/CreateClientModal.vue'

const { t } = useI18n()

const clients = ref([])
const loading = ref(false)
const error = ref('')
const searchTerm = ref('')
const showCreateModal = ref(false)
const editingClient = ref(null)
const saving = ref(false)
const sortByAlphabetical = ref(true)

const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0
})

const clientForm = ref({
  full_name: '',
  email: '',
  phone: '',
  membership_number: '',
  address: '',
  is_active: true
})

// Computed property to sort clients alphabetically or by membership number
const sortedClients = computed(() => {
  const sorted = [...clients.value].sort((a, b) => {
    if (sortByAlphabetical.value) {
      return a.full_name.localeCompare(b.full_name)
    } else {
      // Sort by membership number (numerical)
      // Handle cases where membership_number might be null, undefined, or empty string
      const aMembershipNumber = a.membership_number?.toString().trim() || ''
      const bMembershipNumber = b.membership_number?.toString().trim() || ''
      
      console.log(`Comparing: ${a.full_name} (${aMembershipNumber}) vs ${b.full_name} (${bMembershipNumber})`)
      
      // If both have membership numbers, compare numerically
      if (aMembershipNumber && bMembershipNumber) {
        const aNum = parseInt(aMembershipNumber, 10)
        const bNum = parseInt(bMembershipNumber, 10)
        console.log(`  → Numeric comparison: ${aNum} vs ${bNum} = ${aNum - bNum}`)
        return aNum - bNum
      }
      
      // If only one has a membership number, prioritize the one with the number
      if (aMembershipNumber && !bMembershipNumber) {
        console.log(`  → ${a.full_name} has number, ${b.full_name} doesn't`)
        return -1 // a comes first
      }
      if (!aMembershipNumber && bMembershipNumber) {
        console.log(`  → ${b.full_name} has number, ${a.full_name} doesn't`)
        return 1 // b comes first
      }
      
      // If neither has a membership number, sort alphabetically as fallback
      console.log(`  → Both without numbers, alphabetical fallback`)
      return a.full_name.localeCompare(b.full_name)
    }
  })
  
  if (!sortByAlphabetical.value) {
    console.log('Final sorted order by membership:', sorted.map(c => `${c.full_name}: ${c.membership_number}`))
  }
  
  return sorted
})

// Computed property to calculate next membership number
const nextMembershipNumber = computed(() => {
  if (clients.value.length === 0) return '0001'
  
  // Get all existing membership numbers
  const existingNumbers = clients.value
    .map(client => client.membership_number)
    .filter(num => num && num.length > 0)
    .map(num => parseInt(num, 10))
    .filter(num => !isNaN(num))
  
  // Find the highest number and add 1
  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
  const nextNumber = maxNumber + 1
  
  // Format with leading zeros (4 digits)
  return nextNumber.toString().padStart(4, '0')
})

let searchTimeout = null

const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1
    fetchClients()
  }, 300)
}

const fetchClients = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit
    }
    
    if (searchTerm.value.trim()) {
      params.search = searchTerm.value.trim()
    }
    
    const data = await apiClient.getClients(params)
    
    clients.value = data.clients
    pagination.value = {
      page: data.page,
      limit: data.limit,
      total: data.total,
      totalPages: data.totalPages
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Function to assign membership numbers to clients without them
const assignMembershipNumbers = async () => {
  try {
    console.log('Starting assignMembershipNumbers...')
    
    // Get all clients to check for missing membership numbers
    const allClientsData = await apiClient.getClients({ limit: 1000 }) // Get all clients
    console.log('All clients data:', allClientsData)
    
    const allClients = allClientsData.clients || allClientsData.data || allClientsData
    console.log('Extracted clients array:', allClients)
    
    const clientsWithoutMembership = allClients.filter(
      client => !client.membership_number || client.membership_number.trim() === ''
    )
    
    console.log('Clients without membership:', clientsWithoutMembership)
    
    if (clientsWithoutMembership.length === 0) {
      console.log('All clients already have membership numbers')
      return
    }
    
    console.log(`Assigning membership numbers to ${clientsWithoutMembership.length} clients`)
    
    // Get existing membership numbers to start from the right number
    const existingNumbers = allClients
      .map(client => client.membership_number)
      .filter(num => num && num.length > 0)
      .map(num => parseInt(num, 10))
      .filter(num => !isNaN(num))
    
    console.log('Existing membership numbers:', existingNumbers)
    
    let nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
    console.log('Starting next number:', nextNumber)
    
    // Update each client without membership number
    for (const client of clientsWithoutMembership) {
      const membershipNumber = nextNumber.toString().padStart(4, '0')
      console.log(`Assigning membership ${membershipNumber} to ${client.full_name}`)
      
      try {
        await apiClient.updateClient(client.id, {
          ...client,
          membership_number: membershipNumber
        })
        console.log(`✓ Successfully assigned ${membershipNumber} to ${client.full_name}`)
      } catch (updateError) {
        console.error(`✗ Failed to assign ${membershipNumber} to ${client.full_name}:`, updateError)
      }
      
      nextNumber++
    }
    
    // Refresh the client list
    await fetchClients()
    console.log('Membership numbers assignment completed. Refreshed client list.')
    
  } catch (err) {
    console.error('Error assigning membership numbers:', err)
  }
}

const changePage = (newPage) => {
  if (newPage >= 1 && newPage <= pagination.value.totalPages) {
    pagination.value.page = newPage
    fetchClients()
  }
}

const editClient = (client) => {
  editingClient.value = client
  clientForm.value = { ...client }
}

const closeModal = () => {
  showCreateModal.value = false
  editingClient.value = null
  clientForm.value = {
    full_name: '',
    email: '',
    phone: '',
    membership_number: '',
    address: '',
    is_active: true
  }
}

const handleClientCreated = async (newClient) => {
  // Refresh the clients list to include the new client
  await fetchClients()
}

const saveClient = async () => {
  saving.value = true
  error.value = '' // Clear previous errors
  
  try {
    // This is only for editing clients now, creation is handled by the modal
    if (editingClient.value) {
      await apiClient.updateClient(editingClient.value.id, clientForm.value)
      closeModal()
      fetchClients()
    }
  } catch (err) {
    console.error('Error saving client:', err)
    // Handle specific backend errors
    if (err.message.includes('Email already exists')) {
      error.value = t('clients.errors.emailExists') || 'Este email ya está registrado'
    } else {
      error.value = err.message || t('clients.errors.createFailed') || 'Error al guardar el cliente'
    }
  } finally {
    saving.value = false
  }
}

const deleteClientConfirm = (client) => {
  const confirmMessage = t('clients.deleteConfirm', { name: client.full_name })
  if (confirm(confirmMessage)) {
    deleteClient(client.id)
  }
}

const deleteClient = async (id) => {
  try {
    await apiClient.deleteClient(id)
    fetchClients()
  } catch (err) {
    error.value = err.message
  }
}

// Toggle sort order between alphabetical and membership number
const toggleSortOrder = () => {
  sortByAlphabetical.value = !sortByAlphabetical.value
}

// ESC key handling
const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    if (showCreateModal.value || editingClient.value) {
      closeModal()
      event.preventDefault()
      event.stopPropagation()
    }
  }
}

onMounted(async () => {
  await fetchClients()
  // Assign membership numbers to clients without them
  await assignMembershipNumbers()
  // Add ESC key listener
  document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  // Clean up event listener
  document.removeEventListener('keydown', handleKeyDown)
})
</script>
