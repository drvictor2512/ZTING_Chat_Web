import api from '../config/api'

const aiService = {
  // Get or create AI conversation
  getAIConversation: async () => {
    try {
      const response = await api.get('/ai/conversation')
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get AI messages
  getAIMessages: async (conversationId, params = {}) => {
    try {
      const response = await api.get('/ai/messages', {
        params: { conversationId, ...params }
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Clear AI messages
  clearAIMessages: async (conversationId) => {
    try {
      const response = await api.delete('/ai/messages', {
        params: { conversationId }
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  }
}

export default aiService
