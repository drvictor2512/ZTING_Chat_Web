import api from '../config/api'

const conversationService = {
  // Create a new conversation (1-on-1 or group)
  createConversation: async (data) => {
    try {
      const response = await api.post('/conversations', data)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get all conversations for current user
  getConversations: async () => {
    try {
      const response = await api.get('/conversations')
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get messages in a conversation
  getMessages: async (conversationId) => {
    try {
      const response = await api.get(`/conversations/${conversationId}/messages`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Mark conversation as read
  markAsRead: async (conversationId) => {
    try {
      const response = await api.patch(`/conversations/${conversationId}/read`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get invite link for group
  getInviteLink: async (conversationId) => {
    try {
      const response = await api.get(`/conversations/${conversationId}/invite`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Join group by invite link
  joinByInvite: async (token) => {
    try {
      const response = await api.post('/conversations/group/join-invite', { token })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Rename group
  renameGroup: async (conversationId, newName) => {
    try {
      const response = await api.post('/conversations/group/rename', {
        conversationId,
        // backend expects field name "name"
        name: newName
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Add member to group
  addGroupMember: async (conversationId, userId) => {
    try {
      const response = await api.post('/conversations/group/add-member', {
        conversationId,
        userId
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Remove member from group
  removeGroupMember: async (conversationId, userId) => {
    try {
      const response = await api.post('/conversations/group/remove-member', {
        conversationId,
        userId
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Leave group
  leaveGroup: async (conversationId) => {
    try {
      const response = await api.post('/conversations/group/leave', {
        conversationId
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Delete group (owner only)
  deleteGroup: async (conversationId) => {
    try {
      const response = await api.delete(`/conversations/group/${conversationId}`)
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Send a message (direct or group)
  sendMessage: async ({ conversationId, recipientId, content, isGroup = false, file }) => {
    try {
      const formData = new FormData()
      if (recipientId) formData.append('recipientId', recipientId)
      if (conversationId) formData.append('conversationId', conversationId)
      if (content !== undefined) formData.append('content', content)
      if (file) {
        // Backend cũ (dùng trong Test_Frontend-main) nhận field 'image',
        // còn backend mới hơn nhận 'file' → gửi cả hai để tương thích.
        formData.append('file', file)
        formData.append('image', file)
      }
      const url = isGroup ? '/messages/group' : '/messages/direct'
      const response = await api.post(url, formData)
      return response.data
    } catch (error) {
      // Extract error message from response or use default
      const errorData = error.response?.data
      const errorMessage = errorData?.message || error.message || 'Không thể gửi tin nhắn'
      const err = new Error(errorMessage)
      throw err
    }
  },

  // Send direct message (matching Test_Frontend-main)
  sendDirectMessage: async (formData) => {
    try {
      const response = await api.post('/messages/direct', formData)
      return response.data
    } catch (error) {
      const errorData = error.response?.data
      const errorMessage = errorData?.message || error.message || 'Không thể gửi tin nhắn'
      const err = new Error(errorMessage)
      throw err
    }
  },

  // Send group message (matching Test_Frontend-main)
  sendGroupMessage: async (formData) => {
    try {
      const response = await api.post('/messages/group', formData)
      return response.data
    } catch (error) {
      const errorData = error.response?.data
      const errorMessage = errorData?.message || error.message || 'Không thể gửi tin nhắn'
      const err = new Error(errorMessage)
      throw err
    }
  }
}

export default conversationService
