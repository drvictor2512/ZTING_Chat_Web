import api from '../config/api'

const friendService = {
  // Send friend request
  sendFriendRequest: async (userId, message = '') => {
    try {
      // backend expects { to, message }
      const response = await api.post('/friends/requests', { 
        to: userId,
        message: message 
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get all friend requests (incoming)
  getFriendRequests: async () => {
    try {
      const response = await api.get('/friends/requests')
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Accept friend request
  acceptFriendRequest: async (requestId) => {
    try {
      const response = await api.post(`/friends/requests/${requestId}/accept`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Decline friend request
  declineFriendRequest: async (requestId) => {
    try {
      const response = await api.post(`/friends/requests/${requestId}/decline`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get all friends
  getAllFriends: async () => {
    try {
      const response = await api.get('/friends')
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Unfriend a user
  unfriend: async (userId) => {
    try {
      const response = await api.delete(`/friends/${userId}`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Cancel / revoke a sent friend request
  cancelFriendRequest: async (requestId, toUserId) => {
    try {
      // Thử dùng to (userId người nhận) theo pattern của send endpoint
      if (toUserId) {
        const response = await api.delete('/friends/requests', { data: { to: toUserId } })
        return response.data
      }
      // Fallback: dùng requestId trong body
      const response = await api.delete('/friends/requests', { data: { requestId } })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  }
}

export default friendService
