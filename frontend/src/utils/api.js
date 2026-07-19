const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
const AGENDA_BASE_URL = import.meta.env.PUBLIC_AGENDA_API_BASE_URL || 'http://localhost:3001/api/agenda';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.agendaBaseURL = AGENDA_BASE_URL;
  }

  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  getCurrentUserFromStorage() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  async request(endpoint, options = {}, baseUrl = this.baseURL) {
    const url = `${baseUrl}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    };

    console.log('API Request:', { url, headers: config.headers, method: options.method || 'GET' });

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      console.log('API Response:', { status: response.status, data });

      if (!response.ok) {
        // Handle invalid/expired token
        if (response.status === 403 || response.status === 401) {
          if (data.error === 'Invalid token' || data.message === 'Invalid token') {
            // Clear invalid token and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login?error=session_expired';
            return;
          }
        }

        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', { url, error });
      throw error;
    }
  }

  async agendaRequest(endpoint, options = {}) {
    return this.request(endpoint, options, this.agendaBaseURL);
  }

  // Auth methods
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async refreshToken() {
    return this.request('/auth/refresh', {
      method: 'POST'
    });
  }

  async changePassword(passwordData) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData)
    });
  }

  // Users methods
  async getUsers() {
    return this.request('/users');
  }

  async createUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async updateUser(id, userData) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: 'DELETE'
    });
  }

  // Clients methods
  async getClients(params = {}) {
    console.log('API Client: getClients called with params:', params);
    const queryString = new URLSearchParams(params).toString();
    const url = `/clients${queryString ? `?${queryString}` : ''}`;
    console.log('API Client: Making request to:', url);
    return this.request(url);
  }

  async getClient(id) {
    return this.request(`/clients/${id}`);
  }

  async createClient(clientData) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(clientData)
    });
  }

  async updateClient(id, clientData) {
    return this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clientData)
    });
  }

  async deleteClient(id) {
    return this.request(`/clients/${id}`, {
      method: 'DELETE'
    });
  }

  // Courts methods
  async getCourts() {
    return this.request('/courts');
  }

  async getCourt(id) {
    return this.request(`/courts/${id}`);
  }

  async createCourt(courtData) {
    return this.request('/courts', {
      method: 'POST',
      body: JSON.stringify(courtData)
    });
  }

  async updateCourt(id, courtData) {
    return this.request(`/courts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courtData)
    });
  }

  async deleteCourt(id) {
    return this.request(`/courts/${id}`, {
      method: 'DELETE'
    });
  }

  async getCourtAvailability(id, startDate, endDate) {
    return this.request(`/courts/${id}/availability?start_date=${startDate}&end_date=${endDate}`);
  }

  // Rentals methods
  async getRentals(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/rentals${queryString ? `?${queryString}` : ''}`);
  }

  async getRental(id) {
    return this.request(`/rentals/${id}`);
  }

  async createRental(rentalData) {
    return this.agendaRequest('/rentals', {
      method: 'POST',
      body: JSON.stringify(rentalData)
    });
  }

  async updateRental(id, rentalData) {
    return this.agendaRequest(`/rentals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(rentalData)
    });
  }

  async updateRentalStatus(id, status) {
    return this.agendaRequest(`/rentals/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async deleteRental(id) {
    return this.request(`/rentals/${id}`, {
      method: 'DELETE'
    });
  }

  async getCalendarView(startDate, endDate) {
    return this.agendaRequest(`/calendar/view?start_date=${startDate}&end_date=${endDate}`);
  }

  // Rental exceptions methods (for recurring events)
  async getRentalExceptions(rentalId) {
    return this.agendaRequest(`/rentals/${rentalId}/exceptions`);
  }

  async createRentalException(rentalId, exceptionData) {
    return this.agendaRequest(`/rentals/${rentalId}/exceptions`, {
      method: 'POST',
      body: JSON.stringify(exceptionData)
    });
  }

  async deleteRentalException(rentalId, exceptionDate) {
    return this.agendaRequest(`/rentals/${rentalId}/exceptions/${exceptionDate}`, {
      method: 'DELETE'
    });
  }

  // Cancel rental with scope support
  async cancelRental(id, scope = 'all', exceptionDate = null) {
    const body = { status: 'cancelled' };
    if (scope) {
      body.update_scope = scope;
    }
    if (exceptionDate) {
      body.exception_date = exceptionDate;
    }
    return this.agendaRequest(`/rentals/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  // Account methods
  async getCurrentAccount() {
    return this.request('/accounts/current');
  }

  async updateAccount(accountData) {
    return this.request('/accounts/current', {
      method: 'PUT',
      body: JSON.stringify(accountData)
    });
  }

  async getAccountStats() {
    return this.request('/accounts/stats');
  }

  async getAccountWarning() {
    return this.request('/accounts/warning');
  }

  async processPayment(paymentData) {
    return this.request('/accounts/payment', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }

  async setupAccount(setupData) {
    return this.request('/setup', {
      method: 'POST',
      body: JSON.stringify(setupData)
    });
  }

  // User profile methods
  async updateUserProfile(profileData) {
    try {
      return this.request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });
    } catch (error) {
      // Temporary fallback until backend is implemented
      if (error.message.includes('404') || error.message.includes('Route not found')) {
        // Simulate successful update by updating localStorage
        const user = localStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          Object.assign(userData, profileData);
          localStorage.setItem('user', JSON.stringify(userData));
          return { success: true, user: userData };
        }
      }
      throw error;
    }
  }

  // Platform settings methods
  async getPlatformSettings() {
    return this.request('/platform-settings');
  }

  async getPlatformSettingsAdmin() {
    return this.request('/platform-settings/admin');
  }

  async updatePlatformSettings(settingsData) {
    return this.request('/platform-settings', {
      method: 'PUT',
      body: JSON.stringify({
        platform_title: settingsData.platformTitle,
        platform_logo: settingsData.platformLogo,
        start_time: settingsData.startTime,
        end_time: settingsData.endTime
      })
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
