import api from '../config/api'

const requestToFirstAvailableEndpoint = async (requests, payload) => {
  let lastError = null

  for (const req of requests) {
    const method = typeof req === 'string' ? 'post' : (req.method || 'post').toLowerCase()
    const endpoint = typeof req === 'string' ? req : req.url

    try {
      let response
      if (method === 'delete') {
        response = await api.delete(endpoint, { data: payload })
      } else if (method === 'patch') {
        response = await api.patch(endpoint, payload)
      } else if (method === 'put') {
        response = await api.put(endpoint, payload)
      } else {
        response = await api.post(endpoint, payload)
      }
      return response.data
    } catch (error) {
      lastError = error
      const status = error?.response?.status
      // Try next candidate when route is not found.
      if (status === 404) continue
      // For non-404 errors (auth/validation/etc.), surface immediately.
      throw error.response?.data || error.message
    }
  }

  throw lastError?.response?.data || lastError?.message || 'Không thể thực hiện thao tác nhóm'
}

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

  // Join group by invite code
  joinByInvite: async (inviteCode) => {
    try {
      const response = await api.post('/conversations/group/join-invite', { inviteCode })
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
        memberId: userId,
        userId
      })
      return response.data
    } catch (error) {
      throw error.response?.data || error.message
    }
  },

  // Remove member from group
  removeGroupMember: async (conversationId, userId) => {
    const payload = {
      conversationId,
      memberId: userId,
      userId
    }
    return requestToFirstAvailableEndpoint(
      [
        { method: 'post', url: '/conversations/group/remove-member' },
        { method: 'delete', url: '/conversations/group/remove-member' }
      ],
      payload
    )
  },

  // Promote a member to deputy
  promoteToDeputy: async (conversationId, userId) => {
    const payload = {
      conversationId,
      memberId: userId,
      userId,
      action: 'assign'
    }
    return requestToFirstAvailableEndpoint(
      [
        { method: 'post', url: '/conversations/group/assign-deputy' },
        { method: 'post', url: '/conversations/group/promote-member' },
        { method: 'post', url: '/conversations/group/appoint-deputy' },
        { method: 'post', url: '/conversations/group/promote' }
      ],
      payload
    )
  },

  // Revoke deputy role
  revokeDeputyRole: async (conversationId, userId) => {
    const base = {
      conversationId,
      memberId: userId,
      userId
    }

    // Backend đang dùng assign-deputy cho cả cấp/thu hồi nhưng action có thể khác nhau.
    const payloadCandidates = [
      { ...base, action: 'revoke' },
      { ...base, action: 'remove' },
      { ...base, action: 'demote' },
      { ...base, action: 'unassign' },
      { ...base, deputyId: userId, action: 'revoke' },
      { ...base, deputyId: userId, action: 'remove' }
    ]

    let lastError = null
    for (const payload of payloadCandidates) {
      try {
        const res = await api.post('/conversations/group/assign-deputy', payload)
        return res.data
      } catch (error) {
        lastError = error
        const status = error?.response?.status
        // Với endpoint sống nhưng validate/chuyển trạng thái khác nhau, tiếp tục thử biến thể kế tiếp.
        if (status === 400 || status === 404 || status === 500) continue
        throw error.response?.data || error.message
      }
    }

    // Fallback cho backend cũ (nếu có).
    try {
      return await requestToFirstAvailableEndpoint(
        [
          { method: 'post', url: '/conversations/group/demote-member' },
          { method: 'post', url: '/conversations/group/revoke-deputy' },
          { method: 'post', url: '/conversations/group/demote' }
        ],
        { ...base, action: 'remove' }
      )
    } catch {
      throw lastError?.response?.data || lastError?.message || 'Không thể thu hồi quyền phó nhóm'
    }
  },

  // Transfer owner role to another member
  transferOwner: async (conversationId, userId) => {
    const payload = {
      conversationId,
      newOwnerId: userId,
      memberId: userId,
      userId
    }
    return requestToFirstAvailableEndpoint(
      [
        { method: 'post', url: '/conversations/group/transfer-owner' },
        { method: 'post', url: '/conversations/group/transfer-ownership' },
        { method: 'post', url: '/conversations/group/transfer-leader' }
      ],
      payload
    )
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
