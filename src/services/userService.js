import api from '../config/api'

const userService = {
  // Get current user profile
  getProfile: async () => {
    try {
      const response = await api.get('/user/profile')
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get user profile by ID
  getUserById: async (userId) => {
    try {
      const response = await api.get(`/user/${userId}`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Update profile
  updateProfile: async (data) => {
    try {
      const response = await api.put('/user/profile', data)
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
      const response = await api.post('/user/avatar', formData)
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
      const response = await api.post('/user/banner', formData)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Search user by email
  searchUserByEmail: async (email) => {
    try {
      const response = await api.get('/user/search', {
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
      const response = await api.post('/user/block', { userId })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Unblock user
  unblockUser: async (userId) => {
    try {
      const response = await api.post('/user/unblock', { userId })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get blocked users
  getBlockedUsers: async () => {
    try {
      const response = await api.get('/user/blocked')
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  }
}

export default userService
