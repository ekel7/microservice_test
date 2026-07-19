const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

// Admin API utility functions
class AdminApiClient {
  constructor() {
    this.baseURL = `${API_BASE_URL}/admin`
  }

  // Set authorization header
  getHeaders() {
    const token = localStorage.getItem('admin_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // Generic API request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const config = {
      headers: this.getHeaders(),
      ...options
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Admin API Error (${endpoint}):`, error)
      throw error
    }
  }

  // Authentication methods
  async login(credentials) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Login failed')
    }

    localStorage.setItem('admin_token', data.token)
    localStorage.setItem('admin_user', JSON.stringify(data.admin))

    return data
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' })
    } finally {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
    }
  }

  async getCurrentAdmin() {
    return await this.request('/auth/me')
  }

  // Account management methods
  async getAccounts() {
    return await this.request('/accounts')
  }

  async getAccount(id) {
    return await this.request(`/accounts/${id}`)
  }

  async createAccount(accountData) {
    return await this.request('/accounts', {
      method: 'POST',
      body: JSON.stringify(accountData)
    })
  }

  async updateAccountStatus(id, status) {
    return await this.request(`/accounts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
  }

  async updateAccount(id, updateData) {
    return await this.request(`/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    })
  }

  // User management methods
  async getUsers(filters = {}) {
    const queryParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value)
    })
    
    const query = queryParams.toString()
    return await this.request(`/users${query ? `?${query}` : ''}`)
  }

  async getUser(id) {
    return await this.request(`/users/${id}`)
  }

  async resetUserPassword(id, newPassword) {
    return await this.request(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword })
    })
  }

  async updateUserStatus(id, isActive) {
    return await this.request(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive })
    })
  }

  async updateUserRole(id, role) {
    return await this.request(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    })
  }

  async getUserActivity(id) {
    return await this.request(`/users/${id}/activity`)
  }

  // Payment management methods
  async getPayments(filters = {}) {
    const queryParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value)
    })
    
    const query = queryParams.toString()
    return await this.request(`/payments${query ? `?${query}` : ''}`)
  }

  async getPayment(id) {
    return await this.request(`/payments/${id}`)
  }

  async registerPayment(paymentData) {
    return await this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    })
  }

  async updatePaymentStatus(id, status) {
    return await this.request(`/payments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_status: status })
    })
  }

  async updatePayment(id, updateData) {
    return await this.request(`/payments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData)
    })
  }

  async getPaymentStats(filters = {}) {
    const queryParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value)
    })
    
    const query = queryParams.toString()
    return await this.request(`/payments/stats/summary${query ? `?${query}` : ''}`)
  }

  // Admin logs methods
  async getAdminLogs(filters = {}) {
    const queryParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value)
    })
    
    const query = queryParams.toString()
    return await this.request(`/logs${query ? `?${query}` : ''}`)
  }

  async getRecentAdminLogs(limit = 10) {
    return await this.request(`/logs/recent?limit=${limit}`)
  }

  async getAdminLogStats(filters = {}) {
    const queryParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value)
    })
    
    const query = queryParams.toString()
    return await this.request(`/logs/stats${query ? `?${query}` : ''}`)
  }

  async getTargetLogs(targetType, targetId, limit = 20) {
    return await this.request(`/logs/target/${targetType}/${targetId}?limit=${limit}`)
  }

  // System health method
  async getSystemHealth() {
    return await this.request('/health')
  }

  // Utility methods
  isAuthenticated() {
    return !!this.token
  }

  getStoredAdmin() {
    const adminData = localStorage.getItem('admin_user')
    return adminData ? JSON.parse(adminData) : null
  }
}

// Create and export a singleton instance
export const adminApiClient = new AdminApiClient();
export default adminApiClient;
