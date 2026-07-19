<template>
  <div class="max-w-7xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-3xl font-bold text-primary">{{ t('admin.accounts.title') }}</h2>
      <button @click="showCreateModal = true" class="bg-accent hover:bg-accent/80 hover:scale-105 text-black px-4 py-2 rounded-md text-sm font-medium transition-all duration-200">
        + {{ t('admin.accounts.createAccount') }}
      </button>
    </div>

    <div v-if="loading" class="flex justify-center items-center py-20">
      <p class="text-secondary text-lg">{{ t('admin.accounts.loading') }}</p>
    </div>

    <div v-else>
      <!-- Filters -->
      <div class="bg-card rounded-lg shadow-lg border border-gray-600 p-4 mb-6">
        <div class="flex flex-wrap gap-4 items-center">
          <select 
            v-model="statusFilter" 
            @change="loadAccounts"
            class="px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          >
            <option value="">{{ t('admin.accounts.allStatus') }}</option>
            <option value="active">{{ t('admin.overview.active') }}</option>
            <option value="suspended">{{ t('admin.overview.suspended') }}</option>
            <option value="trial">{{ t('admin.overview.trial') }}</option>
          </select>
          
          <input
            v-model="searchQuery"
            @input="debounceSearch"
            type="text"
            :placeholder="t('admin.accounts.searchPlaceholder')"
            class="flex-1 max-w-sm px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          />
        </div>
      </div>

      <!-- Accounts Table -->
      <div class="bg-card rounded-lg shadow-lg border border-gray-600 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-600">
            <thead class="bg-hover">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.accounts.name') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.accounts.slug') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.accounts.status') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.accounts.plan') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.accounts.users') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">{{ t('admin.accounts.courts') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ t('admin.accounts.created') }}</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{{ t('admin.accounts.actions') }}</th>
              </tr>
            </thead>
            <tbody class="bg-card divide-y divide-gray-600">
              <tr v-for="account in filteredAccounts" :key="account.id" class="hover:bg-hover">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="font-medium text-primary">{{ account.name }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-secondary">{{ account.slug }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="[
                    'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                    account.status === 'active' ? 'bg-green-900/30 text-green-300' :
                    account.status === 'suspended' ? 'bg-red-900/30 text-red-300' :
                    account.status === 'trial' ? 'bg-yellow-900/30 text-yellow-300' :
                    'bg-gray-700/30 text-gray-300'
                  ]">
                    {{ account.status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">{{ account.subscription_plan }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">{{ account.users?.[0]?.count || 0 }}/{{ account.max_users }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">{{ account.courts?.[0]?.count || 0 }}/{{ account.max_courts }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                  <LocalizedDate :date="account.created_at" />
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex space-x-2">
                    <button 
                      @click="viewAccount(account)"
                      class="p-2 text-secondary hover:text-primary hover:scale-105 border border-gray-600 rounded-md hover:bg-hover transition-all duration-200"
                      :title="t('admin.accounts.viewDetails')"
                    >
                      👁️
                    </button>
                    <button 
                      @click="editAccount(account)"
                      class="p-2 text-blue-400 hover:text-blue-300 hover:scale-105 border border-gray-600 rounded-md hover:bg-hover transition-all duration-200"
                      :title="t('admin.accounts.editAccount')"
                    >
                      ✏️
                    </button>
                    <button 
                      @click="toggleAccountStatus(account)"
                      :class="[
                        'p-2 border border-gray-600 rounded-md hover:scale-105 transition-all duration-200',
                        account.status === 'active' 
                          ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20' 
                          : 'text-green-400 hover:text-green-300 hover:bg-green-900/20'
                      ]"
                      :title="account.status === 'active' ? t('admin.accounts.suspend') : t('admin.accounts.activate')"
                    >
                      {{ account.status === 'active' ? '⏸️' : '▶️' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="filteredAccounts.length === 0" class="text-center py-12">
            <p class="text-secondary">{{ t('admin.accounts.noAccountsFound') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Account Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50" @click="closeCreateModal">
      <div class="relative top-10 mx-auto p-5 border border-gray-600 w-full max-w-lg shadow-lg rounded-md bg-card" @click.stop>
        <div class="mt-3">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-primary">{{ t('admin.accounts.createAccount') }}</h3>
            <button @click="closeCreateModal" class="text-secondary hover:text-primary hover:scale-105 text-2xl transition-all duration-200">&times;</button>
          </div>
        
          <form @submit.prevent="createAccount" class="space-y-4">
            <div>
              <label for="name" class="block text-sm font-medium text-secondary">{{ t('admin.accounts.name') }} *</label>
              <input
                id="name"
                v-model="newAccount.name"
                type="text"
                required
                placeholder="Tennis Club Name"
                class="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-accent focus:border-accent"
              />
            </div>

            <div>
              <label for="slug" class="block text-sm font-medium text-secondary">{{ t('admin.accounts.slug') }} *</label>
              <input
                id="slug"
                v-model="newAccount.slug"
                type="text"
                required
                placeholder="tennis-club-unique"
                pattern="[a-z0-9-]+"
                title="Only lowercase letters, numbers, and hyphens allowed"
                class="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-accent focus:border-accent"
              />
              <p class="mt-1 text-xs text-secondary">Used for subdomain/routing (lowercase, numbers, hyphens only)</p>
            </div>

            <div>
              <label for="timezone" class="block text-sm font-medium text-secondary">{{ t('admin.accounts.timezone') }} *</label>
              <select
                id="timezone"
                v-model="newAccount.timezone"
                required
                class="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-accent focus:border-accent"
              >
                <option value="America/Argentina/Buenos_Aires">Argentina/Buenos Aires (UTC-3)</option>
                <option value="America/Argentina/Cordoba">Argentina/Córdoba (UTC-3)</option>
                <option value="America/Argentina/Mendoza">Argentina/Mendoza (UTC-3)</option>
                <option value="America/Montevideo">Uruguay/Montevideo (UTC-3)</option>
                <option value="America/Santiago">Chile/Santiago (UTC-3/UTC-4)</option>
                <option value="America/Sao_Paulo">Brasil/São Paulo (UTC-3)</option>
                <option value="America/Lima">Perú/Lima (UTC-5)</option>
                <option value="America/Bogota">Colombia/Bogotá (UTC-5)</option>
                <option value="America/Caracas">Venezuela/Caracas (UTC-4)</option>
                <option value="America/Mexico_City">México/Ciudad de México (UTC-6)</option>
                <option value="America/New_York">Estados Unidos/Nueva York (UTC-5/UTC-4)</option>
                <option value="America/Los_Angeles">Estados Unidos/Los Ángeles (UTC-8/UTC-7)</option>
                <option value="Europe/Madrid">España/Madrid (UTC+1/UTC+2)</option>
                <option value="Europe/London">Reino Unido/Londres (UTC+0/UTC+1)</option>
                <option value="UTC">UTC (Tiempo Universal)</option>
              </select>
              <p class="mt-1 text-xs text-secondary">Timezone for rental scheduling and display</p>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div>
                <label for="plan" class="block text-sm font-medium text-secondary">{{ t('admin.accounts.plan') }}</label>
                <select id="plan" v-model="newAccount.subscription_plan" class="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-accent focus:border-accent">
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div>
                <label for="max_courts" class="block text-sm font-medium text-secondary">{{ t('admin.accounts.courts') }} (Max)</label>
                <input
                  id="max_courts"
                  v-model.number="newAccount.max_courts"
                  type="number"
                  min="1"
                  max="50"
                  class="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label for="max_users" class="block text-sm font-medium text-secondary">{{ t('admin.accounts.users') }} (Max)</label>
                <input
                  id="max_users"
                  v-model.number="newAccount.max_users"
                  type="number"
                  min="1"
                  max="100"
                  class="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-accent focus:border-accent"
                />
              </div>
            </div>

            <div class="border-t pt-4">
              <h4 class="text-md font-medium text-primary mb-3">{{ t('admin.accounts.adminUserInfo') }}</h4>
              
              <div>
                <label for="admin_email" class="block text-sm font-medium text-secondary">{{ t('admin.accounts.adminEmail') }} *</label>
                <input
                  id="admin_email"
                  v-model="newAccount.admin_email"
                  type="email"
                  required
                  placeholder="admin@example.com"
                  class="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-accent focus:border-accent"
                />
              </div>

              <div class="mt-3">
                <label for="admin_full_name" class="block text-sm font-medium text-secondary">{{ t('admin.accounts.adminFullName') }} *</label>
                <input
                  id="admin_full_name"
                  v-model="newAccount.admin_full_name"
                  type="text"
                  required
                  placeholder="John Doe"
                  class="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-accent focus:border-accent"
                />
              </div>

              <div class="mt-3">
                <label for="admin_password" class="block text-sm font-medium text-secondary">{{ t('admin.accounts.adminPassword') }} *</label>
                <input
                  id="admin_password"
                  v-model="newAccount.admin_password"
                  type="password"
                  required
                  :placeholder="t('admin.accounts.adminPasswordPlaceholder')"
                  minlength="6"
                  class="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-accent focus:border-accent"
                />
                <p class="mt-1 text-xs text-secondary">{{ t('admin.accounts.adminPasswordHelp') }}</p>
              </div>
            </div>

            <div class="flex justify-end space-x-3 mt-6">
              <button type="button" @click="closeCreateModal" class="px-4 py-2 text-sm font-medium text-secondary bg-hover hover:bg-gray-600 rounded-md border border-gray-600">
                {{ t('admin.accounts.cancel') }}
              </button>
              <button type="submit" :disabled="createLoading" class="px-4 py-2 text-sm font-medium text-black bg-accent hover:bg-lime-300 hover:scale-105 disabled:hover:scale-100 rounded-md disabled:opacity-50 transition-all duration-200">
                {{ createLoading ? t('admin.accounts.creating') : t('admin.accounts.createAccount') }}
              </button>
            </div>

            <div v-if="createError" class="mt-4 p-3 bg-red-900/30 border border-red-600 rounded-md">
              <p class="text-red-300 text-sm">{{ createError }}</p>
            </div>
          </form>
      </div>
      </div>
    </div>

    <!-- Edit Account Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4" @click="closeEditModal">
      <div class="relative mx-auto border border-gray-600 w-full max-w-md shadow-lg rounded-md bg-card max-h-[90vh] overflow-y-auto" @click.stop>
        <div class="p-5">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-primary">{{ t('admin.accounts.editAccount') }}</h3>
            <button @click="closeEditModal" class="text-secondary hover:text-primary text-2xl">&times;</button>
          </div>
        
          <form @submit.prevent="updateAccount" class="space-y-4">
            <div>
              <label for="edit-name" class="block text-sm font-medium text-secondary">{{ t('admin.accounts.name') }} *</label>
              <input
                id="edit-name"
                v-model="editAccountForm.name"
                type="text"
                required
                placeholder="Tennis Club Name"
                class="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-accent focus:border-accent"
              />
            </div>

            <div>
              <label for="edit-slug" class="block text-sm font-medium text-secondary">{{ t('admin.accounts.slug') }} *</label>
              <input
                id="edit-slug"
                v-model="editAccountForm.slug"
                type="text"
                required
                placeholder="tennis-club-unique"
                pattern="[a-z0-9-]+"
                title="Only lowercase letters, numbers, and hyphens allowed"
                class="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-accent focus:border-accent"
              />
              <p class="mt-1 text-xs text-secondary">Used for subdomain/routing (lowercase, numbers, hyphens only)</p>
            </div>

            <div>
              <label for="edit-timezone" class="block text-sm font-medium text-secondary">{{ t('admin.accounts.timezone') }} *</label>
              <select
                id="edit-timezone"
                v-model="editAccountForm.timezone"
                required
                class="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-accent focus:border-accent"
              >
                <option value="America/Argentina/Buenos_Aires">Argentina/Buenos Aires (UTC-3)</option>
                <option value="America/Argentina/Cordoba">Argentina/Córdoba (UTC-3)</option>
                <option value="America/Argentina/Mendoza">Argentina/Mendoza (UTC-3)</option>
                <option value="America/Montevideo">Uruguay/Montevideo (UTC-3)</option>
                <option value="America/Santiago">Chile/Santiago (UTC-3/UTC-4)</option>
                <option value="America/Sao_Paulo">Brasil/São Paulo (UTC-3)</option>
                <option value="America/Lima">Perú/Lima (UTC-5)</option>
                <option value="America/Bogota">Colombia/Bogotá (UTC-5)</option>
                <option value="America/Caracas">Venezuela/Caracas (UTC-4)</option>
                <option value="America/Mexico_City">México/Ciudad de México (UTC-6)</option>
                <option value="America/New_York">Estados Unidos/Nueva York (UTC-5/UTC-4)</option>
                <option value="America/Los_Angeles">Estados Unidos/Los Ángeles (UTC-8/UTC-7)</option>
                <option value="Europe/Madrid">España/Madrid (UTC+1/UTC+2)</option>
                <option value="Europe/London">Reino Unido/Londres (UTC+0/UTC+1)</option>
                <option value="UTC">UTC (Tiempo Universal)</option>
              </select>
              <p class="mt-1 text-xs text-secondary">Timezone for rental scheduling and display</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="edit-plan" class="block text-sm font-medium text-secondary">{{ t('admin.accounts.plan') }}</label>
                <select id="edit-plan" v-model="editAccountForm.subscription_plan" class="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-accent focus:border-accent">
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>

              <div>
                <label for="edit-status" class="block text-sm font-medium text-secondary">{{ t('admin.accounts.status') }}</label>
                <select id="edit-status" v-model="editAccountForm.status" class="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-accent focus:border-accent">
                  <option value="active">{{ t('admin.overview.active') }}</option>
                  <option value="suspended">{{ t('admin.overview.suspended') }}</option>
                  <option value="trial">{{ t('admin.overview.trial') }}</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="edit-max-courts" class="block text-sm font-medium text-secondary">{{ t('admin.accounts.courts') }} (Max)</label>
                <input
                  id="edit-max-courts"
                  v-model.number="editAccountForm.max_courts"
                  type="number"
                  min="1"
                  max="50"
                  class="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label for="edit-max-users" class="block text-sm font-medium text-secondary">{{ t('admin.accounts.users') }} (Max)</label>
                <input
                  id="edit-max-users"
                  v-model.number="editAccountForm.max_users"
                  type="number"
                  min="1"
                  max="100"
                  class="mt-1 block w-full px-3 py-2 border border-gray-600 rounded-md bg-hover text-primary focus:outline-none focus:ring-accent focus:border-accent"
                />
              </div>
            </div>

            <div class="flex justify-end space-x-3 mt-6">
              <button type="button" @click="closeEditModal" class="px-4 py-2 text-sm font-medium text-secondary bg-hover hover:bg-gray-600 rounded-md border border-gray-600">
                {{ t('admin.accounts.cancel') }}
              </button>
              <button type="submit" :disabled="editLoading" class="px-4 py-2 text-sm font-medium text-black bg-accent hover:bg-lime-300 hover:scale-105 disabled:hover:scale-100 rounded-md disabled:opacity-50 transition-all duration-200">
                {{ editLoading ? t('admin.accounts.updating') : t('admin.accounts.save') }}
              </button>
            </div>

            <div v-if="editError" class="mt-4 p-3 bg-red-900/30 border border-red-600 rounded-md">
              <p class="text-red-300 text-sm">{{ editError }}</p>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Account Details Modal -->
    <div v-if="showDetailsModal" class="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4" @click="closeDetailsModal">
      <div class="relative mx-auto border border-gray-600 w-full max-w-4xl shadow-lg rounded-md bg-card max-h-[90vh] overflow-y-auto" @click.stop>
        <div class="p-5">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-primary">{{ selectedAccount?.name }} - {{ t('admin.accounts.details') }}</h3>
            <button @click="closeDetailsModal" class="text-secondary hover:text-primary text-2xl">&times;</button>
          </div>
        
          <div class="space-y-6">
            <div>
              <h4 class="text-md font-medium text-primary mb-4">{{ t('admin.accounts.accountInformation') }}</h4>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-secondary">{{ t('admin.accounts.name') }}:</label>
                  <span class="text-sm text-primary">{{ selectedAccount?.name }}</span>
                </div>
                <div>
                  <label class="block text-sm font-medium text-secondary">{{ t('admin.accounts.slug') }}:</label>
                  <span class="text-sm text-primary">{{ selectedAccount?.slug }}</span>
                </div>
                <div>
                  <label class="block text-sm font-medium text-secondary">{{ t('admin.accounts.status') }}:</label>
                  <span :class="[
                    'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                    selectedAccount?.status === 'active' ? 'bg-green-900/30 text-green-300' :
                    selectedAccount?.status === 'suspended' ? 'bg-red-900/30 text-red-300' :
                    selectedAccount?.status === 'trial' ? 'bg-yellow-900/30 text-yellow-300' :
                    'bg-gray-700/30 text-gray-300'
                  ]">
                    {{ selectedAccount?.status }}
                  </span>
                </div>
                <div>
                  <label class="block text-sm font-medium text-secondary">{{ t('admin.accounts.plan') }}:</label>
                  <span class="text-sm text-primary">{{ selectedAccount?.subscription_plan }}</span>
                </div>
                <div>
                  <label class="block text-sm font-medium text-secondary">{{ t('admin.accounts.created') }}:</label>
                  <span class="text-sm text-primary">{{ formatDate(selectedAccount?.created_at) }}</span>
                </div>
                <div>
                  <label class="block text-sm font-medium text-secondary">{{ t('admin.accounts.updated') }}:</label>
                  <span class="text-sm text-primary">{{ formatDate(selectedAccount?.updated_at) }}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 class="text-md font-medium text-primary mb-4">{{ t('admin.accounts.usageAndLimits') }}</h4>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-secondary mb-2">{{ t('admin.accounts.users') }}:</label>
                  <div class="w-full bg-gray-600 rounded-full h-4 relative">
                    <div class="bg-blue-500 h-4 rounded-full" :style="{ width: getUsersPercentage() + '%' }"></div>
                    <span class="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary">
                      {{ selectedAccount?.users?.length || 0 }} / {{ selectedAccount?.max_users }}
                    </span>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-secondary mb-2">{{ t('admin.accounts.courts') }}:</label>
                  <div class="w-full bg-gray-600 rounded-full h-4 relative">
                    <div class="bg-green-500 h-4 rounded-full" :style="{ width: getCourtsPercentage() + '%' }"></div>
                    <span class="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary">
                      {{ selectedAccount?.courts?.length || 0 }} / {{ selectedAccount?.max_courts }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '../../i18n/composable'
import { adminApiClient } from '../../utils/adminApi.js'
import { useDateLocalization } from '../../composables/useDateLocalization.ts'
import LocalizedDate from '../common/LocalizedDate.vue'

const { t } = useI18n()
const { formatDate } = useDateLocalization()
const loading = ref(true)
const accounts = ref([])
const statusFilter = ref('')
const searchQuery = ref('')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showDetailsModal = ref(false)
const selectedAccount = ref(null)
const createLoading = ref(false)
const editLoading = ref(false)
const createError = ref('')
const editError = ref('')

const newAccount = ref({
  name: '',
  slug: '',
  timezone: 'America/Argentina/Buenos_Aires',
  subscription_plan: 'basic',
  max_courts: 5,
  max_users: 10,
  admin_email: '',
  admin_full_name: '',
  admin_password: ''
})

const editAccountForm = ref({
  id: null,
  name: '',
  slug: '',
  timezone: 'America/Argentina/Buenos_Aires',
  subscription_plan: 'basic',
  max_courts: 5,
  max_users: 10,
  status: 'active'
})

let searchTimeout = null

onMounted(async () => {
  await loadAccounts()
})

const filteredAccounts = computed(() => {
  let filtered = accounts.value

  if (statusFilter.value) {
    filtered = filtered.filter(account => account.status === statusFilter.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(account => 
      account.name.toLowerCase().includes(query) ||
      account.slug.toLowerCase().includes(query)
    )
  }

  return filtered
})

const loadAccounts = async () => {
  try {
    accounts.value = await adminApiClient.getAccounts()
  } catch (error) {
    console.error('Load accounts error:', error)
  } finally {
    loading.value = false
  }
}

const debounceSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    // Search is handled by computed property
  }, 300)
}

const createAccount = async () => {
  if (!newAccount.value.name || !newAccount.value.slug || !newAccount.value.admin_email || !newAccount.value.admin_full_name || !newAccount.value.admin_password) {
    createError.value = 'All fields including admin user information are required'
    return
  }

  if (newAccount.value.admin_password.length < 6) {
    createError.value = 'Admin password must be at least 6 characters'
    return
  }

  createLoading.value = true
  createError.value = ''

  try {
    const result = await adminApiClient.createAccount(newAccount.value)
    accounts.value.push(result.account)
    closeCreateModal()
  } catch (error) {
    createError.value = error.message
  } finally {
    createLoading.value = false
  }
}

const updateAccount = async () => {
  if (!editAccountForm.value.name || !editAccountForm.value.slug) {
    editError.value = 'Name and slug are required'
    return
  }

  editLoading.value = true
  editError.value = ''

  try {
    const updatedAccount = await adminApiClient.updateAccount(editAccountForm.value.id, editAccountForm.value)
    const index = accounts.value.findIndex(a => a.id === editAccountForm.value.id)
    if (index !== -1) {
      accounts.value[index] = { ...accounts.value[index], ...updatedAccount }
    }
    closeEditModal()
  } catch (error) {
    editError.value = error.message
  } finally {
    editLoading.value = false
  }
}

const viewAccount = async (account) => {
  try {
    selectedAccount.value = await adminApiClient.getAccount(account.id)
    showDetailsModal.value = true
  } catch (error) {
    console.error('Failed to load account details:', error)
  }
}

const editAccount = (account) => {
  editAccountForm.value = {
    id: account.id,
    name: account.name,
    slug: account.slug,
    timezone: account.timezone || 'America/Argentina/Buenos_Aires',
    subscription_plan: account.subscription_plan,
    max_courts: account.max_courts,
    max_users: account.max_users,
    status: account.status
  }
  showEditModal.value = true
}

const toggleAccountStatus = async (account) => {
  const newStatus = account.status === 'active' ? 'suspended' : 'active'

  try {
    const updatedAccount = await adminApiClient.updateAccountStatus(account.id, newStatus)
    const index = accounts.value.findIndex(a => a.id === account.id)
    if (index !== -1) {
      accounts.value[index] = { ...accounts.value[index], ...updatedAccount }
    }
  } catch (error) {
    console.error('Failed to update account status:', error)
  }
}

const closeCreateModal = () => {
  showCreateModal.value = false
  createError.value = ''
  newAccount.value = {
    name: '',
    slug: '',
    timezone: 'America/Argentina/Buenos_Aires',
    subscription_plan: 'basic',
    max_courts: 5,
    max_users: 10,
    admin_email: '',
    admin_full_name: '',
    admin_password: ''
  }
}

const closeEditModal = () => {
  showEditModal.value = false
  editError.value = ''
  editAccountForm.value = {
    id: null,
    name: '',
    slug: '',
    timezone: 'America/Argentina/Buenos_Aires',
    subscription_plan: 'basic',
    max_courts: 5,
    max_users: 10,
    status: 'active'
  }
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
  selectedAccount.value = null
}

const getUsersPercentage = () => {
  if (!selectedAccount.value) return 0
  const used = selectedAccount.value.users?.length || 0
  const max = selectedAccount.value.max_users || 1
  return Math.min((used / max) * 100, 100)
}

const getCourtsPercentage = () => {
  if (!selectedAccount.value) return 0
  const used = selectedAccount.value.courts?.length || 0
  const max = selectedAccount.value.max_courts || 1
  return Math.min((used / max) * 100, 100)
}
</script>
