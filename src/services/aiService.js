import api from '../config/api'

const aiService = {
  // Send message to AI and get response
  sendMessage: async (message) => {
    try {
      const response = await api.post('/ai/chat', { message })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Get AI chat history
  getChatHistory: async () => {
    try {
      const response = await api.get('/ai/history')
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Clear AI chat history
  clearHistory: async () => {
    try {
      const response = await api.delete('/ai/history')
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  }
}

export default aiService
