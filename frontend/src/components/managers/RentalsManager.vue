<template>
  <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 bg-primary h-screen flex flex-col">
    <!-- Rentals Management Content -->
    <div class="bg-card shadow-lg rounded-lg border border-gray-600 flex-1 flex flex-col overflow-hidden">
      <div class="px-4 py-5 sm:p-6 flex flex-col flex-1 overflow-hidden">
        <!-- Title - Hidden on mobile, shown on desktop inside card -->
        <div class="mb-6 hidden lg:block">
          <h1 class="text-3xl font-bold text-primary">{{ t('rentals.management') }}</h1>
          <p class="mt-2 text-secondary">{{ t('rentals.managementSubtitle') }}</p>
        </div>

        <div class="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6">
          <!-- Left side: View buttons -->
          <div class="flex space-x-2">
            <button 
              @click="switchToAgendaView"
              :class="currentView === 'agenda' ? 'text-black bg-accent hover:bg-accent/80' : 'text-secondary bg-hover hover:bg-gray-600 hover:text-primary'"
              class="px-3 py-1 text-sm font-medium border border-gray-600 rounded-md cursor-pointer transition-colors duration-200"
              title="Vista Agenda"
            >
              📋
            </button>
            <button 
              @click="switchToCalendarView"
              :class="currentView === 'calendar' ? 'text-black bg-accent hover:bg-accent/80' : 'text-secondary bg-hover hover:bg-gray-600 hover:text-primary'"
              class="px-3 py-1 text-sm font-medium border border-gray-600 rounded-md cursor-pointer transition-colors duration-200"
              title="Vista Calendario"
            >
              📅
            </button>
          </div>
          
          <!-- Right side: Filters and actions -->
          <div class="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
            <select 
              v-model="statusFilter" 
              @change="applyFilters"
              class="px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent text-sm"
            >
              <option value="">{{ t('rentals.allStatuses') }}</option>
              <option value="confirmed">{{ t('rentals.confirmed') }}</option>
              <option value="pending">{{ t('rentals.pending') }}</option>
              <option value="cancelled">{{ t('rentals.cancelled') }}</option>
            </select>
            <!-- Date Filter Picker -->
            <div class="relative" data-filter-date-picker>
              <button
                type="button"
                @click="toggleFilterDatePicker"
                class="px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent text-sm flex items-center justify-between min-w-[140px]"
              >
                <span>{{ dateFilter ? formatFilterDate(dateFilter) : 'Filtrar por fecha' }}</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              <!-- Filter Date Picker Dropdown -->
              <div v-if="showFilterDatePicker" class="absolute z-30 mt-1 bg-card border border-gray-600 rounded-lg shadow-lg p-4" style="width: 300px;">
                <!-- Month Navigation -->
                <div class="flex items-center justify-between mb-4">
                  <button type="button" @click="previousFilterMonth" class="p-1 rounded hover:bg-hover">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h3 class="text-lg font-semibold text-primary">{{ filterPickerMonthLabel }}</h3>
                  <button type="button" @click="nextFilterMonth" class="p-1 rounded hover:bg-hover">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <!-- Days Grid -->
                <div class="grid grid-cols-7 gap-1 text-center text-xs">
                  <div class="p-2 font-medium text-secondary">Dom</div>
                  <div class="p-2 font-medium text-secondary">Lun</div>
                  <div class="p-2 font-medium text-secondary">Mar</div>
                  <div class="p-2 font-medium text-secondary">Mié</div>
                  <div class="p-2 font-medium text-secondary">Jue</div>
                  <div class="p-2 font-medium text-secondary">Vie</div>
                  <div class="p-2 font-medium text-secondary">Sáb</div>
                  
                  <button 
                    v-for="day in filterPickerDays" 
                    :key="day.date.toISOString()"
                    type="button"
                    @click="selectFilterDate(day)"
                    :class="[
                      'p-2 rounded hover:bg-accent hover:text-black transition-colors',
                      day.isCurrentMonth ? 'text-primary' : 'text-gray-500',
                      day.isToday ? 'bg-blue-600 text-white' : '',
                      day.isSelected ? 'bg-accent text-black' : ''
                    ]"
                  >
                    {{ day.date.getDate() }}
                  </button>
                </div>

                <!-- Clear Filter Option -->
                <div class="mt-4 pt-3 border-t border-gray-600">
                  <button
                    type="button"
                    @click="clearDateFilter"
                    class="w-full px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-hover rounded-md transition-colors"
                  >
                    Limpiar filtro de fecha
                  </button>
                </div>
              </div>
            </div>
            <button 
              @click="clearFilters"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-white rounded-md hover:scale-105 transition-all duration-200"
            >
              {{ t('rentals.clearFilters') }}
            </button>
            <button 
              @click="openRentalModal()"
              class="bg-accent hover:bg-accent/80 hover:scale-105 text-black px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            >
              {{ t('rentals.newRental') }}
            </button>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
          <p class="mt-2 text-secondary">{{ t('rentals.loading') }}</p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="bg-red-900/20 border border-red-400 rounded-md p-4 mb-4">
          <p class="text-red-400">{{ error }}</p>
          <button @click="loadRentals" class="mt-2 text-red-300 hover:text-red-100 text-sm">
            {{ t('rentals.tryAgain') }}
          </button>
        </div>


        <!-- Agenda View -->
        <div v-else-if="currentView === 'agenda'" class="flex flex-col flex-1 overflow-hidden">
          <div class="flex items-center justify-between mb-4">
            <button 
              @click="previousDay"
              class="px-3 py-1 text-sm font-medium text-secondary bg-card border border-gray-600 rounded-md hover:bg-hover hover:text-primary"
            >
              {{ t('rentals.previous') }}
            </button>
            <h3 class="text-lg font-semibold text-primary">{{ currentDayLabel }}</h3>
            <button 
              @click="nextDay"
              class="px-3 py-1 text-sm font-medium text-secondary bg-card border border-gray-600 rounded-md hover:bg-hover hover:text-primary"
            >
              {{ t('rentals.next') }}
            </button>
          </div>
          <div class="flex-1 overflow-hidden">
            <AgendaView
              :date="currentDate.toJSDate()"
              :rentals="agendaRentals"
              :courts="availableCourts"
              :highlighted-rental-id="highlightedRentalId"
              @rental-click="openRentalModal"
              @cell-click="handleAgendaCellClick"
            />
          </div>
        </div>

        <!-- Calendar View -->
        <div v-else-if="currentView === 'calendar'" class="flex flex-col flex-1 overflow-hidden">
          <div class="flex items-center justify-between mb-4">
            <button 
              @click="previousMonth"
              class="px-3 py-1 text-sm font-medium text-secondary bg-card border border-gray-600 rounded-md hover:bg-hover hover:text-primary"
            >
              {{ t('rentals.previous') }}
            </button>
            <h3 class="text-lg font-semibold text-primary">{{ currentMonthLabel }}</h3>
            <button 
              @click="nextMonth"
              class="px-3 py-1 text-sm font-medium text-secondary bg-card border border-gray-600 rounded-md hover:bg-hover hover:text-primary"
            >
              {{ t('rentals.next') }}
            </button>
          </div>
          
          <!-- Calendar Grid View -->
          <div class="border border-gray-600 rounded-lg overflow-hidden flex-1 flex flex-col">
            <!-- Calendar Headers -->
            <div class="grid grid-cols-7 bg-hover border-b border-gray-600">
              <div class="text-center text-sm font-medium text-primary p-3 border-r border-gray-600 last:border-r-0">{{ t('calendar.sun') }}</div>
              <div class="text-center text-sm font-medium text-primary p-3 border-r border-gray-600 last:border-r-0">{{ t('calendar.mon') }}</div>
              <div class="text-center text-sm font-medium text-primary p-3 border-r border-gray-600 last:border-r-0">{{ t('calendar.tue') }}</div>
              <div class="text-center text-sm font-medium text-primary p-3 border-r border-gray-600 last:border-r-0">{{ t('calendar.wed') }}</div>
              <div class="text-center text-sm font-medium text-primary p-3 border-r border-gray-600 last:border-r-0">{{ t('calendar.thu') }}</div>
              <div class="text-center text-sm font-medium text-primary p-3 border-r border-gray-600 last:border-r-0">{{ t('calendar.fri') }}</div>
              <div class="text-center text-sm font-medium text-primary p-3">{{ t('calendar.sat') }}</div>
            </div>
            
            <!-- Calendar Days Grid -->
            <div class="grid grid-cols-7" style="grid-template-rows: repeat(6, minmax(4rem, 1fr));">
              <div 
                v-for="day in calendarDays" 
                :key="day.key"
                :class="[
                  'border-r border-gray-600 last:border-r-0 border-b border-gray-600 last:border-b-0 flex flex-col justify-between p-2',
                  day.dayNumber ? 'bg-card hover:bg-hover cursor-pointer' : 'bg-primary'
                ]"
                @click="day.dayNumber ? switchToAgendaForDate(day.date) : null"
              >
                <div v-if="day.dayNumber" class="h-full flex flex-col justify-between">
                  <!-- Day Number -->
                  <div class="flex justify-start">
                    <span :class="['text-sm font-semibold', day.isToday ? 'bg-accent text-black px-2 py-1 rounded-full text-xs' : 'text-primary']">
                      {{ day.dayNumber }}
                    </span>
                  </div>
                  
                  <!-- Status Circles -->
                  <div v-if="day.rentals.length > 0" class="flex flex-wrap gap-1 justify-center items-end">
                    <div 
                      v-for="(statusGroup, status) in getStatusGroups(day.rentals)" 
                      :key="status"
                      :class="['flex items-center justify-center rounded-full text-xs font-bold text-white min-w-[20px] h-5 px-1', getStatusCircleColor(status)]"
                      :title="`${statusGroup.count} ${t('rentals.' + status.toLowerCase())}`"
                    >
                      {{ statusGroup.count }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>


    <!-- Add/Edit Rental Modal -->
    <div 
      v-if="showModal"
      class="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
    >
      <div class="relative mx-auto border border-gray-600 shadow-lg rounded-xl bg-card max-h-[90vh] overflow-y-auto" style="width: 480px;">
        <div class="p-5">
          <h3 class="text-lg font-medium text-primary mb-4">
            {{ editingRental ? t('rentals.editRental') : t('rentals.newRental') }}
          </h3>
          
          
          <form @submit.prevent="saveRental">
            <div class="mb-4">
              <label class="block text-sm font-medium text-secondary mb-2">{{ t('rentals.client') }}</label>

              <!-- Custom Client Dropdown -->
              <div class="relative" data-client-dropdown>
                <button
                  type="button"
                  @click="!editingRental && (showClientDropdown = !showClientDropdown)"
                  :disabled="!!editingRental"
                  :class="[
                    'w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent text-left flex items-center justify-between',
                    editingRental ? 'bg-gray-700 cursor-not-allowed opacity-50' : 'cursor-pointer'
                  ]"
                >
                  <span class="truncate">
                    {{ rentalForm.client_id ? availableClients.find(c => c.id == rentalForm.client_id)?.full_name : t('rentals.selectClient') }}
                  </span>
                  <svg class="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <!-- Dropdown Container -->
                <div
                  v-if="showClientDropdown && !editingRental"
                  class="absolute z-30 mt-1 w-full bg-card border border-gray-600 rounded-lg shadow-lg overflow-hidden"
                  style="max-height: 320px;"
                >
                  <!-- Search Input -->
                  <div class="p-2 border-b border-gray-600 bg-hover">
                    <input
                      v-model="clientSearchTerm"
                      type="text"
                      placeholder="Buscar por nombre, email, teléfono..."
                      class="w-full px-3 py-2 bg-card border border-gray-600 text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                      @click.stop
                    />
                  </div>

                  <!-- Client List -->
                  <div class="overflow-y-auto" style="max-height: 240px;">
                    <div
                      v-for="client in filteredClients"
                      :key="client.id"
                      @click="selectClient(client.id)"
                      class="group px-3 py-2 hover:bg-accent hover:text-black cursor-pointer transition-colors border-b border-gray-700 last:border-b-0"
                      :class="{ 'bg-accent text-black': rentalForm.client_id == client.id }"
                    >
                      <div class="font-medium text-primary group-hover:text-black text-sm transition-colors">{{ client.full_name }}</div>
                      <div class="text-xs text-secondary group-hover:text-black mt-0.5 transition-colors">
                        <span v-if="client.email">{{ client.email }}</span>
                        <span v-if="client.email && client.phone"> • </span>
                        <span v-if="client.phone">{{ client.phone }}</span>
                      </div>
                    </div>

                    <!-- Empty State -->
                    <div
                      v-if="filteredClients.length === 0"
                      class="px-3 py-4 text-center text-secondary text-sm"
                    >
                      No se encontraron clientes
                    </div>
                  </div>
                </div>
              </div>

              <button
                v-if="!editingRental"
                type="button"
                @click="openClientModal"
                class="mt-2 text-sm text-accent hover:text-accent/80 underline"
              >
                + {{ t('clients.createNew') }}
              </button>
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-secondary mb-2">{{ t('rentals.court') }}</label>
              <select 
                v-model="rentalForm.court_id" 
                required 
                :disabled="!!editingRental"
                :class="[
                  'w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent',
                  editingRental ? 'bg-gray-700 cursor-not-allowed' : ''
                ]"
              >
                <option value="">{{ t('rentals.selectCourt') }}</option>
                <option 
                  v-for="court in availableCourts" 
                  :key="court.id" 
                  :value="court.id"
                >
                  {{ court.name }} - ${{ formatCurrency(court.hourly_rate) }}/{{ t('courts.hour') }}
                </option>
              </select>
            </div>
            <div class="mb-4">
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-secondary">{{ t('rentals.date') }}</label>
                <!-- Recurring toggle button -->
                <button
                  type="button"
                  @click="rentalForm.is_recurring = !rentalForm.is_recurring"
                  :class="[
                    'px-3 py-1 text-xs font-medium rounded-lg border border-gray-600 transition-colors',
                    rentalForm.is_recurring 
                      ? 'bg-accent text-black border-accent' 
                      : 'bg-hover text-secondary hover:text-primary hover:border-accent'
                  ]"
                >
                  {{ t('rentals.recurring.repeats') }}
                </button>
              </div>
              <div class="relative" data-date-picker>
                <button
                  type="button"
                  @click="showDatePicker = !showDatePicker"
                  class="w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-left flex items-center justify-between text-sm"
                >
                  <span>{{ selectedDateText || 'Seleccionar fecha' }}</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                
                <!-- Dropdown del calendario -->
                <div v-if="showDatePicker" class="absolute z-20 mt-1 bg-card rounded-xl shadow-lg border border-gray-600 p-4" style="width: 400px; font-family: 'Google Sans', Arial, sans-serif;">
                  <!-- Header con controles de mes -->
                  <div class="flex justify-between items-center mb-2">
                    <button 
                      type="button"
                      @click="previousPickerMonth"
                      class="text-secondary hover:text-primary cursor-pointer text-lg"
                      style="background: none; border: none;"
                    >
                      ◀
                    </button>
                    <span class="text-primary font-medium">{{ pickerMonthLabel }}</span>
                    <button 
                      type="button"
                      @click="nextPickerMonth"
                      class="text-secondary hover:text-primary cursor-pointer text-lg"
                      style="background: none; border: none;"
                    >
                      ▶
                    </button>
                  </div>
                  
                  <!-- Tabla del calendario -->
                  <table class="w-full border-collapse text-center text-sm">
                    <thead>
                      <tr class="text-secondary">
                        <th class="p-1">Do</th>
                        <th class="p-1">Lu</th>
                        <th class="p-1">Ma</th>
                        <th class="p-1">Mi</th>
                        <th class="p-1">Ju</th>
                        <th class="p-1">Vi</th>
                        <th class="p-1">Sa</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="week in pickerCalendarWeeks" :key="week.id">
                        <td 
                          v-for="day in week.days" 
                          :key="day.key"
                          class="p-1.5 cursor-pointer hover:bg-hover transition-colors relative"
                          :class="{
                            'text-secondary': day.isOtherMonth,
                            'text-primary': !day.isOtherMonth && !day.isPast,
                            'text-gray-600 cursor-not-allowed': day.isPast,
                            'bg-accent text-black font-semibold': day.isSelected
                          }"
                          @click="!day.isPast ? selectPickerDate(day) : null"
                        >
                          <div class="relative">
                            {{ day.dayNumber }}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <!-- Recurring info (show when is_recurring is true) -->
              <div v-if="rentalForm.is_recurring" class="mt-3 p-3 bg-accent/5 border border-accent/20 rounded-lg">
                <div class="flex items-center space-x-2">
                  <svg class="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span class="text-sm text-secondary">
                    {{ t('rentals.recurring.repeatMessage', { day: getSelectedDayName() }) }}
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Time Picker Dropdowns -->
            <div class="mb-4">
              <div class="flex items-center space-x-2">
                <div class="flex-1 relative" data-start-time ref="startTimeContainer">
                  <label class="block text-sm font-medium text-secondary mb-2">{{ t('rentals.startTime') }}</label>
                  <button
                    type="button"
                    @click="toggleStartTimePicker"
                    class="w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-left flex items-center justify-between text-sm"
                  >
                    <span>{{ rentalForm.start_time || 'Seleccionar hora' }}</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  
                  <!-- Time Dropdown -->
                  <div v-if="showStartTimePicker" ref="startTimeDropdown" class="absolute z-20 mt-1 bg-card border border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto" style="width: 150px;">
                    <div 
                      v-for="time in timeOptions" 
                      :key="time"
                      @click="selectStartTime(time)"
                      class="px-3 py-2 hover:bg-accent hover:text-black cursor-pointer text-sm text-primary transition-colors"
                      :class="{ 'bg-accent text-black': rentalForm.start_time === time }"
                    >
                      {{ time }}
                    </div>
                  </div>
                </div>
                
                <div class="flex-1 relative" data-end-time ref="endTimeContainer">
                  <label class="block text-sm font-medium text-secondary mb-2">{{ t('rentals.endTime') }}</label>
                  <button
                    type="button"
                    @click="toggleEndTimePicker"
                    class="w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-left flex items-center justify-between text-sm"
                  >
                    <span>{{ rentalForm.end_time || 'Seleccionar hora' }}</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  
                  <!-- Time Dropdown -->
                  <div v-if="showEndTimePicker" ref="endTimeDropdown" class="absolute z-20 mt-1 bg-card border border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto" style="width: 150px;">
                    <div 
                      v-for="time in timeOptions" 
                      :key="time"
                      @click="selectEndTime(time)"
                      class="px-3 py-2 hover:bg-accent hover:text-black cursor-pointer text-sm text-primary transition-colors"
                      :class="{ 'bg-accent text-black': rentalForm.end_time === time }"
                    >
                      {{ time }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-secondary mb-2">{{ t('common.status') }}</label>
              <select 
                v-model="rentalForm.status" 
                class="w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="pending">{{ t('rentals.pending') }}</option>
                <option value="confirmed">{{ t('rentals.confirmed') }}</option>
              </select>
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium text-secondary mb-2">{{ t('rentals.notes') }} ({{ t('rentals.optional') }})</label>
              <textarea 
                v-model="rentalForm.notes" 
                rows="3" 
                class="w-full px-3 py-2 border border-gray-600 bg-hover text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent" 
                :placeholder="t('rentals.notesPlaceholder')"
              ></textarea>
            </div>
            
            <!-- Total Amount Display -->
            <div v-if="totalAmount > 0" class="mb-6 p-4 bg-accent/10 border border-accent/30 rounded-lg">
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium text-secondary">{{ t('rentals.total') }}:</span>
                <span class="text-lg font-bold text-accent">${{ formatCurrency(totalAmount) }}</span>
              </div>
              <div v-if="rentalForm.start_time && rentalForm.end_time" class="text-xs text-secondary mt-1">
                {{ getDurationText() }}
              </div>
            </div>
            <div class="flex justify-between items-center pt-2">
              <button 
                v-if="editingRental"
                type="button" 
                @click="cancelRentalConfirm(editingRental)"
                class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 min-w-[80px] h-[38px] transition-all duration-200"
              >
                {{ t('rentals.cancel') }}
              </button>
              <div v-else></div>
              <div class="flex space-x-3">
                <button 
                  type="button" 
                  @click="closeRentalModal"
                  class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-secondary bg-card border border-gray-600 rounded-md hover:bg-hover hover:text-primary hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent min-w-[80px] h-[38px] transition-all duration-200"
                >
                  {{ t('common.cancel') }}
                </button>
                <button 
                  type="submit"
                  :disabled="saving"
                  class="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-black bg-accent border border-transparent rounded-md hover:bg-accent/80 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent min-w-[120px] h-[38px] transition-all duration-200"
                >
                  {{ saving ? t('rentals.saving') : (editingRental ? t('rentals.updateRental') : t('rentals.createRental')) }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>

  <!-- Client Modal -->
  <CreateClientModal
    v-model="showClientModal"
    :clients="clients"
    :show-address="true"
    @client-created="handleClientCreated"
  />

  <!-- Recurring Action Dialog -->
  <RecurringActionDialog
    v-model="showRecurringDialog"
    :action-type="recurringAction"
    :show-future-option="false"
    @select="handleRecurringActionSelect"
  />

  <!-- Toast Notification for Errors -->
  <div 
    v-if="error" 
    class="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4"
  >
    <div class="bg-red-900/90 border border-red-400 text-red-100 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <svg class="h-5 w-5 text-red-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm">{{ error }}</p>
        </div>
        <button 
          @click="clearError()" 
          class="text-red-300 hover:text-red-100 ml-4"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { apiClient } from '../../utils/api.js'
import { useI18n } from '../../i18n/composable.ts'
import { useToast } from '../../composables/useToast.js'
import { localDateTimeToUTC, getBrowserTimezone, parseUTCToLocal } from '../../utils/dateFormat.js'
import { expandRecurringEvents } from '../../utils/recurringRentals.js'
import wsManager from '../../utils/websocket.js'
import AgendaView from '../rentals/AgendaView.vue'
import CreateClientModal from '../modals/CreateClientModal.vue'
import RecurringActionDialog from '../modals/RecurringActionDialog.vue'
import { DateTime } from 'luxon'

const { t, currentLanguage } = useI18n()
const { showError, showSuccess, showWarning, showInfo } = useToast()

const rentals = ref([])
const clients = ref([])
const courts = ref([])
const loading = ref(false)
const error = ref('')
const showModal = ref(false)
const editingRental = ref(null)
const saving = ref(false)

// Recurring action dialog state
const showRecurringDialog = ref(false)
const recurringAction = ref('cancel') // 'cancel' or 'edit'
const recurringRental = ref(null)
const rentalExceptions = ref([])
const editScope = ref('all') // 'single' or 'all' - tracks edit scope for recurring events

// Date/Time Picker states
const showDatePicker = ref(false)
const showStartTimePicker = ref(false)
const showEndTimePicker = ref(false)
const pickerCurrentDate = ref(DateTime.now())

// Filter date picker state
const showFilterDatePicker = ref(false)
const filterPickerCurrentDate = ref(DateTime.now())

// Template refs for time dropdowns
const startTimeDropdown = ref(null)
const endTimeDropdown = ref(null)
const startTimeContainer = ref(null)
const endTimeContainer = ref(null)

// Platform settings for establishment hours
const establishmentStartHour = ref(8) // Default 8:00
const establishmentEndHour = ref(22) // Default 22:00

// Error handling - Now using toast notifications
const clearError = () => {
  // Legacy function for compatibility, now does nothing
  // Errors are handled by toast notifications
}

// Client modal
const showClientModal = ref(false)

// Client dropdown search
const showClientDropdown = ref(false)
const clientSearchTerm = ref('')

// Filters
const statusFilter = ref('')
const dateFilter = ref('')

// View state
const currentView = ref('agenda') // 'calendar', or 'agenda'
const currentDate = ref(DateTime.now())

// Ensure consistent date formatting between server and client
const getConsistentDate = () => {
  // Return DateTime at start of day in local timezone
  return DateTime.now().startOf('day')
}
const calendarRentals = ref([])
const agendaRentals = ref([])
const highlightedRentalId = ref(null)


const rentalForm = ref({
  client_id: '',
  court_id: '',
  rental_date: '',
  start_time: '',
  end_time: '',
  status: 'pending',
  notes: '',
  // Simplified recurring rental fields
  is_recurring: false,
})

// Computed properties
const filteredRentals = computed(() => {
  // Since filtering is now done on the server side via loadRentals(),
  // we just return the rentals array directly
  return rentals.value
})

const availableClients = computed(() => {
  return clients.value.filter(client => client.is_active)
})

const filteredClients = computed(() => {
  const activeClients = availableClients.value

  if (!clientSearchTerm.value.trim()) {
    return activeClients
  }

  const search = clientSearchTerm.value.toLowerCase()
  return activeClients.filter(client =>
    client.full_name?.toLowerCase().includes(search) ||
    client.email?.toLowerCase().includes(search) ||
    client.phone?.includes(search) ||
    client.membership_number?.toLowerCase().includes(search)
  )
})

const availableCourts = computed(() => {
  return courts.value.filter(court => court.status === 'available')
})

// Calculate total amount based on selected court and duration
const totalAmount = computed(() => {
  if (!rentalForm.value.court_id || !rentalForm.value.start_time || !rentalForm.value.end_time) {
    return 0
  }
  
  const selectedCourt = courts.value.find(court => court.id == rentalForm.value.court_id)
  if (!selectedCourt || !selectedCourt.hourly_rate) {
    return 0
  }
  
  // Calculate duration in hours
  const [startHour, startMinute] = rentalForm.value.start_time.split(':').map(Number)
  const [endHour, endMinute] = rentalForm.value.end_time.split(':').map(Number)
  
  const startTimeMinutes = startHour * 60 + startMinute
  let endTimeMinutes = endHour * 60 + endMinute
  
  // Handle overnight rentals (end time next day)
  if (endTimeMinutes <= startTimeMinutes) {
    endTimeMinutes += 24 * 60 // Add 24 hours in minutes
  }
  
  const durationMinutes = endTimeMinutes - startTimeMinutes
  const durationHours = durationMinutes / 60
  
  return selectedCourt.hourly_rate * durationHours
})

const currentMonthLabel = computed(() => {
  const monthNames = [
    t('calendar.january'), t('calendar.february'), t('calendar.march'), t('calendar.april'),
    t('calendar.may'), t('calendar.june'), t('calendar.july'), t('calendar.august'),
    t('calendar.september'), t('calendar.october'), t('calendar.november'), t('calendar.december')
  ]
  // Luxon months are 1-based, array is 0-based
  return `${monthNames[currentDate.value.month - 1]} ${currentDate.value.year}`
})

const currentDayLabel = computed(() => {
  const weekdayNames = [
    t('rentals.weekday.sunday'), t('rentals.weekday.monday'), t('rentals.weekday.tuesday'),
    t('rentals.weekday.wednesday'), t('rentals.weekday.thursday'), t('rentals.weekday.friday'),
    t('rentals.weekday.saturday')
  ]

  const monthNames = [
    t('calendar.january'), t('calendar.february'), t('calendar.march'), t('calendar.april'),
    t('calendar.may'), t('calendar.june'), t('calendar.july'), t('calendar.august'),
    t('calendar.september'), t('calendar.october'), t('calendar.november'), t('calendar.december')
  ]

  // Luxon weekday: 1=Monday, 7=Sunday; weekdayNames: 0=Sunday, 6=Saturday
  const weekdayIndex = currentDate.value.weekday === 7 ? 0 : currentDate.value.weekday
  return `${weekdayNames[weekdayIndex]}, ${monthNames[currentDate.value.month - 1]} ${currentDate.value.day}, ${currentDate.value.year}`
})

const calendarDays = computed(() => {
  const year = currentDate.value.year
  const month = currentDate.value.month

  const firstDay = DateTime.local(year, month, 1)
  const lastDay = firstDay.endOf('month')
  // Luxon weekday: 1=Monday, 7=Sunday; we need 0=Sunday, 6=Saturday
  const firstDayOfWeek = firstDay.weekday === 7 ? 0 : firstDay.weekday
  const daysInMonth = lastDay.day

  const today = DateTime.now().startOf('day')
  const days = []

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ key: `empty-${i}`, dayNumber: null, date: null, rentals: [], isToday: false })
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDayDate = DateTime.local(year, month, day)
    const isToday = currentDayDate.hasSame(today, 'day')

    // Get rentals for this day
    const dayRentals = calendarRentals.value.filter(rental => {
      const localDate = parseUTCToLocal(rental.start_datetime)
      return localDate.hasSame(currentDayDate, 'day')
    })

    days.push({
      key: `day-${day}`,
      dayNumber: day,
      date: currentDayDate.toJSDate(), // Convert to JS Date for compatibility
      rentals: dayRentals,
      isToday
    })
  }

  // Add empty cells to complete a 6x7 grid (42 cells total)
  const totalCells = 42
  while (days.length < totalCells) {
    days.push({
      key: `empty-end-${days.length}`,
      dayNumber: null,
      date: null,
      rentals: [],
      isToday: false
    })
  }

  return days
})

