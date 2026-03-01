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

  // Login user - signin (requires OTP)
  login: async (email, password, otp = null) => {
    try {
      const payload = { email, password }
      if (otp) {
        payload.otp = otp
      }
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

  // Request a login OTP be sent to the user
  sendLoginOTP: async (email) => {
    try {
      const response = await api.post('/auth/otp', { email })
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
    try {
      await api.post('/auth/signout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
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
