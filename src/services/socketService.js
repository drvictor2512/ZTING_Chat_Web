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
      transports: ['websocket', 'polling']
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

