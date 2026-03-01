import api from '../config/api'

const userService = {
  // Get current user profile
  getProfile: async () => {
    try {
      const response = await api.get('/users/profile')
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get user profile by ID
  getUserById: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Update profile
  updateProfile: async (data) => {
    try {
      const response = await api.put('/users/profile', data)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Upload avatar
  uploadAvatar: async (file) => {
    try {
      const formData = new FormData()
      formData.append('image', file)
      const response = await api.post('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Upload banner
  uploadBanner: async (file) => {
    try {
      const formData = new FormData()
      formData.append('image', file)
      const response = await api.post('/users/banner', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Search user by email
  searchUserByEmail: async (email) => {
    try {
      const response = await api.get('/users/search', {
        params: { email }
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Block user
  blockUser: async (userId) => {
    try {
      const response = await api.post('/users/block', { userId })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Unblock user
  unblockUser: async (userId) => {
    try {
      const response = await api.post('/users/unblock', { userId })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get blocked users
  getBlockedUsers: async () => {
    try {
      const response = await api.get('/users/blocked')
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  }
}

export default userService
