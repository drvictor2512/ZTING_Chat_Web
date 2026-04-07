import api from '../config/api'

const authService = {
  // Register user - signup (no OTP needed for registration)
  register: async (userData) => {
    try {
      const response = await api.post('/auth/signup', userData)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Login user - signin (email & password only)
  login: async (email, password) => {
    try {
      const payload = { email, password }
      const response = await api.post('/auth/signin', payload)
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.fetchUser))
      }
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Send or request a generic OTP (used for signup verification or forgot-password)
  sendOTP: async (email) => {
    try {
      const response = await api.post('/auth/otp', { email })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Verify an OTP (for signup or reset flows)
  verifyOTP: async (email, otp) => {
    try {
      const response = await api.post('/auth/verify-otp', { email, otp })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Send forgot password OTP
  sendForgotPasswordOTP: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Reset password
  resetPassword: async (email, otp, newPassword) => {
    try {
      const response = await api.post('/auth/reset-password', {
        email,
        otp,
        newPassword
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Logout user
  logout: async () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  // Change password
  changePassword: async (oldPassword, newPassword) => {
    try {
      const response = await api.post('/auth/change-password', { oldPassword, newPassword })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Close account
  closeAccount: async (password) => {
    try {
      const response = await api.post('/auth/close-account', { password })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get current user
  getCurrentUser: () => {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  },

  // Check if user is logged in
  isAuthenticated: () => {
    return !!localStorage.getItem('token')
  }
}

export default authService