// Date/Time Picker Computed Properties
const selectedDateText = computed(() => {
  if (!rentalForm.value.rental_date) return ''
  const date = DateTime.fromISO(rentalForm.value.rental_date)
  return date.setLocale('es-ES').toLocaleString({
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const pickerMonthLabel = computed(() => {
  const monthNames = [
    t('calendar.january'), t('calendar.february'), t('calendar.march'), t('calendar.april'),
    t('calendar.may'), t('calendar.june'), t('calendar.july'), t('calendar.august'),
    t('calendar.september'), t('calendar.october'), t('calendar.november'), t('calendar.december')
  ]
  // Luxon months are 1-based, array is 0-based
  return `${monthNames[pickerCurrentDate.value.month - 1]} ${pickerCurrentDate.value.year}`
})

const pickerCalendarWeeks = computed(() => {
  const year = pickerCurrentDate.value.year
  const month = pickerCurrentDate.value.month

  const firstDay = DateTime.local(year, month, 1)
  const lastDay = firstDay.endOf('month')
  // Luxon weekday: 1=Monday, 7=Sunday; we need 0=Sunday offset
  const firstDayWeekday = firstDay.weekday === 7 ? 0 : firstDay.weekday
  const startDate = firstDay.minus({ days: firstDayWeekday })

  const weeks = []
  let currentDate = startDate

  for (let week = 0; week < 6; week++) {
    const days = []
    for (let day = 0; day < 7; day++) {
      const dayObj = {
        key: `${currentDate.year}-${currentDate.month}-${currentDate.day}`,
        dayNumber: currentDate.day,
        date: currentDate.toJSDate(), // Convert to JS Date for compatibility
        isOtherMonth: currentDate.month !== month,
        isPast: currentDate < DateTime.now().startOf('day'),
        isSelected: rentalForm.value.rental_date === currentDate.toISODate()
      }
      days.push(dayObj)
      currentDate = currentDate.plus({ days: 1 })
    }
    weeks.push({ id: week, days })
  }

  return weeks
})

const timeOptions = computed(() => {
  const times = []
  
  // Use establishment hours range, but keep 15-minute intervals
  for (let hour = establishmentStartHour.value; hour <= establishmentEndHour.value; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      times.push(timeStr)
    }
  }
  
  // Add 23:59 as the last available time if establishment closes at 23:59
  if (establishmentEndHour.value === 23) {
    times.push('23:59')
  }
  
  return times
})

// Filter Date Picker Computed Properties
const filterPickerMonthLabel = computed(() => {
  const monthNames = [
    t('calendar.january'), t('calendar.february'), t('calendar.march'), t('calendar.april'),
    t('calendar.may'), t('calendar.june'), t('calendar.july'), t('calendar.august'),
    t('calendar.september'), t('calendar.october'), t('calendar.november'), t('calendar.december')
  ]
  // Luxon months are 1-based, array is 0-based
  return `${monthNames[filterPickerCurrentDate.value.month - 1]} ${filterPickerCurrentDate.value.year}`
})

const filterPickerDays = computed(() => {
  const year = filterPickerCurrentDate.value.year
  const month = filterPickerCurrentDate.value.month
  const firstDay = DateTime.local(year, month, 1)
  const lastDay = firstDay.endOf('month')
  const daysInMonth = lastDay.day
  // Luxon weekday: 1=Monday, 7=Sunday; we need 0=Sunday, 6=Saturday
  const startingDayOfWeek = firstDay.weekday === 7 ? 0 : firstDay.weekday

  const days = []

  // Add previous month's days
  const prevMonthEnd = firstDay.minus({ days: 1 })
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const date = prevMonthEnd.minus({ days: i })
    days.push({
      date: date.toJSDate(), // Convert to JS Date for compatibility
      isCurrentMonth: false,
      isToday: false,
      isSelected: dateFilter.value === date.toISODate()
    })
  }

  // Add current month's days
  const today = DateTime.now().startOf('day')
  for (let day = 1; day <= daysInMonth; day++) {
    const date = DateTime.local(year, month, day)
    const isToday = date.hasSame(today, 'day')
    days.push({
      date: date.toJSDate(), // Convert to JS Date for compatibility
      isCurrentMonth: true,
      isToday,
      isSelected: dateFilter.value === date.toISODate()
    })
  }

  // Add next month's days to complete the grid
  const remainingDays = 42 - days.length
  for (let day = 1; day <= remainingDays; day++) {
    const date = lastDay.plus({ days: day })
    days.push({
      date: date.toJSDate(), // Convert to JS Date for compatibility
      isCurrentMonth: false,
      isToday: false,
      isSelected: dateFilter.value === date.toISODate()
    })
  }

  return days
})

// Date/Time Picker Functions
const previousPickerMonth = () => {
  pickerCurrentDate.value = pickerCurrentDate.value.minus({ months: 1 }).startOf('month')
}

const nextPickerMonth = () => {
  pickerCurrentDate.value = pickerCurrentDate.value.plus({ months: 1 }).startOf('month')
}

const selectPickerDate = (day) => {
  // day.date is a JS Date, convert to ISO date string
  const luxonDate = DateTime.fromJSDate(day.date)
  rentalForm.value.rental_date = luxonDate.toISODate()
  showDatePicker.value = false
}

// Filter Date Picker Functions
const toggleFilterDatePicker = () => {
  showFilterDatePicker.value = !showFilterDatePicker.value
}

const previousFilterMonth = () => {
  filterPickerCurrentDate.value = filterPickerCurrentDate.value.minus({ months: 1 }).startOf('month')
}

const nextFilterMonth = () => {
  filterPickerCurrentDate.value = filterPickerCurrentDate.value.plus({ months: 1 }).startOf('month')
}

const selectFilterDate = (day) => {
  // day.date is a JS Date, convert to ISO date string
  const luxonDate = DateTime.fromJSDate(day.date)
  dateFilter.value = luxonDate.toISODate()
  showFilterDatePicker.value = false
  applyFilters()
}

const clearDateFilter = () => {
  dateFilter.value = ''
  showFilterDatePicker.value = false
  applyFilters()
}

const formatFilterDate = (dateString) => {
  if (!dateString) return ''
  const date = DateTime.fromISO(dateString)
  return date.toLocaleString({ day: '2-digit', month: '2-digit', year: 'numeric' })
}

const selectStartTime = (time) => {
  rentalForm.value.start_time = time
  showStartTimePicker.value = false

  // Auto-set end time to 1 hour later only if end time is not set or is invalid
  if (!rentalForm.value.end_time) {
    const [hours, minutes] = time.split(':').map(Number)
    const startTime = DateTime.now().set({ hour: hours, minute: minutes, second: 0, millisecond: 0 })
    const endTime = startTime.plus({ hours: 1 })

    let endTimeStr = endTime.toFormat('HH:mm')

    // Special case: if start time is in hour 23 and establishment closes at 23:59, set end time to 23:59
    if (hours === 23 && establishmentEndHour.value === 23) {
      endTimeStr = '23:59'
    }

    rentalForm.value.end_time = endTimeStr
  } else {
    // Validate existing end time against new start time
    const [startHour, startMinute] = time.split(':').map(Number)
    const [endHour, endMinute] = rentalForm.value.end_time.split(':').map(Number)

    const startTimeMinutes = startHour * 60 + startMinute
    const endTimeMinutes = endHour * 60 + endMinute

    if (endTimeMinutes <= startTimeMinutes) {
      // Auto-adjust end time to 1 hour later
      const startTime = DateTime.now().set({ hour: startHour, minute: startMinute, second: 0, millisecond: 0 })
      const endTime = startTime.plus({ hours: 1 })

      let endTimeStr = endTime.toFormat('HH:mm')

      // Special case: if start time is in hour 23 and establishment closes at 23:59, set end time to 23:59
      if (startHour === 23 && establishmentEndHour.value === 23) {
        endTimeStr = '23:59'
      }

      rentalForm.value.end_time = endTimeStr
    }
  }
}

const selectEndTime = (time) => {
  // Validate that end time is after start time if start time is already selected
  if (rentalForm.value.start_time) {
    const [startHour, startMinute] = rentalForm.value.start_time.split(':').map(Number)
    const [endHour, endMinute] = time.split(':').map(Number)

    const startTimeMinutes = startHour * 60 + startMinute
    const endTimeMinutes = endHour * 60 + endMinute

    if (endTimeMinutes <= startTimeMinutes) {
      showError(t('rentals.errors.invalidTimeOrder') || 'La hora de fin debe ser posterior a la hora de inicio')
      return
    }
  }

  rentalForm.value.end_time = time
  showEndTimePicker.value = false
}

const selectClient = (clientId) => {
  rentalForm.value.client_id = clientId
  showClientDropdown.value = false
  clientSearchTerm.value = ''
}

// Toggle functions with auto-scroll
const toggleStartTimePicker = () => {
  showStartTimePicker.value = !showStartTimePicker.value
  
  // If opening and there's a selected time, scroll to it
  if (showStartTimePicker.value && rentalForm.value.start_time) {
    setTimeout(() => scrollToSelectedTime('start', rentalForm.value.start_time), 50)
  }
}

const toggleEndTimePicker = () => {
  showEndTimePicker.value = !showEndTimePicker.value
  
  // If opening and there's a selected time, scroll to it
  if (showEndTimePicker.value && rentalForm.value.end_time) {
    setTimeout(() => scrollToSelectedTime('end', rentalForm.value.end_time), 50)
  }
}

const scrollToSelectedTime = async (type, time) => {
  await nextTick()
  const dropdownRef = type === 'start' ? startTimeDropdown : endTimeDropdown
  if (dropdownRef.value) {
    const timeElements = dropdownRef.value.children
    for (let i = 0; i < timeElements.length; i++) {
      if (timeElements[i].textContent.trim() === time) {
        const element = timeElements[i]
        const dropdown = dropdownRef.value
        
        // Calculate position to center the selected element in the dropdown
        const elementTop = element.offsetTop
        const elementHeight = element.offsetHeight
        const dropdownHeight = dropdown.clientHeight
        
        // Center the element in the dropdown
        const scrollPosition = elementTop - (dropdownHeight / 2) + (elementHeight / 2)
        
        // Ensure scroll position is within bounds
        const maxScroll = dropdown.scrollHeight - dropdownHeight
        dropdown.scrollTop = Math.max(0, Math.min(scrollPosition, maxScroll))
        
        break
      }
    }
  }
}

// Methods
const loadRentals = async (customFilters = {}) => {
  loading.value = true
  error.value = ''
  
  try {
    // Default to last week's rentals if no date filters are provided
    const filters = { ...customFilters };

    // If no start_date or end_date is specified, limit to last week
    if (!filters.start_date && !filters.end_date && !dateFilter.value) {
      const today = DateTime.now();
      const oneWeekAgo = today.minus({ days: 7 });

      filters.start_date = oneWeekAgo.toISODate();
      filters.end_date = today.toISODate();
    }
    
    // Apply status filter if set
    if (statusFilter.value) {
      filters.status = statusFilter.value;
    }
    
    // Apply date filter if set (this will override the default week filter)
    if (dateFilter.value) {
      filters.start_date = dateFilter.value;
      filters.end_date = dateFilter.value;
    }
    
    const response = await apiClient.getRentals(filters)
    rentals.value = response.data || response.rentals || response
  } catch (err) {
    showError(translateError(err.message) || t('rentals.errorLoadFailed'))
    console.error('Error loading rentals:', err)
  } finally {
    loading.value = false
  }
}

const loadClients = async () => {
  try {
    // Load all clients without pagination for email validation
    const response = await apiClient.getClients({ limit: 1000 })
    clients.value = response.data || response.clients || response
    console.log('Loaded clients:', {
      count: clients.value.length,
      emails: clients.value.map(c => c.email)
    })
  } catch (err) {
    console.error('Error loading clients:', err)
  }
}

const loadCourts = async () => {
  try {
    const response = await apiClient.getCourts()
    courts.value = response.data || response
  } catch (err) {
    console.error('Error loading courts:', err)
  }
}

const loadCalendarData = async () => {
  try {
    let startDate, endDate

    if (dateFilter.value) {
      // If date filter is set, show only that specific date
      startDate = DateTime.fromISO(dateFilter.value)
      endDate = DateTime.fromISO(dateFilter.value)
    } else {
      // Show the entire month
      startDate = currentDate.value.startOf('month')
      endDate = currentDate.value.endOf('month')
    }

    const startDateStr = startDate.toISODate()
    const endDateStr = endDate.toISODate()

    const { rentals, exceptions } = await apiClient.getCalendarView(startDateStr, endDateStr)

    // Response includes rentals and exceptions
    const rentalsData = rentals || []
    const exceptionsData = exceptions || []
    rentalExceptions.value = exceptionsData

    // Ensure we only work with actual rental records, not exception records
    // Exception records should never appear in the UI
    const actualRentals = Array.isArray(rentalsData) ? rentalsData : []

    // Expand recurring events to show on matching days, applying exceptions
    const expandedRentals = expandRecurringEvents(actualRentals, startDate, endDate, exceptionsData)

    // Apply status filter to calendar data
    let filteredData = expandedRentals
    if (statusFilter.value) {
      filteredData = filteredData.filter(rental => rental.status === statusFilter.value)
    }

    calendarRentals.value = filteredData

  } catch (err) {
    console.error('Error loading calendar data:', err)
  }
}

// WebSocket setup and message handling
const setupWebSocket = () => {
  try {
    const user = apiClient.getCurrentUserFromStorage();
    console.log(user.account_id)
    if (!user || !user.account_id) {
      console.warn('No user found for WebSocket authentication', user)
      return
    }

    console.log('Setting up WebSocket for user:', user)

    // Connect to WebSocket
    wsManager.connect(user.account_id)
    
    // Listen for rental events
    wsManager.on('rental_created', handleRentalUpdate)
    wsManager.on('rental_updated', handleRentalUpdate)
    
    console.log('WebSocket listeners registered for rental_created and rental_updated')
  } catch (error) {
    console.error('Error setting up WebSocket:', error)
  }
}

const handleRentalUpdate = (message) => {
  console.log('Received rental update:', message)
  
  const { data: rental, account_id } = message
  const currentUser = apiClient.getCurrentUserFromStorage();
  
  // Only process updates for the same account
  if (!currentUser || currentUser.account_id !== account_id) {
    return
  }
  
  // Check if we need to refresh based on current view and date
  const shouldRefresh = shouldRefreshForRental(rental)
  
  if (shouldRefresh) {
    console.log('Refreshing view due to rental update')
    refreshCurrentView()
  }
}

const shouldRefreshForRental = (rental) => {
  if (!rental || !rental.start_datetime) {
    return false
  }
  
  // Parse rental date
  const rentalDate = parseUTCToLocal(rental.start_datetime)
  
  if (currentView.value === 'agenda') {
    // For agenda view, check if rental is on the currently displayed date
    const currentDisplayDate = dateFilter.value ? DateTime.fromISO(dateFilter.value) : currentDate.value
    return rentalDate.hasSame(currentDisplayDate, 'day')
  } else if (currentView.value === 'calendar') {
    // For calendar view, check if rental is in the currently displayed month
    const currentDisplayDate = dateFilter.value ? DateTime.fromISO(dateFilter.value) : currentDate.value
    return rentalDate.hasSame(currentDisplayDate, 'month') && rentalDate.hasSame(currentDisplayDate, 'year')
  }
  
  return false
}

const refreshCurrentView = async () => {
  if (currentView.value === 'agenda') {
    await loadAgendaData()
  } else if (currentView.value === 'calendar') {
    await loadCalendarData()
  }
}

const loadAgendaData = async () => {
  try {
    // For agenda view, load a 3-day range to work around backend filtering issues
    let targetDate

    if (dateFilter.value) {
      targetDate = DateTime.fromISO(dateFilter.value)
    } else {
      targetDate = currentDate.value
    }

    // Create a 3-day range: previous day, target day, next day
    const startDate = targetDate.minus({ days: 1 })
    const endDate = targetDate.plus({ days: 1 })

    const startDateStr = startDate.toISODate()
    const endDateStr = endDate.toISODate()
    const targetDateStr = targetDate.toISODate()

    const { rentals, exceptions } = await apiClient.getCalendarView(startDateStr, endDateStr)

    // Extract rentals and exceptions from response
    const rentalsData = rentals || []
    const exceptionsData = exceptions || []
    
    // Expand recurring events to show on matching days, applying exceptions
    const expandedRentals = expandRecurringEvents(rentalsData, startDate, endDate, exceptionsData)
    
    console.log('After expansion, filtering for target date:', targetDateStr)
    
    // Filter to only show rentals for the target date
    const targetDateOnly = expandedRentals.filter(rental => {
      // Parse the UTC datetime from backend and convert to local date
      const rentalDate = parseUTCToLocal(rental.start_datetime)
      if (!rentalDate) return false

      const year = rentalDate.year;
      const month = String(rentalDate.month).padStart(2, "0"); // Luxon months are 1-based (1-12)
      const day = String(rentalDate.day).padStart(2, "0");

      const rentalDateStr = `${year}-${month}-${day}`;

      console.log('Checking rental for target date match:', {
        rentalId: rental.id,
        rentalDate: rentalDateStr,
        targetDate: targetDateStr,
        matches: rentalDateStr === targetDateStr,
        isRecurring: rental.is_recurring,
        isRecurringInstance: rental._isRecurringInstance
      })
      
      return rentalDateStr === targetDateStr
    })
    
    console.log('Filtered results for agenda:', {
      totalAfterFiltering: targetDateOnly.length,
      targetDate: targetDateStr
    })
    
    // Apply status filter to agenda data
    let filteredData = targetDateOnly
    if (statusFilter.value) {
      filteredData = filteredData.filter(rental => rental.status === statusFilter.value)
    } else {
      // If no specific status filter is applied, exclude cancelled rentals from agenda view
      // This allows users to schedule new rentals in time slots where cancelled rentals exist
      filteredData = filteredData.filter(rental => rental.status !== 'cancelled')
    }
    
    agendaRentals.value = filteredData
  } catch (err) {
    console.error('Error loading agenda data:', err)
  }
}

const applyFilters = () => {
  if (dateFilter.value) {
    // Create date in local timezone to avoid timezone shift
    currentDate.value = DateTime.fromISO(dateFilter.value)
  }
  
  // Reload data based on current view to apply filters
  if (currentView.value === 'calendar') {
    loadCalendarData()
  } else if (currentView.value === 'agenda') {
    loadAgendaData()
  }
}

const clearFilters = () => {
  statusFilter.value = ''
  dateFilter.value = ''
  // Reload data for current view after clearing filters
  applyFilters()
}


const switchToAgendaView = () => {
  currentView.value = 'agenda'
  loadAgendaData()
}

const switchToCalendarView = () => {
  currentView.value = 'calendar'
  loadCalendarData()
}

const previousMonth = () => {
  currentDate.value = currentDate.value.minus({ months: 1 })
  if (!dateFilter.value) { // Only navigate if no specific date filter is set
    loadCalendarData()
  }
}

const nextMonth = () => {
  currentDate.value = currentDate.value.plus({ months: 1 })
  if (!dateFilter.value) { // Only navigate if no specific date filter is set
    loadCalendarData()
  }
}

const previousDay = () => {
  currentDate.value = currentDate.value.minus({ days: 1 })

  // Update date filter to match the new date
  if (dateFilter.value) {
    dateFilter.value = currentDate.value.toISODate()
  }

  loadAgendaData()
}

const nextDay = () => {
  currentDate.value = currentDate.value.plus({ days: 1 })

  // Update date filter to match the new date
  if (dateFilter.value) {
    dateFilter.value = currentDate.value.toISODate()
  }

  loadAgendaData()
}

const switchToAgendaForDate = (date) => {
  currentDate.value = DateTime.fromJSDate(date)
  currentView.value = 'agenda'
  loadAgendaData()
}


const handleAgendaCellClick = ({ court, datetime }) => {
  // Check if the selected date is in the past
  const today = DateTime.now().startOf('day')
  const selectedDate = DateTime.fromJSDate(datetime).startOf('day')

  if (selectedDate < today) {
    // Show error message for past dates
    showError(t('rentals.errorPastDate') || 'No se pueden crear alquileres en fechas pasadas')
    return
  }

  // Ensure we're in "create" mode, not edit mode first
  editingRental.value = null

  // Pre-fill the rental form with the selected court and time (local timezone)
  const courtId = court.id
  const selectedDateTime = DateTime.fromJSDate(datetime)
  const formattedDate = selectedDateTime.toISODate()
  const formattedStartTime = selectedDateTime.toFormat('HH:mm')

  // Set default end time to 1 hour later, but handle 23:00 special case
  const endTime = selectedDateTime.plus({ hours: 1 })

  let formattedEndTime = endTime.toFormat('HH:mm')

  // Special case: if start time is in hour 23 and establishment closes at 23:59, set end time to 23:59
  if (selectedDateTime.hour === 23 && establishmentEndHour.value === 23) {
    formattedEndTime = '23:59'
  }
  
  // Update form values
  rentalForm.value = {
    court_id: courtId,
    rental_date: formattedDate,
    start_time: formattedStartTime,
    end_time: formattedEndTime,
    client_id: '',
    status: 'pending',
    notes: '',
    // Reset recurring fields for quick add
    is_recurring: false,
  }
  
  // Open rental modal directly (don't call openRentalModal as it resets the form)
  showModal.value = true
}

const openRentalModal = (rental = null, forceOpen = false) => {
  console.log('openRentalModal called with rental:', rental, 'forceOpen:', forceOpen)

  // Clear any previous errors when opening modal
  clearError()

  if (rental) {
    // Edit mode - Check if this is a recurring event and we haven't forced open
    if (rental.is_recurring && !forceOpen) {
      // Show recurring action dialog
      recurringAction.value = 'edit'
      recurringRental.value = rental
      showRecurringDialog.value = true
      return
    }

    // Edit mode - Check if the rental date is in the past
    // Extract date from UTC string to avoid timezone conversion
    const rentalDateStr = rental.start_datetime.split('T')[0]
    const rentalDate = DateTime.fromISO(rentalDateStr).startOf('day')
    const today = DateTime.now().startOf('day')

    console.log('Checking rental date:', { rentalDate: rentalDate.toISODate(), today: today.toISODate(), isPast: rentalDate < today })

    if (rentalDate < today) {
      // Show error message for past dates
      console.log('Rental is in the past, showing error')
      showError(t('rentals.errorEditPastDate') || 'No se pueden editar alquileres de fechas pasadas')
      return
    }

    console.log('Setting up edit mode for rental')
    editingRental.value = rental

    // Extract IDs from nested objects or direct fields
    const clientId = rental.client_id || (rental.client && rental.client.id) || ''
    const courtId = rental.court_id || (rental.court && rental.court.id) || ''

    // Use parseUTCToLocal to convert UTC datetime back to local timezone for form editing
    const startLocal = parseUTCToLocal(rental.start_datetime)
    const endLocal = parseUTCToLocal(rental.end_datetime)

    const startDatePart = startLocal.toISODate()
    const startTimePart = startLocal.toFormat('HH:mm')
    const endTimePart = endLocal.toFormat('HH:mm')

    console.log('Opening rental for edit:', {
      rental: rental,
      is_recurring_from_db: rental.is_recurring,
      startDatePart,
      startTimePart,
      endTimePart
    })

    rentalForm.value = {
      client_id: clientId,
      court_id: courtId,
      rental_date: startDatePart,
      start_time: startTimePart,
      end_time: endTimePart,
      status: rental.status || 'pending',
      notes: rental.notes || '',
      // Load recurring data if it exists
      is_recurring: rental.is_recurring || false
    }

    console.log('Form assigned with is_recurring:', rentalForm.value.is_recurring)

    // Set picker current date to match the rental date for proper calendar display
    const rentalDateForPicker = DateTime.fromISO(startDatePart)
    pickerCurrentDate.value = rentalDateForPicker.startOf('month')
  } else {
    // Add mode
    editingRental.value = null
    rentalForm.value = {
      client_id: '',
      court_id: '',
      rental_date: '',
      start_time: '',
      end_time: '',
      status: 'pending',
      notes: '',
      // Reset recurring fields
      is_recurring: false,
      }

    // Reset picker to current month for new rentals
    pickerCurrentDate.value = DateTime.now()
  }
  
  // Close any open dropdowns
  showClientDropdown.value = false
  clientSearchTerm.value = ''
  showDatePicker.value = false
  showStartTimePicker.value = false
  showEndTimePicker.value = false

  showModal.value = true
}

const closeRentalModal = () => {
  showModal.value = false
  editingRental.value = null
  rentalForm.value = {
    client_id: '',
    court_id: '',
    rental_date: '',
    start_time: '',
    end_time: '',
    status: 'pending',
    notes: '',
    // Reset recurring fields
    is_recurring: false,
  }

  // Reset edit scope for recurring events
  editScope.value = 'all'

  // Close all dropdowns
  showClientDropdown.value = false
  clientSearchTerm.value = ''
  showDatePicker.value = false
  showStartTimePicker.value = false
  showEndTimePicker.value = false
}

const saveRental = async () => {
  saving.value = true
  error.value = '' // Clear previous errors
  
  try {
    // Validate required fields
    if (!rentalForm.value.client_id) {
      showError(t('rentals.errors.clientRequired') || 'Debe seleccionar un cliente')
      return
    }
    
    if (!rentalForm.value.court_id) {
      showError(t('rentals.errors.courtRequired') || 'Debe seleccionar una cancha')
      return
    }
    
    if (!rentalForm.value.rental_date) {
      showError(t('rentals.errors.dateRequired') || 'Debe seleccionar una fecha')
      return
    }
    
    if (!rentalForm.value.start_time) {
      showError(t('rentals.errors.startTimeRequired') || 'Debe seleccionar la hora de inicio')
      return
    }
    
    if (!rentalForm.value.end_time) {
      showError(t('rentals.errors.endTimeRequired') || 'Debe seleccionar la hora de finalización')
      return
    }
    
    // Create proper UTC datetime strings from local date/time inputs
    const [startHour, startMinute] = rentalForm.value.start_time.split(':').map(Number)
    const [endHour, endMinute] = rentalForm.value.end_time.split(':').map(Number)

    const startLocalDateTime = DateTime.fromISO(rentalForm.value.rental_date).set({
      hour: startHour,
      minute: startMinute,
      second: 0,
      millisecond: 0
    })

    let endLocalDateTime = DateTime.fromISO(rentalForm.value.rental_date).set({
      hour: endHour,
      minute: endMinute,
      second: 0,
      millisecond: 0
    })

    // If end time is before start time, assume it's the next day (for overnight rentals)
    if (endLocalDateTime <= startLocalDateTime) {
      endLocalDateTime = endLocalDateTime.plus({ days: 1 })
    }

    // Validate that dates are valid
    if (!startLocalDateTime.isValid || !endLocalDateTime.isValid) {
      showError(t('rentals.errors.invalidDateTime') || 'Las fechas y horas ingresadas no son válidas')
      return
    }

    // Check if it's an overnight rental
    const isOvernightRental = !startLocalDateTime.hasSame(endLocalDateTime, 'day')

    console.log('Creating rental with local inputs:', {
      rental_date: rentalForm.value.rental_date,
      start_time: rentalForm.value.start_time,
      end_time: rentalForm.value.end_time,
      timezone: getBrowserTimezone(),
      timezoneOffset: DateTime.now().offset
    })

    // Convert local date/time to proper UTC strings with timezone information
    const endDate = isOvernightRental ?
      startLocalDateTime.plus({ days: 1 }).toISODate() :
      rentalForm.value.rental_date
    
    const startDateTime = localDateTimeToUTC(rentalForm.value.rental_date, rentalForm.value.start_time)
    const endDateTime = localDateTimeToUTC(endDate, rentalForm.value.end_time)

    console.log('Converted to UTC:', {
      start_datetime: startDateTime,
      end_datetime: endDateTime
    })

    const rentalData = {
      client_id: rentalForm.value.client_id,
      court_id: rentalForm.value.court_id,
      start_datetime: startDateTime,
      end_datetime: endDateTime,
      status: rentalForm.value.status || 'pending',
      notes: rentalForm.value.notes || '',
      total_amount: totalAmount.value,
      is_recurring: rentalForm.value.is_recurring || false
    }

    // Add scope parameters for recurring event updates
    if (editingRental.value && editingRental.value.is_recurring) {
      rentalData.update_scope = editScope.value

      // For single instance edits, include the exception date
      if (editScope.value === 'single' && editingRental.value._instanceDate) {
        rentalData.exception_date = editingRental.value._instanceDate
      }
    }

    console.log('Saving rental with data:', rentalData)

    let result
    if (editingRental.value) {
      result = await apiClient.updateRental(editingRental.value.id, rentalData)
    } else {
      result = await apiClient.createRental(rentalData)
    }
    
    console.log('Rental saved successfully:', result)
    
    closeRentalModal()
    
    // Small delay to ensure backend has processed the data
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Reload data based on current view
    console.log('Reloading data for current view:', currentView.value)
    await loadRentals()
    if (currentView.value === 'calendar') {
      await loadCalendarData()
    }
    if (currentView.value === 'agenda') {
      console.log('Reloading agenda data after saving rental')
      await loadAgendaData()
    }
    
    // Show success message
    if (editingRental.value) {
      showSuccess(t('rentals.updateSuccess') || 'Alquiler actualizado correctamente')
    } else {
      showSuccess(t('rentals.createSuccess') || 'Alquiler creado correctamente')
    }
  } catch (err) {
    console.error('Error saving rental:', err)
    showError(translateError(err.message) || t('rentals.errorSaveFailed') || 'Error al guardar el alquiler')
  } finally {
    saving.value = false
  }
}

const cancelRentalConfirm = (rental) => {
  // Check if this is a recurring event instance
  if (rental.is_recurring) {
    // Show recurring action dialog
    recurringAction.value = 'cancel'
    recurringRental.value = rental
    showRecurringDialog.value = true
  } else {
    // For non-recurring events, show regular confirmation
    if (confirm(t('rentals.cancelConfirm', { client: rental.client?.full_name || t('rentals.unknownClient') }))) {
      cancelRental(rental, 'all')
    }
  }
}

const handleRecurringActionSelect = async (scope) => {
  const rental = recurringRental.value
  const action = recurringAction.value

  if (!rental) return

  if (action === 'cancel') {
    await cancelRental(rental, scope)
  } else if (action === 'edit') {
    // Store the edit scope for use in saveRental
    editScope.value = scope
    // Open the rental modal with forceOpen = true to bypass the recurring check
    openRentalModal(rental, true)
  }

  // Clear recurring dialog state (but keep editScope)
  recurringRental.value = null
  showRecurringDialog.value = false
}

const cancelRental = async (rental, scope = 'all') => {
  try {
    let exceptionDate = null

    // For single instance cancellations, use the instance date
    if (scope === 'single' && rental._instanceDate) {
      exceptionDate = rental._instanceDate
    }

    await apiClient.cancelRental(rental.id, scope, exceptionDate)

    // Close the modal if it's open
    if (showModal.value) {
      closeRentalModal()
    }

    showSuccess(t('rentals.updateSuccess'))

    // Reload data for current view
    await loadRentals()
    if (currentView.value === 'calendar') {
      await loadCalendarData()
    }
    if (currentView.value === 'agenda') {
      await loadAgendaData()
    }
  } catch (err) {
    showError(translateError(err.message) || t('rentals.errorCancelFailed'))
    console.error('Error cancelling rental:', err)
  }
}

// Error message translation function
const translateError = (errorMessage) => {
  const errorMappings = {
    'Client, court, start and end datetime are required': 'rentals.errors.requiredFields',
    'Start datetime must be before end datetime': 'rentals.errors.invalidDateTime',
    'Client not found': 'rentals.errors.clientNotFound',
    'Court not found': 'rentals.errors.courtNotFound',
    'Court is not available': 'rentals.errors.courtNotAvailable',
    'Court is already booked for this time slot': 'rentals.errors.courtAlreadyBooked',
    'Error checking availability': 'rentals.errors.checkingAvailability',
    'Internal server error': 'rentals.errors.internalError'
  }
  
  // Return translated message if mapping exists, otherwise return the original message
  return errorMappings[errorMessage] ? t(errorMappings[errorMessage]) : errorMessage
}

// Utility functions

// Format number with Argentine peso formatting (thousands separator)
const formatCurrency = (value) => {
  if (!value && value !== 0) return ''
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/\./g, '')) : value
  if (isNaN(numValue)) return ''
  return numValue.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

// Get selected day name for recurring info
const getSelectedDayName = () => {
  if (!rentalForm.value.rental_date) return ''
  const date = DateTime.fromISO(rentalForm.value.rental_date)

  // Use translations for day names
  const dayKeys = [
    'rentals.weekday.sunday',
    'rentals.weekday.monday',
    'rentals.weekday.tuesday',
    'rentals.weekday.wednesday',
    'rentals.weekday.thursday',
    'rentals.weekday.friday',
    'rentals.weekday.saturday'
  ]

  // Luxon weekday: 1=Monday, 7=Sunday; dayKeys: 0=Sunday, 6=Saturday
  const dayIndex = date.weekday === 7 ? 0 : date.weekday
  return t(dayKeys[dayIndex])
}

// Get duration text for display
const getDurationText = () => {
  if (!rentalForm.value.start_time || !rentalForm.value.end_time) {
    return ''
  }
  
  const [startHour, startMinute] = rentalForm.value.start_time.split(':').map(Number)
  const [endHour, endMinute] = rentalForm.value.end_time.split(':').map(Number)
  
  const startTimeMinutes = startHour * 60 + startMinute
  let endTimeMinutes = endHour * 60 + endMinute
  
  // Handle overnight rentals
  if (endTimeMinutes <= startTimeMinutes) {
    endTimeMinutes += 24 * 60
  }
  
  const durationMinutes = endTimeMinutes - startTimeMinutes
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  
  if (minutes === 0) {
    return `${hours} ${hours === 1 ? 'hora' : 'horas'}`
  } else {
    return `${hours} ${hours === 1 ? 'hora' : 'horas'} y ${minutes} minutos`
  }
}

const translateSurfaceType = (surfaceType) => {
  switch (surfaceType) {
    case 'clay':
      return t('courts.clay')
    case 'grass':
      return t('courts.grass')
    case 'hard':
      return t('courts.hard')
    case 'synthetic':
      return t('courts.synthetic')
    default:
      return surfaceType
  }
}

const getDayName = (date) => {
  if (!date) return ''
  const dayNames = [
    t('calendar.sun'), t('calendar.mon'), t('calendar.tue'),
    t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat')
  ]
  // Convert JS Date to Luxon if needed
  const luxonDate = date instanceof Date ? DateTime.fromJSDate(date) : date
  // Luxon weekday: 1=Monday, 7=Sunday; dayNames: 0=Sunday, 6=Saturday
  const dayIndex = luxonDate.weekday === 7 ? 0 : luxonDate.weekday
  return dayNames[dayIndex]
}

const getStatusBorderColor = (status) => {
  switch (status) {
    case 'confirmed':
      return 'border-green-600'
    case 'pending':
      return 'border-yellow-600'
    case 'completed':
      return 'border-blue-600'
    case 'cancelled':
      return 'border-red-600'
    default:
      return 'border-gray-500'
  }
}

const getStatusColor = (status) => {
  switch(status) {
    case 'confirmed': return 'bg-green-100 text-green-800'
    case 'pending': return 'bg-yellow-100 text-yellow-800'
    case 'completed': return 'bg-blue-100 text-blue-800'
    case 'cancelled': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getStatusText = (status) => {
  switch(status) {
    case 'confirmed': return t('rentals.confirmed')
    case 'pending': return t('rentals.pending')
    case 'completed': return t('rentals.completed')
    case 'cancelled': return t('rentals.cancelled')
    default: return status
  }
}

// Group rentals by status for calendar circles
const getStatusGroups = (rentals) => {
  const groups = {}
  rentals.forEach(rental => {
    const status = rental.status || 'pending'
    if (!groups[status]) {
      groups[status] = { count: 0 }
    }
    groups[status].count++
  })
  return groups
}

// Get circle color for status
const getStatusCircleColor = (status) => {
  switch (status) {
    case 'confirmed':
      return 'bg-green-600'
    case 'pending':
      return 'bg-yellow-600'
    case 'completed':
      return 'bg-blue-600'
    case 'cancelled':
      return 'bg-red-600'
    default:
      return 'bg-gray-500'
  }
}

// Check URL parameters for highlighted rental
const checkUrlParams = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const rentalId = urlParams.get('rentalId')
  const focusDate = urlParams.get('date')
  
  if (rentalId) {
    highlightedRentalId.value = rentalId
    
    // If a specific date is provided, set current date
    if (focusDate) {
      currentDate.value = DateTime.fromISO(focusDate)
      dateFilter.value = focusDate
    }
    
    // Switch to agenda view for highlighting
    currentView.value = 'agenda'
  }
}

// Client modal functions
const openClientModal = async () => {
  // Clear any previous errors and refresh clients list before opening modal
  clearError()
  await loadClients()
  showClientModal.value = true
}

const handleClientCreated = async (newClient) => {
  // Add the new client to the clients list
  await loadClients()
  
  // Select the new client in the rental form
  rentalForm.value.client_id = newClient.id
}

// Fetch establishment hours from platform settings
const fetchEstablishmentHours = async () => {
  try {
    const response = await apiClient.getPlatformSettings()
    if (response.start_time && response.end_time) {
      // Parse the time strings (format: "HH:MM:SS" or "HH:MM")
      const startTimeParts = response.start_time.split(':')
      const endTimeParts = response.end_time.split(':')
      
      establishmentStartHour.value = parseInt(startTimeParts[0], 10)
      
      // Handle special case for 23:59 (treat as end of day, show hour 23)
      const endHour = parseInt(endTimeParts[0], 10)
      const endMinute = parseInt(endTimeParts[1], 10)
      
      if (endHour === 23 && endMinute === 59) {
        establishmentEndHour.value = 23
      } else {
        establishmentEndHour.value = endHour
      }
    }
  } catch (error) {
    console.error('Error fetching establishment hours:', error)
    // Keep default values (8-22)
  }
}

// Click-outside handler for dropdowns
const handleClickOutside = (event) => {
  // Handle client dropdown
  if (showClientDropdown.value) {
    const target = event.target
    if (!target.closest('[data-client-dropdown]')) {
      showClientDropdown.value = false
      clientSearchTerm.value = ''
    }
  }

  // Handle date picker
  if (showDatePicker.value) {
    const target = event.target
    if (!target.closest('[data-date-picker]')) {
      showDatePicker.value = false
    }
  }

  // Handle filter date picker
  if (showFilterDatePicker.value) {
    const target = event.target
    if (!target.closest('[data-filter-date-picker]')) {
      showFilterDatePicker.value = false
    }
  }

  // Handle time pickers
  if (showStartTimePicker.value) {
    const target = event.target
    if (!target.closest('[data-start-time]')) {
      showStartTimePicker.value = false
    }
  }

  if (showEndTimePicker.value) {
    const target = event.target
    if (!target.closest('[data-end-time]')) {
      showEndTimePicker.value = false
    }
  }
}

// ESC key handling
const handleKeyDown = (event) => {
  if (event.key === 'Escape') {
    if (showClientDropdown.value) {
      showClientDropdown.value = false
      clientSearchTerm.value = ''
      event.preventDefault()
      event.stopPropagation()
    }
    if (showModal.value) {
      closeRentalModal()
      event.preventDefault()
      event.stopPropagation()
    }
    if (showClientModal.value) {
      showClientModal.value = false
      event.preventDefault()
      event.stopPropagation()
    }
  }
}

onMounted(async () => {
  // Ensure page starts at top, especially important for mobile
  window.scrollTo(0, 0)
  
  
  // Fix hydration date mismatch by ensuring consistent date
  currentDate.value = getConsistentDate()
  
  checkUrlParams()
  
  // Load basic data first
  await Promise.all([
    loadClients(),
    loadCourts(),
    fetchEstablishmentHours()
  ])
  
  // Load data based on current view
  if (currentView.value === 'agenda') {
    await loadAgendaData()
  } else if (currentView.value === 'calendar') {
    await loadCalendarData()
  }
  
  // Initialize WebSocket connection
  setupWebSocket()
  
  // Add event listeners
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  // Remove event listeners
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeyDown)
  
  // Disconnect WebSocket
  wsManager.disconnect()
})
</script>

<style scoped>
/* Calendar container and grid */
.calendar-container {
  background: var(--card-bg);
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid #4A5568;
  padding: 1rem;
}

/* Calendar day cells */
.calendar-day {
  height: 7rem;
  min-height: 7rem;
  border: 1px solid #4A5568;
  border-radius: 0.375rem;
  background: var(--hover-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 0.5rem;
}

/* Mobile responsive calendar */
@media (max-width: 640px) {
  .calendar-day {
    height: 4rem;
    min-height: 4rem;
    padding: 0.25rem;
    font-size: 0.75rem;
  }
  
  .calendar-day-number {
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .rental-item {
    font-size: 0.625rem;
    padding: 0.125rem 0.25rem;
    margin-bottom: 0.125rem;
  }
}

.calendar-day:hover {
  background-color: var(--card-bg);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.calendar-day.today {
  background-color: var(--card-bg);
  border-color: var(--accent-lime);
  border-width: 2px;
}

/* Empty calendar cells for days outside current month */
.calendar-empty-cell {
  height: 7rem;
  min-height: 7rem;
  box-sizing: border-box;
  background: var(--primary-bg);
}

/* Calendar day content structure */
.calendar-day-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.calendar-day-number {
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-white);
  margin-bottom: 0.25rem;
}

.calendar-rentals {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Individual rental items in calendar */
.rental-item {
  font-size: 0.75rem;
  padding: 2px 4px;
  border-radius: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
  line-height: 1.2;
}

/* Status color classes for rental items */
.rental-item.bg-yellow-100 {
  background-color: #fef3c7;
  color: #92400e;
}

.rental-item.bg-green-100 {
  background-color: #dcfce7;
  color: #166534;
}

.rental-item.bg-blue-100 {
  background-color: #dbeafe;
  color: #1e40af;
}

.rental-item.bg-red-100 {
  background-color: #fee2e2;
  color: #dc2626;
}

.rental-item.bg-gray-100 {
  background-color: #f3f4f6;
  color: #374151;
}

/* Today highlighting */
.today .calendar-day-number {
  color: var(--accent-lime);
  font-weight: 700;
}
</style>
