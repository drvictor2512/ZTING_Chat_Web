import io from 'socket.io-client'

const SOCKET_URL = 'https://chatapp-backend-eiae.onrender.com'

let socket = null

const socketService = {
  // Initialize socket connection
  connect: (userId) => {
    if (socket && socket.connected) {
      return socket
    }

    socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['polling', 'websocket']
    })

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id)
      if (userId) {
        socket.emit('join', { userId })
      }
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
    })

    return socket
  },

  // Join a specific conversation room
  joinConversation: (conversationId) => {
    if (socket && conversationId) {
      // server lắng nghe sự kiện "joinConversation"
      socket.emit('joinConversation', { conversationId })
      console.log('Joined conversation:', conversationId)
    }
  },

  // Leave a conversation room
  leaveConversation: (conversationId) => {
    if (socket && conversationId) {
      socket.emit('leaveConversation', { conversationId })
      console.log('Left conversation:', conversationId)
    }
  },

  // Get socket instance
  getSocket: () => socket,

  // Disconnect socket
  disconnect: () => {
    if (socket) {
      socket.disconnect()
      socket = null
    }
  },

  // Subscribe to new messages
  onNewMessage: (callback) => {
    if (socket) {
      socket.on('new_message', callback)
    }
  },

  // Subscribe to message recall
  onMessageRecalled: (callback) => {
    if (socket) {
      socket.on('message_recalled', callback)
    }
  },

  // Subscribe to user status changes
  onUserStatus: (callback) => {
    if (socket) {
      socket.on('user_status', callback)
    }
  },

  // ── Friend real-time events ──────────────────────────────────────────────

  // Khi có người gửi lời mời kết bạn đến mình
  onFriendRequestReceived: (callback) => {
    if (socket) socket.on('friend_request_received', callback)
  },

  // Khi yêu cầu kết bạn mình gửi đi được chấp nhận
  onFriendRequestAccepted: (callback) => {
    if (socket) socket.on('friend_request_accepted', callback)
  },

  // Khi yêu cầu kết bạn mình gửi đi bị từ chối
  onFriendRequestDeclined: (callback) => {
    if (socket) socket.on('friend_request_declined', callback)
  },

  // Khi người kia thu hồi lời mời kết bạn họ đã gửi cho mình
  onFriendRequestCancelled: (callback) => {
    if (socket) socket.on('friend_request_cancelled', callback)
  },

  // Khi bị hủy kết bạn bởi người kia
  onFriendRemoved: (callback) => {
    if (socket) socket.on('friend_removed', callback)
  },

  // ────────────────────────────────────────────────────────────────────────

  // Unsubscribe from event
  off: (event, callback) => {
    if (socket) {
      socket.off(event, callback)
    }
  },

  // Remove all listeners for an event
  offAll: (event) => {
    if (socket) {
      socket.removeAllListeners(event)
    }
  }
}

export default socketService

