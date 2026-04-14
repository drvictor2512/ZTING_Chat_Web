import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdChat, MdContacts, MdPeople, MdGroup, MdSmartToy, MdSettings, MdPerson, MdPersonAdd, MdLink, MdEmail, MdLogout, MdEdit, MdClose, MdMenu, MdBlock, MdEmojiEmotions, MdAttachFile, MdSend } from 'react-icons/md'
import EmojiPicker from 'emoji-picker-react'
import toast from 'react-hot-toast'
import authService from '../services/authService'
import conversationService from '../services/conversationService'
import friendService from '../services/friendService'
import userService from '../services/userService'
import aiService from '../services/aiService'
import socketService from '../services/socketService'
import { isImageUrl, isVideoUrl, isGifUrl, isDocumentUrl, basenameFromUrl, downloadFile } from '../utils/mediaHelpers'
import AppSidebar from '../components/home/AppSidebar'
import ConfirmPopup from '../components/home/ConfirmPopup'
import ContactsPanel from '../components/home/ContactsPanel'
import UserProfileModal from '../components/home/UserProfileModal'
import UserInfoModal from '../components/home/UserInfoModal'
import AddFriendModal from '../components/home/AddFriendModal'
import SendRequestModal from '../components/home/SendRequestModal'
import GroupModals from '../components/home/GroupModals'
import ChatView from '../components/home/views/ChatView'
import FriendsView from '../components/home/views/FriendsView'
import AIView from '../components/home/views/AIView'
import SettingsView from '../components/home/views/SettingsView'
import '../styles/home.css'

const Home = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(authService.getCurrentUser())

  // Views: 'chat', 'friends', 'ai', 'settings'
  const [currentView, setCurrentView] = useState('chat')
  const [conversations, setConversations] = useState([])
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([]) // incoming requests
  const [sentRequests, setSentRequests] = useState([]) // outgoing
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredContacts, setFilteredContacts] = useState([])
  const [loading, setLoading] = useState(false)
  const [chatNotice, setChatNotice] = useState('')
  const [error, setError] = useState('')
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [popupUser, setPopupUser] = useState(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', dateOfBirth: '', gender: '', bio: '' })
  const avatarInputRef = useRef(null)
  const bannerInputRef = useRef(null)
  const [selectedContact, setSelectedContact] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [mediaModalUrl, setMediaModalUrl] = useState(null)
  const [mediaModalType, setMediaModalType] = useState('image')
  const [mediaModalName, setMediaModalName] = useState(null)
  const [messageMenuOpen, setMessageMenuOpen] = useState(null)
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState([])
  const [onlineStatus, setOnlineStatus] = useState({}) // { userId: { status: 'online'|'offline', lastSeen: timestamp } }
  const messagesEndRef = useRef(null)
  const messageInputRef = useRef(null)

  const normalizeUserId = (value) => {
    if (!value) return ''
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    if (typeof value !== 'object') return ''

    // Handle Mongo Extended JSON/ObjectId-like payloads from socket.
    if (typeof value.$oid === 'string' && value.$oid) return value.$oid
    if (typeof value.toHexString === 'function') {
      const hex = value.toHexString()
      if (hex) return String(hex)
    }

    const candidates = [
      value._id,
      value.id,
      value.$oid,
      value.userId,
      value.blockedUserId,
      value.targetId,
      value.user,
      value.profile
    ]

    for (const item of candidates) {
      if (!item) continue
      const normalized = normalizeUserId(item)
      if (normalized) return normalized
    }

    try {
      const raw = String(value)
      if (raw && raw !== '[object Object]') return raw
    } catch { }

    return ''
  }

  const normalizeConversationId = (value) => {
    if (!value) return ''
    if (typeof value === 'string' || typeof value === 'number') return String(value)
    if (typeof value !== 'object') return ''

    const direct =
      value._id ||
      value.id ||
      value.$oid ||
      value.conversationId ||
      value.convId ||
      null

    if (direct) {
      const normalized = normalizeUserId(direct)
      if (normalized) return normalized
    }

    if (typeof value.toHexString === 'function') {
      const hex = value.toHexString()
      if (hex) return String(hex)
    }

    try {
      const raw = String(value)
      if (raw && raw !== '[object Object]') return raw
    } catch { }

    return ''
  }

  const normalizeUnreadCounts = (value) => {
    if (!value) return {}
    if (value instanceof Map) return Object.fromEntries(value)
    if (Array.isArray(value)) return Object.fromEntries(value)
    if (typeof value === 'object') return value
    return {}
  }

  const normalizeBlockedUsers = (items = []) =>
    items
      .map(normalizeUserId)
      .filter(Boolean)

  const getDirectParticipantId = (contact) => {
    if (!contact) return ''

    const directId = normalizeUserId(contact.participantId)
    if (directId) return directId

    const participants = Array.isArray(contact.participants) ? contact.participants : []
    const myId = normalizeUserId(user?._id)
    const other = participants.find((p) => {
      const pId = normalizeUserId(p?.userId || p?._id || p)
      return pId && pId !== myId
    })

    return normalizeUserId(other?.userId || other?._id || other)
  }

  const isBlockedUser = (userId) => {
    const targetId = normalizeUserId(userId)
    if (!targetId) return false
    return blockedUsers.some(id => normalizeUserId(id) === targetId)
  }

  // load list of users blocked by current user
  const loadBlockedUsers = async () => {
    try {
      const res = await userService.getBlockedUsers()
      const payload =
        (Array.isArray(res) && res) ||
        res?.blocked ||
        res?.blockedUsers ||
        res?.users ||
        res?.data?.blocked ||
        res?.data?.blockedUsers ||
        res?.data?.users ||
        []
      setBlockedUsers(normalizeBlockedUsers(Array.isArray(payload) ? payload : []))
    } catch (err) {
      console.error('cannot load blocked users', err)
    }
  }
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [showCloseAccount, setShowCloseAccount] = useState(false)
  const [closeAccountPassword, setCloseAccountPassword] = useState('')

  // Add friend modal states
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  // Send friend request popup states
  const [showSendRequestModal, setShowSendRequestModal] = useState(false)
  const [selectedUserToAdd, setSelectedUserToAdd] = useState(null)
  const [requestMessage, setRequestMessage] = useState('Xin chào, mình muốn kết bạn với bạn!')

  // Friend list management states
  const [friendSearchTerm, setFriendSearchTerm] = useState('')
  const [friendSortOrder, setFriendSortOrder] = useState('A-Z')
  const [friendMenuOpen, setFriendMenuOpen] = useState(null)
  const [filteredFriends, setFilteredFriends] = useState([])

  // Group list management states
  const [groupSearchTerm, setGroupSearchTerm] = useState('')
  const [groupSortOrder, setGroupSortOrder] = useState('A-Z')
  const [showAddMembersModal, setShowAddMembersModal] = useState(false)
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState([])
  const [showTransferOwnerModal, setShowTransferOwnerModal] = useState(false)
  const [transferTargetUserId, setTransferTargetUserId] = useState('')
  const [groupActionLoading, setGroupActionLoading] = useState(false)
  const [friendsView, setFriendsView] = useState('friends-list')
  const normalizedError = String(error || '').toLowerCase()
  const shouldHideSidebarError =
    normalizedError.includes('bị chặn bởi người này') ||
    normalizedError.includes('đã chặn người này') ||
    normalizedError.includes('bỏ chặn để gửi tin nhắn')
  const sidebarError = shouldHideSidebarError ? '' : error
  const confirmResolverRef = useRef(null)
  const [confirmPopup, setConfirmPopup] = useState({
    open: false,
    title: 'Xác nhận',
    message: '',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    danger: false
  })

  // AI Chat states
  const [aiMessages, setAiMessages] = useState([])
  const [aiTyping, setAiTyping] = useState(false)
  const [aiConversation, setAiConversation] = useState(null)
  const fileInputRefAI = useRef(null)

  useEffect(() => {
    if (error) {
      toast.error(error, { id: 'home-error-toast' })
    }
  }, [error])

  const openConfirmPopup = ({
    title = 'Xác nhận',
    message,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    danger = false
  }) => {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve
      setConfirmPopup({
        open: true,
        title,
        message: message || '',
        confirmText,
        cancelText,
        danger
      })
    })
  }

  const closeConfirmPopup = (confirmed) => {
    const resolver = confirmResolverRef.current
    confirmResolverRef.current = null
    setConfirmPopup(prev => ({ ...prev, open: false }))
    if (resolver) resolver(Boolean(confirmed))
  }

  useEffect(() => {
    return () => {
      if (confirmResolverRef.current) {
        confirmResolverRef.current(false)
        confirmResolverRef.current = null
      }
    }
  }, [])

  // Check authentication
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login')
      return
    }

    // load dữ liệu ban đầu cho màn home
    loadConversations()
    loadFriends()
    loadFriendRequests()
    loadBlockedUsers()

    // Connect to socket
    const userId = user?._id
    if (userId) {
      socketService.connect(userId)
    }

    return () => {
      socketService.disconnect()
    }
  }, [navigate, user])

  // Listen for real-time messages
  useEffect(() => {
    const handleNewMessage = (newMsg) => {
      const myId = String(user?._id || '')
      const convId = normalizeConversationId(newMsg?.conversationId)
      const senderId = normalizeUserId(newMsg?.senderId)
      const isOwnMessage = myId && senderId && senderId === myId
      const isActiveConversation = selectedContact && String(selectedContact._id) === convId

      // Filter out messages from blocked users for direct conversations
      if (selectedContact?.type === 'DIRECT' && selectedContact?.participantId && isBlockedUser(newMsg.senderId)) {
        return
      }

      // Only add message if it's from the current conversation
      if (selectedContact && String(newMsg.conversationId) === String(selectedContact._id)) {
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(m => String(m._id) === String(newMsg._id))
          if (exists) return prev
          return [...prev, newMsg]
        })
      }

      // Update sidebar conversation preview in-place to avoid full reload on every message.
      let shouldReloadConversations = false
      setConversations(prev => {
        if (!convId) return prev

        const idx = prev.findIndex(c => String(c._id) === convId)
        if (idx < 0) {
          shouldReloadConversations = true
          return prev
        }

        const updated = [...prev]
        const target = updated[idx]
        const currentUnreadCounts = normalizeUnreadCounts(target?.unreadCounts)
        const previousUnread = Number(currentUnreadCounts?.[myId] || 0)
        const nextUnread = (isOwnMessage || isActiveConversation) ? 0 : previousUnread + 1

        const nextConv = {
          ...target,
          unreadCounts: {
            ...currentUnreadCounts,
            ...(myId ? { [myId]: nextUnread } : {}),
          },
          lastMessage: {
            ...(target.lastMessage || {}),
            ...newMsg,
          },
          lastMessageAt: newMsg?.createdAt || new Date().toISOString(),
          updatedAt: newMsg?.createdAt || new Date().toISOString(),
        }

        updated.splice(idx, 1)
        updated.unshift(nextConv)
        return updated
      })

      if (shouldReloadConversations) {
        loadConversations()
      }
    }

    const handleMessageRecalled = (data) => {
      const { messageId, conversationId } = data
      if (String(conversationId) === String(selectedContact?._id)) {
        setMessages(prev => {
          const updated = prev.map(msg =>
            String(msg._id) === String(messageId)
              ? { ...msg, isRecalled: true, content: null, fileUrl: null, fileUrls: [] }
              : msg
          )

          // Check if this is the latest message and update sidebar if so
          if (updated.length > 0 && String(updated[updated.length - 1]._id) === String(messageId)) {
            setConversations(convs =>
              convs.map(conv =>
                String(conv._id) === String(conversationId)
                  ? {
                    ...conv,
                    lastMessage: {
                      ...conv.lastMessage,
                      isRecalled: true,
                      content: null,
                      fileUrl: null,
                      fileUrls: []
                    }
                  }
                  : conv
              )
            )
          }

          return updated
        })
      }
    }

    const handleMessageReactionUpdated = (payload) => {
      const updatedMessage = payload?.message
      if (!updatedMessage?._id) return
      const conversationId = normalizeConversationId(payload?.conversationId || updatedMessage?.conversationId)

      if (selectedContact && String(selectedContact._id) === conversationId) {
        setMessages(prev => prev.map(msg =>
          String(msg._id) === String(updatedMessage._id)
            ? { ...msg, ...updatedMessage }
            : msg
        ))
      }

      setConversations(prev => prev.map(conv => {
        if (String(conv._id) !== String(conversationId)) return conv
        if (String(conv?.lastMessage?._id) !== String(updatedMessage._id)) return conv
        return {
          ...conv,
          lastMessage: { ...(conv.lastMessage || {}), ...updatedMessage }
        }
      }))
    }

    const handleMessagePinUpdated = (payload) => {
      const updatedMessage = payload?.message
      if (!updatedMessage?._id) return
      const conversationId = normalizeConversationId(payload?.conversationId || updatedMessage?.conversationId)

      if (selectedContact && String(selectedContact._id) === conversationId) {
        setMessages(prev => prev.map(msg =>
          String(msg._id) === String(updatedMessage._id)
            ? { ...msg, ...updatedMessage }
            : msg
        ))
      }

      setConversations(prev => prev.map(conv => {
        if (String(conv._id) !== String(conversationId)) return conv
        if (String(conv?.lastMessage?._id) !== String(updatedMessage._id)) return conv
        return {
          ...conv,
          lastMessage: { ...(conv.lastMessage || {}), ...updatedMessage }
        }
      }))
    }

    const socket = socketService.getSocket()
    if (socket) {
      socket.removeAllListeners('new_message')
      socket.removeAllListeners('message_recalled')
      socket.removeAllListeners('message_reaction_updated')
      socket.removeAllListeners('message_pin_updated')
      socket.on('new_message', handleNewMessage)
      socket.on('message_recalled', handleMessageRecalled)
      socket.on('message_reaction_updated', handleMessageReactionUpdated)
      socket.on('message_pin_updated', handleMessagePinUpdated)
    }

    return () => {
      if (socket) {
        socket.off('new_message', handleNewMessage)
        socket.off('message_recalled', handleMessageRecalled)
        socket.off('message_reaction_updated', handleMessageReactionUpdated)
        socket.off('message_pin_updated', handleMessagePinUpdated)
      }
    }
  }, [selectedContact, blockedUsers, user])

  // Listen for online/offline status
  useEffect(() => {
    const handleUserStatus = (data) => {
      if (data && data.userId) {
        setOnlineStatus(prev => ({
          ...prev,
          [String(data.userId)]: {
            status: data.status || 'offline',
            lastSeen: data.lastSeen || null
          }
        }))
      }
    }

    const handleOnlineUsers = (data) => {
      if (data && Array.isArray(data.users)) {
        const statusMap = {}
        data.users.forEach(u => {
          if (u?.userId) {
            statusMap[String(u.userId)] = {
              status: u.status || 'offline',
              lastSeen: u.lastSeen || null
            }
          }
        })
        setOnlineStatus(prev => ({ ...prev, ...statusMap }))
      }
    }

    const socket = socketService.getSocket()
    if (socket) {
      socket.on('user_status', handleUserStatus)
      socket.on('online_users', handleOnlineUsers)
    }

    return () => {
      if (socket) {
        socket.off('user_status', handleUserStatus)
        socket.off('online_users', handleOnlineUsers)
      }
    }
  }, [])

  // Listen for block/unblock events
  useEffect(() => {
    const handleUserBlocked = (data) => {
      if (data?.userId) {
        setBlockedUsers(prev => {
          const userId = normalizeUserId(data.userId)
          // Avoid duplicates
          if (prev.some(id => normalizeUserId(id) === userId)) return prev
          return [...prev, userId]
        })
      }
    }

    const handleUserUnblocked = (data) => {
      if (data?.userId) {
        setBlockedUsers(prev =>
          prev.filter(id => normalizeUserId(id) !== normalizeUserId(data.userId))
        )
      }
    }

    const socket = socketService.getSocket()
    if (socket) {
      socket.on('user_blocked', handleUserBlocked)
      socket.on('user_unblocked', handleUserUnblocked)
    }

    return () => {
      if (socket) {
        socket.off('user_blocked', handleUserBlocked)
        socket.off('user_unblocked', handleUserUnblocked)
      }
    }
  }, [])

  // Listen for real-time friend events
  useEffect(() => {
    const socket = socketService.getSocket()
    if (!socket) return

    // Có người gửi lời mời kết bạn đến mình → thêm vào friendRequests
    const handleFriendRequestReceived = (data) => {
      const request = data?.request || data
      if (!request) return
      setFriendRequests(prev => {
        const exists = prev.some(r => String(r._id) === String(request._id))
        if (exists) return prev
        return [request, ...prev]
      })
    }

    // Lời mời mình gửi đi được chấp nhận → cập nhật danh sách bạn & xoá khỏi sentRequests
    const handleFriendRequestAccepted = (data) => {
      const newFriend = data?.friend || data?.user || null
      const requestId = data?.requestId || null

      // Xoá khỏi sentRequests nếu có requestId rõ ràng
      if (requestId) {
        setSentRequests(prev => prev.filter(r => String(r._id) !== String(requestId)))
      }

      // Thêm vào danh sách bạn nếu chưa có
      if (newFriend && newFriend._id) {
        setFriends(prev => {
          const exists = prev.some(f => String(f._id) === String(newFriend._id))
          if (exists) return prev
          return [...prev, newFriend]
        })
      }

      // Luôn reload để đảm bảo state đúng
      loadFriendRequests()
      loadFriends()
    }

    // Lời mời mình gửi đi bị từ chối → tải lại từ server để đảm bảo chính xác
    const handleFriendRequestDeclined = (data) => {
      // Thử filter optimistic trước nếu có requestId rõ ràng
      const requestId = data?.requestId || null
      if (requestId) {
        setSentRequests(prev => prev.filter(r => String(r._id) !== String(requestId)))
      }
      // Luôn reload từ server để đảm bảo state đúng
      loadFriendRequests()
    }

    // Người kia thu hồi lời mời kết bạn đã gửi cho mình → tải lại từ server
    const handleFriendRequestCancelled = (data) => {
      const requestId = data?.requestId || null
      if (requestId) {
        setFriendRequests(prev => prev.filter(r => String(r._id) !== String(requestId)))
      }
      loadFriendRequests()
    }

    // Bị người kia hủy kết bạn → xoá khỏi friends
    const handleFriendRemoved = (data) => {
      const removedId = data?.userId || data?._id || null
      if (removedId) {
        setFriends(prev => prev.filter(f => String(f._id) !== String(removedId)))
      }
    }

    socket.on('friend_request_received', handleFriendRequestReceived)
    socket.on('friend_request_accepted', handleFriendRequestAccepted)
    socket.on('friend_request_declined', handleFriendRequestDeclined)
    socket.on('friend_request_cancelled', handleFriendRequestCancelled)
    socket.on('friend_removed', handleFriendRemoved)

    return () => {
      socket.off('friend_request_received', handleFriendRequestReceived)
      socket.off('friend_request_accepted', handleFriendRequestAccepted)
      socket.off('friend_request_declined', handleFriendRequestDeclined)
      socket.off('friend_request_cancelled', handleFriendRequestCancelled)
      socket.off('friend_removed', handleFriendRemoved)
    }
  }, [])

  // Listen for AI events
  useEffect(() => {
    const socket = socketService.getSocket()
    if (!socket) return

    const handleAIUserMessage = ({ message } = {}) => {
      if (!message) return
      setAiMessages(prev =>
        prev.some(m => String(m._id) === String(message._id)) ? prev : [...prev, message]
      )
    }

    const AI_STREAM_ID = '__ai_streaming__'
    const AI_BOT_ID = '000000000000000000000001'
    const AI_BOT_NAME = 'ZTING AI'
    const AI_BOT_AVATAR = 'https://img.icons8.com/?size=100&id=6nsw3h9gk8M8&format=png&color=000000'

    const handleAIChunk = ({ text } = {}) => {
      if (!text) return
      setAiMessages(prev => {
        const hasStreaming = prev.some(m => m._id === AI_STREAM_ID)
        if (hasStreaming) {
          return prev.map(m =>
            m._id === AI_STREAM_ID
              ? { ...m, content: (m.content || '') + text }
              : m
          )
        }
        return [...prev, {
          _id: AI_STREAM_ID,
          content: text,
          senderId: { _id: AI_BOT_ID, name: AI_BOT_NAME, avatarUrl: AI_BOT_AVATAR },
          conversationId: aiConversation?._id,
          createdAt: new Date().toISOString(),
          _streaming: true,
        }]
      })
    }

    const handleAIDone = ({ message } = {}) => {
      if (!message) return
      setAiMessages(prev =>
        prev.map(m =>
          m._id === AI_STREAM_ID
            ? { ...message, _streaming: false }
            : m
        )
      )
      setAiTyping(false)
    }

    const handleAIError = ({ message: errMsg } = {}) => {
      setAiMessages(prev => prev.filter(m => m._id !== AI_STREAM_ID))
      toast.error(errMsg || 'Lỗi AI', { id: 'ai-error-toast' })
      setAiTyping(false)
    }

    socket.on('ai_user_message', handleAIUserMessage)
    socket.on('ai_chunk', handleAIChunk)
    socket.on('ai_done', handleAIDone)
    socket.on('ai_error', handleAIError)

    return () => {
      socket.off('ai_user_message', handleAIUserMessage)
      socket.off('ai_chunk', handleAIChunk)
      socket.off('ai_done', handleAIDone)
      socket.off('ai_error', handleAIError)
    }
  }, [aiConversation])

  // Update filtered contacts based on search term and current view
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase()
    if (currentView === 'chat') {
      const isEmail = term.includes('@')
      if (isEmail) {
        userService.searchUserByEmail(term)
          .then(res => {
            const u = res.user || res
            // if we already have a conversation with them, show it; otherwise present pseudo-convo so user can click and start
            const existing = conversations.find(c => String(c.participantId) === String(u._id) || String(c.participantId) === String(u._id))
            if (existing) setFilteredContacts([existing])
            else {
              setFilteredContacts([{
                _id: null,
                type: 'DIRECT',
                pending: true,
                participantId: u._id,
                participantName: u.name,
                participantAvatar: u.avatarUrl || '',
                name: u.name
              }])
            }
          })
          .catch(() => setFilteredContacts([]))
      } else {
        const filtered = conversations.filter(conv =>
          conv.name.toLowerCase().includes(term) ||
          (conv.participantName && conv.participantName.toLowerCase().includes(term))
        )
        setFilteredContacts(filtered)
      }
    } else if (currentView === 'friends') {
      // if the input looks like an email, hit backend search (returns single user)
      const isEmail = term.includes('@')
      if (isEmail) {
        userService.searchUserByEmail(term)
          .then(res => {
            const u = res.user || res
            // if already a friend, just show them; otherwise show as "searchResult"
            const exists = friends.find(f => String(f._id) === String(u._id))
            setFilteredContacts(exists ? [exists] : [{ ...u, searchResult: true }])
          })
          .catch(() => {
            setFilteredContacts([])
          })
      } else {
        const filtered = friends.filter(friend =>
          friend.name.toLowerCase().includes(term)
        )
        setFilteredContacts(filtered)
      }
    }
  }, [searchTerm, currentView, conversations, friends])

  // Load conversations
  const loadConversations = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await conversationService.getConversations()
      let convs = res.conversations || []
      // attach helper fields cho UI: tên hiển thị, avatar, participant cho chat 1-1 / nhóm
      convs = convs.map(c => {
        // find other participant (not current user) for direct chats
        let participantId = null
        let participantName = ''
        let participantAvatar = ''

        if (c.type === 'DIRECT' && c.participants && c.participants.length === 2) {
          const other = c.participants.find(p => {
            // Handle both cases: p._id (direct) and p.userId._id (populated)
            const pId = p._id || p.userId?._id
            const userId = user?._id
            return String(pId || '') !== String(userId || '')
          })
          if (other) {
            participantId = other._id || other.userId?._id
            participantName = other.name || other.userId?.name || ''
            participantAvatar = other.avatarUrl || other.userId?.avatarUrl || ''
          }
        }

        // Populate participant names cho cả DIRECT và GROUP
        const populatedParticipants = c.participants?.map(p => ({
          ...p,
          _id: p._id || p.userId?._id,
          name: p.name || p.userId?.name,
          avatarUrl: p.avatarUrl || p.userId?.avatarUrl
        })) || []

        // Tên hiển thị của cuộc trò chuyện
        // bỏ qua các cuộc hội thoại đặc biệt (ví dụ AI) khỏi sidebar
        if (c.isAI) return null

        let displayName = c.name || participantName
        let groupAvatar = ''
        if (c.type === 'GROUP') {
          // ưu tiên tên group từ backend
          displayName = c.group?.name || c.groupName || c.name || 'Nhóm không tên'
          groupAvatar = c.group?.avatarUrl || c.groupAvatar || c.avatarUrl || ''
        }

        // nếu sau khi chuẩn hoá vẫn không có tên, bỏ qua để tránh dòng trống / lỗi
        if (!displayName) return null

        return {
          ...c,
          participants: populatedParticipants,
          unreadCounts: normalizeUnreadCounts(c.unreadCounts),
          participantId,
          participantName,
          participantAvatar,
          avatarUrl: c.type === 'GROUP' ? groupAvatar : (c.avatarUrl || participantAvatar),
          // name luôn là "tên hiển thị" đã chuẩn hoá ở trên
          name: displayName
        }
      })
      // loại bỏ phần tử null (AI / hội thoại lỗi)
      const normalized = convs.filter(Boolean)
      setConversations(normalized)
      return normalized
    } catch (err) {
      setError('Không thể tải cuộc trò chuyện')
      console.error(err)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Load friends
  const loadFriends = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await friendService.getAllFriends()
      setFriends(res.friends || [])
    } catch (err) {
      setError('Không thể tải danh sách bạn')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Load friend requests
  const loadFriendRequests = async () => {
    try {
      const res = await friendService.getFriendRequests()
      // service returns {sent, receive}
      const payload = res.data || res
      setFriendRequests(payload.receive || [])
      setSentRequests(payload.sent || [])
    } catch (err) {
      console.error(err)
    }
  }

  // Handle view change
  const handleViewChange = async (view) => {
    setCurrentView(view)
    setSearchTerm('')
    setSelectedContact(null)

    if (view === 'friends') {
      await loadFriends()
      await loadFriendRequests()
    } else if (view === 'chat') {
      await loadConversations()
    } else if (view === 'ai') {
      await handleOpenAIChat()
    }
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await authService.logout()
      window.dispatchEvent(new Event('authChanged'))
      navigate('/login')
    } catch (err) {
      setError('Không thể đăng xuất')
      console.error(err)
    }
  }

  // profile helpers
  const formatDate = (d) => {
    if (!d) return ''
    try {
      return new Date(d).toLocaleDateString('vi-VN')
    } catch { return d }
  }

  const openMediaModal = (url, type = 'image') => {
    if (!url) return
    setMediaModalUrl(url)
    setMediaModalType(type)
    setMediaModalName(basenameFromUrl(url) || '')
    setShowMediaModal(true)
  }

  const closeMediaModal = () => {
    setShowMediaModal(false)
    setMediaModalUrl(null)
    setMediaModalType('image')
    setMediaModalName(null)
  }

  const openProfile = async () => {
    setError('')
    // refresh from server to make sure we have latest info
    try {
      const res = await userService.getProfile()
      const latest = res.user || res
      setUser(latest)
      localStorage.setItem('user', JSON.stringify(latest))
      setProfileForm({
        name: latest.name || '',
        dateOfBirth: latest.dateOfBirth ? new Date(latest.dateOfBirth).toISOString().slice(0, 10) : '',
        gender: latest.gender || '',
        bio: latest.bio || ''
      })
    } catch (err) {
      console.error('Cannot fetch profile', err)
    }
    setIsEditingProfile(false)
    setShowUserProfile(true)
  }

  const startEditProfile = () => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0, 10) : '',
        gender: user.gender || '',
        bio: user.bio || ''
      })
    }
    setIsEditingProfile(true)
  }

  const handleProfileChange = e => {
    const { name, value } = e.target
    setProfileForm(prev => ({ ...prev, [name]: value }))
  }

  const saveProfile = async () => {
    try {
      const res = await userService.updateProfile(profileForm)
      const updatedUser = res.user || res
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setIsEditingProfile(false)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Có lỗi xảy ra khi cập nhật hồ sơ')
    }
  }

  const handleAvatarClick = () => {
    avatarInputRef.current?.click()
  }
  const handleBannerClick = () => {
    bannerInputRef.current?.click()
  }
  const handleAvatarUpload = async e => {
    const file = e.target.files[0]
    if (file) {
      try {
        const res = await userService.uploadAvatar(file)
        // server returns avatarUrl
        const avatarUrl = res.avatarUrl || res.user?.avatarUrl
        setUser(prev => ({ ...prev, avatarUrl }))
        localStorage.setItem('user', JSON.stringify({ ...user, avatarUrl }))
      } catch (err) {
        console.error(err)
      }
    }
  }
  const handleBannerUpload = async e => {
    const file = e.target.files[0]
    if (file) {
      try {
        const res = await userService.uploadBanner(file)
        const bannerUrl = res.bannerUrl || res.user?.bannerUrl
        setUser(prev => ({ ...prev, bannerUrl }))
        localStorage.setItem('user', JSON.stringify({ ...user, bannerUrl }))
      } catch (err) {
        console.error(err)
      }
    }
  }

  const handlePasswordChange = e => {
    const { name, value } = e.target
    setPasswordForm(prev => ({ ...prev, [name]: value }))
  }
  const submitPasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Mật khẩu mới và xác nhận không khớp')
      return
    }
    try {
      await authService.changePassword(passwordForm.oldPassword, passwordForm.newPassword)
      setShowChangePassword(false)
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      await authService.logout()
      window.dispatchEvent(new Event('authChanged'))
      toast.success('Đổi mật khẩu thành công, vui lòng đăng nhập lại')
      navigate('/login')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Có lỗi khi đổi mật khẩu')
    }
  }

  const submitCloseAccount = async () => {
    if (!closeAccountPassword.trim()) {
      setError('Vui lòng nhập mật khẩu để đóng tài khoản')
      return
    }

    const confirmed = await openConfirmPopup({
      title: 'Đóng tài khoản',
      message: 'Tài khoản sẽ bị đóng vĩnh viễn. Bạn có chắc chắn muốn tiếp tục?',
      confirmText: 'Đóng tài khoản',
      cancelText: 'Hủy',
      danger: true
    })

    if (!confirmed) return

    try {
      await authService.closeAccount(closeAccountPassword)
      await authService.logout()
      window.dispatchEvent(new Event('authChanged'))
      setShowCloseAccount(false)
      setCloseAccountPassword('')
      toast.success('Đóng tài khoản thành công')
      navigate('/login')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Có lỗi khi đóng tài khoản')
    }
  }

  // Handle contact click (conversation or friend)
  const handleContactClick = async (contact) => {
    let convo = contact;
    // Chỉ khi click từ danh sách bạn bè (friend không có type) mới tự tạo cuộc trò chuyện DIRECT.
    const isFriendItem = !contact.type && !contact.participantId
    if (isFriendItem) {
      // try find existing conversation với bạn đó
      convo = conversations.find(c => String(c.participantId || '') === String(contact._id || ''));
      if (!convo) {
        convo = {
          _id: null,
          type: 'DIRECT',
          pending: true,
          participantId: contact._id,
          participantName: contact.name,
          participantAvatar: contact.avatarUrl || '',
          name: contact.name
        };
      }
    }

    // Rời phòng cũ (nếu khác cuộc trò chuyện)
    if (selectedContact?._id && convo._id && selectedContact._id !== convo._id) {
      socketService.leaveConversation(selectedContact._id)
    }

    setSelectedContact(convo)
    if (currentView !== 'chat') {
      setCurrentView('chat')
    }

    // Join phòng socket cho cuộc trò chuyện mới
    if (convo._id) {
      socketService.joinConversation(convo._id)
    }

    // Đánh dấu đã đọc để reset số tin nhắn chưa đọc
    if (convo._id) {
      try {
        await conversationService.markAsRead(convo._id)
        setConversations(prev =>
          prev.map(c => {
            if (String(c._id) !== String(convo._id)) return c
            const uc = { ...(c.unreadCounts || {}) }
            if (user?._id) {
              uc[String(user._id)] = 0
            }
            return { ...c, unreadCounts: uc }
          })
        )
      } catch (err) {
        console.error('Không thể đánh dấu đã đọc', err)
      }
    }
  }

  // Load messages for a conversation
  const loadMessages = async (conversationId) => {
    try {
      const res = await conversationService.getMessages(conversationId)
      const loadedMessages = res.messages || []
      setMessages(loadedMessages)

      // Sync the last message status to conversations state
      // This ensures the sidebar shows correct status after reload
      if (loadedMessages.length > 0) {
        const lastLoadedMessage = loadedMessages[loadedMessages.length - 1]
        setConversations(prev =>
          prev.map(conv =>
            String(conv._id) === String(conversationId)
              ? {
                ...conv,
                lastMessage: {
                  ...conv.lastMessage,
                  ...lastLoadedMessage // Override with latest message data from backend
                }
              }
              : conv
          )
        )
      }
      let msgs = res.messages || []

      // Filter out messages from blocked users (for direct conversations)
      if (selectedContact?.type === 'DIRECT' && selectedContact?.participantId) {
        msgs = msgs.filter(msg => !isBlockedUser(msg.senderId))
      }

      setMessages(msgs)
    } catch (err) {
      console.error('Không thể tải tin nhắn', err)
    }
  }

  // Watch for selection change or view change
  useEffect(() => {
    if (selectedContact && currentView === 'chat') {
      if (selectedContact._id) {
        setChatNotice('')
        loadMessages(selectedContact._id)
      } else {
        setMessages([])
        setChatNotice('Cuộc trò chuyện đang ở trạng thái pending. Hãy gửi tin nhắn đầu tiên để bắt đầu.')
      }
    } else {
      setMessages([])
      setChatNotice('')
    }
  }, [selectedContact, currentView, blockedUsers])

  // Keep selected conversation metadata (name/avatar/status fields) in sync after reloads.
  useEffect(() => {
    if (!selectedContact?._id || selectedContact.type === 'GROUP') return

    const refreshed = conversations.find(c => String(c._id) === String(selectedContact._id))
    if (!refreshed) return

    setSelectedContact(prev => {
      if (!prev || String(prev._id) !== String(refreshed._id)) return prev

      const sameName = (prev.name || '') === (refreshed.name || '')
      const sameParticipantName = (prev.participantName || '') === (refreshed.participantName || '')
      const sameParticipantAvatar = (prev.participantAvatar || '') === (refreshed.participantAvatar || '')
      const sameAvatar = (prev.avatarUrl || '') === (refreshed.avatarUrl || '')

      if (sameName && sameParticipantName && sameParticipantAvatar && sameAvatar) {
        return prev
      }

      return {
        ...prev,
        ...refreshed
      }
    })
  }, [conversations, selectedContact])

  // scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // actions for info panel
  const toggleBlock = async () => {
    if (!selectedContact) return
    try {
      const targetUserId = getDirectParticipantId(selectedContact)
      if (!targetUserId) return
      const isCurrentlyBlocked = isBlockedUser(targetUserId)

      if (isCurrentlyBlocked) {
        // Optimistically update UI before API call
        setBlockedUsers(prev => prev.filter(id => normalizeUserId(id) !== targetUserId))
        await userService.unblockUser(targetUserId)
        toast.success(`Đã bỏ chặn ${selectedContact.participantName || selectedContact.name}`)
      } else {
        // Optimistically update UI before API call
        setBlockedUsers(prev => {
          if (prev.some(id => normalizeUserId(id) === targetUserId)) return prev
          return [...prev, targetUserId]
        })
        await userService.blockUser(targetUserId)
        toast.success(`Đã chặn ${selectedContact.participantName || selectedContact.name}`)
      }
    } catch (err) {
      console.error('block/unblock failed', err)
      toast.error('Không thể thực hiện hành động này')
      // Reload to revert optimistic update on error
      await loadBlockedUsers()
    }
  }

  const handleGetInviteLink = async () => {
    if (!selectedContact) return
    try {
      const res = await conversationService.getInviteLink(selectedContact._id)
      const rawCode =
        res?.token ||
        res?.code ||
        res?.inviteCode ||
        res?.data?.token ||
        res?.data?.code ||
        res?.data?.inviteCode ||
        ''

      let parsedCode = String(rawCode || '').trim()

      if (!parsedCode) {
        const rawLink = res?.link || res?.inviteLink || res?.data?.link || res?.data?.inviteLink || ''
        const link = String(rawLink || '').trim()

        if (link) {
          try {
            const url = new URL(link)
            parsedCode =
              url.searchParams.get('token') ||
              url.searchParams.get('code') ||
              url.searchParams.get('inviteCode') ||
              ''
            if (!parsedCode) {
              const parts = url.pathname.split('/').filter(Boolean)
              parsedCode = parts[parts.length - 1] || ''
            }
          } catch {
            const chunks = link.split('/').filter(Boolean)
            parsedCode = chunks[chunks.length - 1] || ''
          }
        }
      }

      if (!parsedCode) {
        throw new Error('Không lấy được mã mời nhóm')
      }

      setInviteCode(parsedCode)
      setCopyInviteSuccess(false)
      setShowInviteCodeModal(true)
    } catch (err) {
      console.error('cannot get invite link', err)
      setError(err?.message || 'Không tạo được mã mời nhóm')
    }
  }

  const handleCopyInviteCode = async () => {
    if (!inviteCode) return
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteCode)
      } else {
        const temp = document.createElement('textarea')
        temp.value = inviteCode
        temp.style.position = 'fixed'
        temp.style.opacity = '0'
        document.body.appendChild(temp)
        temp.select()
        document.execCommand('copy')
        document.body.removeChild(temp)
      }
      setCopyInviteSuccess(true)
      setTimeout(() => setCopyInviteSuccess(false), 1500)
    } catch (err) {
      console.error('copy invite code failed', err)
      setError('Không thể sao chép mã nhóm')
    }
  }

  const normalizeRoleType = (role) => {
    const r = String(role || '').toLowerCase()
    if (r.includes('trưởng') || r === 'owner' || r === 'leader' || r === 'admin') return 'OWNER'
    if (r.includes('phó') || r.includes('deputy') || r === 'vice' || r === 'vice_leader') return 'DEPUTY'
    return 'MEMBER'
  }

  const getRoleLabel = (role) => {
    const type = normalizeRoleType(role)
    if (type === 'OWNER') return 'Trưởng nhóm'
    if (type === 'DEPUTY') return 'Phó nhóm'
    return 'Thành viên'
  }

  const getMyGroupRoleType = (contact = selectedContact) => {
    if (!contact?.participants || !user?._id) return 'MEMBER'
    const me = contact.participants.find(p => {
      const pId = p.userId?._id || p._id
      return String(pId) === String(user._id)
    })
    return normalizeRoleType(me?.role)
  }

  const isCurrentUserMemberOfGroup = (contact = selectedContact) => {
    if (!contact || contact.type !== 'GROUP') return true
    if (!user?._id) return false
    return (contact.participants || []).some(p => {
      const pId = p.userId?._id || p._id
      return String(pId) === String(user._id)
    })
  }

  const isGroupMessagingBlocked = (contact = selectedContact) => {
    if (!contact || contact.type !== 'GROUP') return false
    return !isCurrentUserMemberOfGroup(contact) || chatNotice === 'Bạn không phải thành viên nhóm'
  }

  const refreshSelectedGroup = async (conversationId = selectedContact?._id) => {
    if (!conversationId) return
    const convs = await loadConversations()
    const refreshed = convs.find(c => String(c._id) === String(conversationId))
    if (refreshed) {
      setSelectedContact(refreshed)
    }
  }

  const handleOpenAddMembersModal = () => {
    if (!selectedContact || selectedContact.type !== 'GROUP') return
    setSelectedMembersToAdd([])
    setShowAddMembersModal(true)
  }

  const handleAddMembersToGroup = async () => {
    if (!selectedContact?._id) return
    if (selectedMembersToAdd.length === 0) {
      setError('Vui lòng chọn ít nhất 1 thành viên để thêm')
      return
    }
    try {
      setGroupActionLoading(true)
      await Promise.all(
        selectedMembersToAdd.map(userId => conversationService.addGroupMember(selectedContact._id, userId))
      )
      setShowAddMembersModal(false)
      setSelectedMembersToAdd([])
      await refreshSelectedGroup(selectedContact._id)
    } catch (err) {
      console.error('add members failed', err)
      setError(err?.message || 'Không thể thêm thành viên vào nhóm')
    } finally {
      setGroupActionLoading(false)
    }
  }

  const handleRemoveGroupMember = async (memberId, memberName) => {
    if (!selectedContact?._id || !memberId) return
    const confirmed = await openConfirmPopup({
      title: 'Xóa thành viên',
      message: `Bạn có chắc muốn xóa ${memberName || 'thành viên này'} khỏi nhóm?`,
      confirmText: 'Xóa',
      danger: true
    })
    if (!confirmed) return
    try {
      setGroupActionLoading(true)
      await conversationService.removeGroupMember(selectedContact._id, memberId)
      await refreshSelectedGroup(selectedContact._id)
    } catch (err) {
      console.error('remove member failed', err)
      setError(err?.message || 'Không thể xóa thành viên khỏi nhóm')
    } finally {
      setGroupActionLoading(false)
    }
  }

  const handlePromoteMember = async (memberId, memberName) => {
    if (!selectedContact?._id || !memberId) return
    const confirmed = await openConfirmPopup({
      title: 'Bổ nhiệm phó nhóm',
      message: `Bổ nhiệm ${memberName || 'thành viên này'} làm phó nhóm?`,
      confirmText: 'Bổ nhiệm'
    })
    if (!confirmed) return
    try {
      setGroupActionLoading(true)
      await conversationService.promoteToDeputy(selectedContact._id, memberId)
      await refreshSelectedGroup(selectedContact._id)
    } catch (err) {
      console.error('promote failed', err)
      setError(err?.message || 'Không thể phân quyền phó nhóm')
    } finally {
      setGroupActionLoading(false)
    }
  }

  const handleDemoteMember = async (memberId, memberName) => {
    if (!selectedContact?._id || !memberId) return
    const confirmed = await openConfirmPopup({
      title: 'Thu hồi quyền',
      message: `Thu hồi quyền phó nhóm của ${memberName || 'thành viên này'}?`,
      confirmText: 'Thu hồi',
      danger: true
    })
    if (!confirmed) return
    try {
      setGroupActionLoading(true)
      await conversationService.revokeDeputyRole(selectedContact._id, memberId)
      await refreshSelectedGroup(selectedContact._id)
    } catch (err) {
      console.error('demote failed', err)
      setError(err?.message || 'Không thể thu hồi quyền phó nhóm')
    } finally {
      setGroupActionLoading(false)
    }
  }

  const handleTransferOwnerAndLeave = async () => {
    if (!selectedContact?._id || !transferTargetUserId) {
      setError('Vui lòng chọn thành viên để chuyển quyền')
      return
    }
    try {
      setGroupActionLoading(true)
      await conversationService.transferOwner(selectedContact._id, transferTargetUserId)
      await conversationService.leaveGroup(selectedContact._id)
      await loadConversations()
      setSelectedContact(null)
      setShowInfoPanel(false)
      setShowTransferOwnerModal(false)
      setTransferTargetUserId('')
    } catch (err) {
      console.error('transfer owner failed', err)
      setError(err?.message || 'Không thể chuyển quyền và rời nhóm')
    } finally {
      setGroupActionLoading(false)
    }
  }

  const handleRenameGroup = () => {
    if (!selectedContact) return
    const myRole = getMyGroupRoleType(selectedContact)
    if (!(myRole === 'OWNER' || myRole === 'DEPUTY')) {
      setError('Chỉ phó nhóm hoặc trưởng nhóm mới được đổi tên nhóm')
      return
    }
    setNewGroupName(selectedContact.name || '')
    setShowRenameModal(true)
  }

  const handleSubmitRename = async () => {
    if (!newGroupName.trim()) {
      setError('Vui lòng nhập tên nhóm')
      return
    }
    const myRole = getMyGroupRoleType(selectedContact)
    if (!(myRole === 'OWNER' || myRole === 'DEPUTY')) {
      setError('Chỉ phó nhóm hoặc trưởng nhóm mới được đổi tên nhóm')
      return
    }
    try {
      await conversationService.renameGroup(selectedContact._id, newGroupName.trim())
      await refreshSelectedGroup(selectedContact._id)
      setShowRenameModal(false)
      setNewGroupName('')
    } catch (err) {
      console.error('rename failed', err)
      setError(err.message || 'Không đổi tên nhóm được')
    }
  }

  const handleDeleteGroup = async () => {
    if (!selectedContact) return
    const confirmed = await openConfirmPopup({
      title: 'Xóa nhóm',
      message: 'Bạn có chắc muốn xoá nhóm? Hành động này không thể hoàn tác.',
      confirmText: 'Xóa nhóm',
      danger: true
    })
    if (!confirmed) return
    try {
      await conversationService.deleteGroup(selectedContact._id)
      await loadConversations()
      setSelectedContact(null)
      setShowInfoPanel(false)
    } catch (err) {
      console.error('delete group failed', err)
      setError('Không thể xoá nhóm')
    }
  }

  // leave group as a normal member
  const handleLeaveGroup = async () => {
    if (!selectedContact) return
    const myRole = getMyGroupRoleType(selectedContact)
    if (myRole === 'OWNER' && (selectedContact.participants?.length || 0) > 1) {
      setError('Trưởng nhóm cần chuyển quyền trước khi rời nhóm')
      setShowTransferOwnerModal(true)
      return
    }
    const confirmed = await openConfirmPopup({
      title: 'Rời nhóm',
      message: 'Bạn có chắc muốn rời nhóm này?',
      confirmText: 'Rời nhóm',
      danger: true
    })
    if (!confirmed) return
    try {
      await conversationService.leaveGroup(selectedContact._id)
      await loadConversations()
      setSelectedContact(null)
      setShowInfoPanel(false)
    } catch (err) {
      console.error('leave group failed', err)
      setError(err.message || 'Không thể rời nhóm')
    }
  }

  // send a new message
  // file and emoji support
  const [pendingFile, setPendingFile] = useState(null)
  const [pendingFiles, setPendingFiles] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const fileInputRef2 = useRef(null)
  const videoInputRef = useRef(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef(null)

  // Create group modal
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [selectedFriendsForGroup, setSelectedFriendsForGroup] = useState([])
  const [groupName, setGroupName] = useState('')

  // Join group by code modal
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false)
  const [joinGroupCode, setJoinGroupCode] = useState('')
  const [joinGroupLoading, setJoinGroupLoading] = useState(false)

  // Group invite code modal (from group conversation info panel)
  const [showInviteCodeModal, setShowInviteCodeModal] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [copyInviteSuccess, setCopyInviteSuccess] = useState(false)

  // Rename group modal
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  const handleFileChange = e => {
    const selectedFiles = Array.from(e.target.files || [])
    if (!selectedFiles.length) return
    // Backend giới hạn 5MB mỗi file → chặn sớm ở client để tránh lỗi 500
    const maxSize = 5 * 1024 * 1024
    const tooLargeFile = selectedFiles.find(file => file.size > maxSize)
    if (tooLargeFile) {
      setError(`File ${tooLargeFile.name} vượt quá 5MB. Vui lòng chọn file nhỏ hơn.`)
      e.target.value = ''
      return
    }
    setError('')
    setPendingFiles(prev => [...prev, ...selectedFiles])
    e.target.value = ''
  }

  const handleVideoFileChange = e => {
    const selectedFiles = Array.from(e.target.files || [])
    if (!selectedFiles.length) return
    const maxSize = 5 * 1024 * 1024
    const tooLargeFile = selectedFiles.find(file => file.size > maxSize)
    if (tooLargeFile) {
      setError(`Video ${tooLargeFile.name} vượt quá 5MB. Vui lòng chọn video nhỏ hơn.`)
      e.target.value = ''
      return
    }
    setError('')
    setPendingFiles(prev => [...prev, ...selectedFiles])
    e.target.value = ''
  }

  const handleEmojiClick = (emoji) => {
    setNewMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  // close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false)
      }
    }
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  // Update filtered friends based on search and sort
  useEffect(() => {
    let filtered = friends.filter(friend =>
      friend.name.toLowerCase().includes(friendSearchTerm.toLowerCase())
    )
    filtered.sort((a, b) => {
      if (friendSortOrder === 'A-Z') {
        return a.name.localeCompare(b.name)
      } else {
        return b.name.localeCompare(a.name)
      }
    })
    setFilteredFriends(filtered)
  }, [friends, friendSearchTerm, friendSortOrder])

  const handleSendMessage = async () => {
    if (isUploadingFile) return
    if ((!newMessage.trim() && pendingFiles.length === 0) || !selectedContact) return
    if (!newMessage.trim() && pendingFiles.length === 0) {
      setError('Nhập nội dung hoặc chọn file')
      return
    }

    // Guard: if user has been removed from the group, block sending immediately.
    if (selectedContact?.type === 'GROUP' && !isCurrentUserMemberOfGroup(selectedContact)) {
      setChatNotice('Bạn không phải thành viên nhóm')
      return
    }

    // Guard: if recipient is blocked, prevent sending message
    if (selectedContact?.type === 'DIRECT' && isBlockedUser(getDirectParticipantId(selectedContact))) {
      toast.error('Không thể gửi tin nhắn đến người dùng đã bị chặn')
      return
    }

    const activeConv = selectedContact
    const content = newMessage.trim()
    const filesToSend = [...pendingFiles]
    const fallbackContent = filesToSend.length
      ? filesToSend.every((file) => String(file.type || '').toLowerCase().startsWith('image/'))
        ? '[Ảnh]'
        : filesToSend.every((file) => String(file.type || '').toLowerCase().startsWith('video/'))
          ? '[Video]'
          : `[File] ${filesToSend[0]?.name || 'file'}`
      : ''
    const contentToSend = content || fallbackContent
    const isGroup = activeConv?.type === 'GROUP'
    const previewUrls = filesToSend.map((file) => {
      try {
        return URL.createObjectURL(file)
      } catch {
        return null
      }
    }).filter(Boolean)
    const temporaryMessageId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    // Render optimistic bubble immediately so text/emoji/media appear right away.
    const optimisticConversationId = activeConv?._id || `temp-conv-${Date.now()}`
    const optimisticMessage = {
      _id: temporaryMessageId,
      id: temporaryMessageId,
      conversationId: optimisticConversationId,
      senderId: {
        _id: user?._id,
        name: user?.name,
        avatarUrl: user?.avatarUrl,
      },
      content: contentToSend,
      fileUrls: previewUrls,
      fileUrl: previewUrls[0] || null,
      createdAt: new Date().toISOString(),
      isUploading: filesToSend.length > 0,
      uploadProgress: 0,
    }

    setMessages((prev) => [...prev, optimisticMessage])

    if (activeConv?._id) {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => String(c._id) === String(activeConv._id))
        if (idx < 0) return prev
        const updated = [...prev]
        const myId = String(user?._id || '')
        updated.splice(idx, 1)
        updated.unshift({
          ...prev[idx],
          unreadCounts: {
            ...(prev[idx].unreadCounts || {}),
            ...(myId ? { [myId]: 0 } : {}),
          },
          lastMessage: optimisticMessage,
          lastMessageAt: optimisticMessage.createdAt,
          updatedAt: optimisticMessage.createdAt,
        })
        return updated
      })
    }

    // Reset composer immediately after optimistic insert.
    setNewMessage('')
    setPendingFiles([])
    setChatNotice('')
    if (fileInputRef2.current) fileInputRef2.current.value = ''
    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto'
    }

    try {
      // Create FormData matching Test_Frontend-main
      const form = new FormData()
      if (contentToSend) form.append('content', contentToSend)
      if (activeConv?._id) form.append('conversationId', activeConv._id)

      // For direct messages, append recipientId
      if (activeConv?.type === 'DIRECT') {
        const otherParticipant = activeConv.participants?.find(p => {
          const pId = p._id || p.userId?._id
          return pId && String(pId) !== String(user?._id)
        })
        if (otherParticipant) {
          const otherId = otherParticipant._id || otherParticipant.userId?._id
          if (otherId) form.append('recipientId', otherId)
        } else if (activeConv.participantId) {
          form.append('recipientId', activeConv.participantId)
        }
      }

      // Append files as repeated 'image' field for backend multipart array parsing
      filesToSend.forEach((file) => {
        form.append('image', file)
      })

      const progressHandler = filesToSend.length > 0
        ? (evt) => {
          const total = Number(evt?.total || 0)
          const loaded = Number(evt?.loaded || 0)
          if (total > 0) {
            const percent = Math.min(100, Math.max(0, Math.round((loaded * 100) / total)))
            setUploadProgress(percent)
            setMessages((prev) => prev.map((msg) =>
              String(msg._id) === String(temporaryMessageId)
                ? { ...msg, isUploading: true, uploadProgress: percent }
                : msg
            ))
          }
        }
        : undefined

      if (filesToSend.length > 0) {
        setIsUploadingFile(true)
        setUploadProgress(0)
      }

      // Send message
      let res = isGroup
        ? await conversationService.sendGroupMessage(form, progressHandler)
        : await conversationService.sendDirectMessage(form, progressHandler)

      let created = res?.message || null
      let shouldRefetchConversations = false

      previewUrls.forEach((url) => {
        try {
          URL.revokeObjectURL(url)
        } catch { }
      })

      setUploadProgress(0)
      setIsUploadingFile(false)
      setChatNotice('')

      // Update messages if message was created
      if (created && selectedContact && String(created.conversationId) === String(selectedContact._id)) {
        try {
          // Populate senderId if it's just an ID
          if (created.senderId && typeof created.senderId !== 'object') {
            if (String(created.senderId) === String(user?._id)) {
              created.senderId = {
                _id: created.senderId,
                name: user.name,
                avatarUrl: user.avatarUrl
              }
            } else {
              created.senderId = {
                _id: created.senderId,
                name: created.senderName || 'Người dùng',
                avatarUrl: created.senderAvatar
              }
            }
          }
        } catch (e) { }

        // Add message to list if not already present (socket will also add it, so this prevents duplicate)
        setMessages(prev => {
          const withoutTemp = prev.filter((m) => String(m._id) !== String(temporaryMessageId))
          const exists = withoutTemp.some(m => String(m._id) === String(created._id))
          if (exists) return withoutTemp
          return [...withoutTemp, created]
        })

        // Update conversation list
        setConversations(prev => {
          const convId = String(created.conversationId)
          const idx = prev.findIndex(c => String(c._id) === convId)
          if (idx === -1) {
            shouldRefetchConversations = true
            return prev
          }
          const updated = [...prev]
          const myId = String(user?._id || '')
          const conv = {
            ...updated[idx],
            unreadCounts: {
              ...(updated[idx].unreadCounts || {}),
              ...(myId ? { [myId]: 0 } : {}),
            },
            lastMessage: created,
            lastMessageAt: created.createdAt || new Date().toISOString()
          }
          updated.splice(idx, 1)
          updated.unshift(conv)
          return updated
        })
      }

      // Fallback refetch only when local state cannot map the updated conversation.
      if (shouldRefetchConversations) {
        await loadConversations()
      }

      // If conversation was just created, update selected contact id
      if (!activeConv._id && created?.conversationId) {
        setSelectedContact(prev => ({
          ...prev,
          _id: created.conversationId,
          type: 'DIRECT',
          pending: false
        }))
      }
    } catch (err) {
      console.error('Lỗi khi gửi tin nhắn', err)
      previewUrls.forEach((url) => {
        try {
          URL.revokeObjectURL(url)
        } catch { }
      })
      setMessages((prev) => prev.filter((m) => String(m._id) !== String(temporaryMessageId)))
      setNewMessage(content)
      setPendingFiles(filesToSend)
      setIsUploadingFile(false)
      setUploadProgress(0)
      const msg = err?.message || 'Không thể gửi tin nhắn'
      const lower = String(msg).toLowerCase()
      if (lower.includes('không phải thành viên') || lower.includes('not member')) {
        setChatNotice('Bạn không phải thành viên nhóm')
      } else {
        setError(msg)
      }
    }
  }

  // Handle recall message
  const handleRecallMessage = async (messageId, conversationId) => {
    try {
      await conversationService.recallMessage(messageId)

      // Update the message in the local state
      setMessages(prev =>
        prev.map(msg =>
          String(msg._id) === String(messageId)
            ? { ...msg, isRecalled: true, content: null, fileUrl: null, fileUrls: [] }
            : msg
        )
      )

      // Check if this is the latest message in the conversation
      if (messages.length > 0) {
        const messageIndex = messages.findIndex(m => String(m._id) === String(messageId))
        if (messageIndex === messages.length - 1) {
          // This is the latest message, update sidebar
          setConversations(prev =>
            prev.map(conv =>
              String(conv._id) === String(conversationId)
                ? {
                  ...conv,
                  lastMessage: {
                    ...conv.lastMessage,
                    isRecalled: true,
                    content: null,
                    fileUrl: null,
                    fileUrls: []
                  }
                }
                : conv
            )
          )
        }
      }
    } catch (err) {
      console.error('Lỗi khi thu hồi tin nhắn:', err)
      setError(err.message || 'Không thể thu hồi tin nhắn')
    }
  }

  const getMyReactionEmoji = (msg) => {
    const myId = String(user?._id || '')
    if (!myId) return ''
    const reactions = Array.isArray(msg?.reactions) ? msg.reactions : []
    const mine = reactions.find((reaction) => String(reaction?.userId?._id || reaction?.userId) === myId)
    return String(mine?.emoji || '')
  }

  const hasMyReaction = (msg, emoji) => {
    const myEmoji = getMyReactionEmoji(msg)
    if (!myEmoji) return false
    if (!emoji) return true
    return myEmoji === emoji
  }

  const handleToggleMessageReaction = async (msg, emoji = '👍') => {
    if (!msg?._id) return
    try {
      const myEmoji = getMyReactionEmoji(msg)
      const normalizedEmoji = String(emoji || '').trim() || '👍'

      const response = myEmoji
        ? (myEmoji === normalizedEmoji
          ? await conversationService.removeMessageReaction(msg._id)
          : await conversationService.reactToMessage(msg._id, normalizedEmoji))
        : await conversationService.reactToMessage(msg._id, normalizedEmoji)

      const updatedMessage = response?.message
      if (!updatedMessage?._id) return

      setMessages((prev) => prev.map((item) =>
        String(item._id) === String(updatedMessage._id)
          ? { ...item, ...updatedMessage }
          : item
      ))
    } catch (err) {
      setError(err.message || 'Không thể cập nhật reaction')
    }
  }

  const handleToggleMessagePin = async (msg) => {
    if (!msg?._id) return
    try {
      const nextPinned = !Boolean(msg?.pinnedAt)
      const response = await conversationService.togglePinMessage(msg._id, nextPinned)
      const updatedMessage = response?.message
      if (!updatedMessage?._id) return

      setMessages((prev) => prev.map((item) =>
        String(item._id) === String(updatedMessage._id)
          ? { ...item, ...updatedMessage }
          : item
      ))
    } catch (err) {
      setError(err.message || 'Không thể cập nhật ghim tin nhắn')
    }
  }

  // Handle open AI chat
  const handleOpenAIChat = async () => {
    try {
      const res = await aiService.getAIConversation()
      const conv = res.conversation
      setAiConversation(conv)
      try {
        const msgRes = await aiService.getAIMessages(conv._id)
        const msgs = msgRes.messages || []
        const AI_WELCOME_MSG = {
          _id: '__ai_welcome__',
          content: `Xin chào! Tôi là ZTING AI — trợ lý AI được tích hợp trong ứng dụng chat này.\n\nTôi có thể giúp bạn:\n📚 Hỗ trợ học tập — giải thích khái niệm, tóm tắt tài liệu, hướng dẫn bài tập\n💬 Tư vấn cuộc sống — lời khuyên tích cực\n🖼️ Phân tích ảnh & file`,
          senderId: { _id: '000000000000000000000001', name: 'ZTING AI', avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/120px-Google_Gemini_logo.svg.png' },
          createdAt: new Date().toISOString(),
          _isWelcome: true,
        }
        setAiMessages(msgs.length === 0 ? [AI_WELCOME_MSG] : msgs)
      } catch {
        setAiMessages([{
          _id: '__ai_welcome__',
          content: `Xin chào! Tôi là ZTING AI — trợ lý AI được tích hợp trong ứng dụng chat này.\n\nTôi có thể giúp bạn:\n📚 Hỗ trợ học tập — giải thích khái niệm, tóm tắt tài liệu, hướng dẫn bài tập\n💬 Tư vấn cuộc sống — lời khuyên tích cực\n🖼️ Phân tích ảnh & file`,
          senderId: { _id: '000000000000000000000001', name: 'ZTING AI', avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/120px-Google_Gemini_logo.svg.png' },
          createdAt: new Date().toISOString(),
          _isWelcome: true,
        }])
      }
    } catch (err) {
      console.error('Lỗi khi mở chat AI:', err)
      toast.error(err.message || 'Không thể mở chat AI', { id: 'ai-open-chat-error' })
    }
  }

  // Handle send AI message
  const handleSendAIMessage = async ({ content, file } = {}) => {
    if (!aiConversation) return
    if (!content && !file) return
    if (aiTyping) return

    const socket = socketService.getSocket()
    if (!socket) {
      toast.error('Chưa kết nối socket', { id: 'ai-socket-error' })
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      toast.error('Chưa đăng nhập', { id: 'ai-not-logged-in' })
      return
    }

    try {
      setAiTyping(true)
      setPendingFile(null)
      setNewMessage('')

      const payload = { token, content: content || undefined }
      if (file) {
        const reader = new FileReader()
        reader.onload = () => {
          payload.file = { data: reader.result.split(',')[1], mimeType: file.type }
          socket.emit('ai_message', payload)
        }
        reader.onerror = () => {
          setAiTyping(false)
          toast.error('Không thể đọc file', { id: 'ai-file-read-error' })
        }
        reader.readAsDataURL(file)
      } else {
        socket.emit('ai_message', payload)
      }
    } catch (err) {
      setAiTyping(false)
      toast.error(err.message || 'Lỗi khi gửi tin nhắn', { id: 'ai-send-error' })
    }
  }

  // Handle clear AI chat
  const handleClearAIChat = async () => {
    if (!aiConversation) return

    const confirmed = await openConfirmPopup({
      title: 'Làm mới cuộc trò chuyện',
      message: 'Bạn chắc chắn muốn xóa tất cả tin nhắn trong cuộc trò chuyện này?',
      confirmText: 'Xóa',
      danger: true
    })

    if (!confirmed) return

    try {
      await aiService.clearAIMessages(aiConversation._id)
      const AI_WELCOME_MSG = {
        _id: '__ai_welcome__',
        content: `Xin chào! Tôi là ZTING AI — trợ lý AI được tích hợp trong ứng dụng chat này.\n\nTôi có thể giúp bạn:\n📚 Hỗ trợ học tập — giải thích khái niệm, tóm tắt tài liệu, hướng dẫn bài tập\n💬 Tư vấn cuộc sống — lời khuyên tích cực\n🖼️ Phân tích ảnh & file`,
        senderId: { _id: '000000000000000000000001', name: 'ZTING AI', avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/120px-Google_Gemini_logo.svg.png' },
        createdAt: new Date().toISOString(),
        _isWelcome: true,
      }
      setAiMessages([AI_WELCOME_MSG])
      toast.success('Đã làm mới cuộc trò chuyện', { id: 'ai-clear-success' })
    } catch (err) {
      toast.error(err.message || 'Không thể làm mới cuộc trò chuyện', { id: 'ai-clear-error' })
    }
  }

  // Handle accept friend request
  const handleAcceptRequest = async (requestId) => {
    try {
      const res = await friendService.acceptFriendRequest(requestId)
      // Cập nhật local state ngay, không cần gọi lại server
      const accepted = friendRequests.find(r => String(r._id) === String(requestId))
      setFriendRequests(prev => prev.filter(r => String(r._id) !== String(requestId)))
      if (accepted) {
        const newFriend = accepted.fromUserId || accepted.from || null
        if (newFriend && newFriend._id) {
          setFriends(prev => {
            const exists = prev.some(f => String(f._id) === String(newFriend._id))
            if (exists) return prev
            return [...prev, newFriend]
          })
        } else {
          loadFriends()
        }
      }

      // Backend đã tự tạo hội thoại khi kết bạn thành công -> đồng bộ ngay để click vào bạn mới mở chat được.
      if (res?.conversation?._id) {
        await loadConversations()
      }

      toast.success('Đã chấp nhận yêu cầu kết bạn')
    } catch (err) {
      setError('Không thể chấp nhận yêu cầu kết bạn')
    }
  }

  // Handle decline friend request
  const handleDeclineRequest = async (requestId) => {
    try {
      await friendService.declineFriendRequest(requestId)
      // Cập nhật local state ngay
      setFriendRequests(prev => prev.filter(r => String(r._id) !== String(requestId)))
      toast.success('Đã từ chối yêu cầu kết bạn')
    } catch (err) {
      setError('Không thể từ chối yêu cầu kết bạn')
    }
  }

  // Send a friend request to given user id
  const handleSendRequest = async (userId) => {
    try {
      await friendService.sendFriendRequest(userId)
      await loadFriendRequests()
      toast.success('Đã gửi yêu cầu kết bạn')
    } catch (err) {
      setError('Không thể gửi yêu cầu kết bạn')
    }
  }

  // Revoke a sent friend request
  const handleRevokeRequest = async (requestId, toUserId) => {
    if (!requestId) return
    try {
      await friendService.cancelFriendRequest(requestId, toUserId)
      // Cập nhật local state ngay
      setSentRequests(prev => prev.filter(r => String(r._id) !== String(requestId)))
      toast.success('Đã thu hồi lời mời kết bạn')
    } catch (err) {
      console.error('[Revoke] error:', err)
      setError('Không thể thu hồi lời mời kết bạn. Vui lòng thử lại.')
    }
  }

  // Search user by email for add friend modal
  const handleSearchUser = async () => {
    if (!searchEmail.trim()) return
    setSearchLoading(true)
    setError('')
    try {
      const [res, freshFriends, freshRequests] = await Promise.all([
        userService.searchUserByEmail(searchEmail.trim()),
        friendService.getAllFriends(),
        friendService.getFriendRequests()
      ])
      const currentFriends = freshFriends.friends || []
      const requestPayload = freshRequests.data || freshRequests
      const currentSent = requestPayload.sent || []
      const currentReceived = requestPayload.receive || []
      setFriends(currentFriends)
      setSentRequests(currentSent)
      setFriendRequests(currentReceived)
      const found = res.user || res
      if (found && found._id) {
        const isFriend = currentFriends.some(f => f._id === found._id)
        const hasSentRequest = currentSent.some(r => (r.toUserId?._id || r.toUserId) === found._id)
        const hasReceivedRequest = currentReceived.some(r => (r.fromUserId?._id || r.fromUserId) === found._id)
        setSearchResults([{ ...found, isFriend, hasSentRequest, hasReceivedRequest, isSelf: found._id === user?._id }])
      } else {
        setSearchResults([])
        setError('Không tìm thấy người dùng với email này')
      }
    } catch (err) {
      setSearchResults([])
      setError('Không tìm thấy người dùng với email này')
    } finally {
      setSearchLoading(false)
    }
  }

  // Open send request popup
  const handleSendRequestFromModal = (userId, userName) => {
    setSelectedUserToAdd({ _id: userId, name: userName })
    setShowSendRequestModal(true)
  }

  // Confirm send friend request with message
  const confirmSendRequest = async () => {
    if (!selectedUserToAdd) return
    try {
      const res = await friendService.sendFriendRequest(selectedUserToAdd._id, requestMessage.trim())
      // Thêm lời mời vừa gửi vào sentRequests (nếu backend trả về request object)
      const newRequest = res?.request || res?.data || null
      if (newRequest && newRequest._id) {
        setSentRequests(prev => {
          const exists = prev.some(r => String(r._id) === String(newRequest._id))
          if (exists) return prev
          return [...prev, newRequest]
        })
      } else {
        loadFriendRequests()
      }
      setSearchResults(prev => prev.map(u => u._id === selectedUserToAdd._id ? { ...u, hasSentRequest: true } : u))
      setShowSendRequestModal(false)
      setShowAddFriendModal(false)
      setRequestMessage('Xin chào, mình muốn kết bạn với bạn!')
      setSelectedUserToAdd(null)
      toast.success('Đã gửi yêu cầu kết bạn')
    } catch (err) {
      const msg = typeof err === 'string' ? err : (err?.message || err?.error || null)
      setError(msg || 'Không thể gửi yêu cầu kết bạn')
      setShowSendRequestModal(false)
      setSelectedUserToAdd(null)
    }
  }

  // Reset add friend modal
  const resetAddFriendModal = () => {
    setShowAddFriendModal(false)
    setSearchEmail('')
    setSearchResults([])
    setError('')
  }

  // Unfriend someone
  const handleUnfriend = async (userId) => {
    const confirmed = await openConfirmPopup({
      title: 'Hủy kết bạn',
      message: 'Bạn có chắc chắn muốn hủy kết bạn?',
      confirmText: 'Hủy kết bạn',
      danger: true
    })
    if (!confirmed) return
    try {
      await friendService.unfriend(userId)
      // Cập nhật local state ngay
      setFriends(prev => prev.filter(f => String(f._id) !== String(userId)))
      if (selectedContact && selectedContact._id === userId) {
        setSelectedContact(null)
      }
      toast.success('Đã hủy kết bạn')
    } catch (err) {
      setError('Không thể huỷ kết bạn')
    }
  }

  // helper to open a small popup when clicking user avatar in messages
  const openUserPopup = async (userId) => {
    try {
      const res = await userService.getUserById(userId)
      const u = res.user || res
      setPopupUser(u)
    } catch (err) {
      console.error('cannot load user info', err)
    }
  }
  const closePopup = () => setPopupUser(null)

  // helper to format a date/time string
  const formatTime = (isoString) => {
    try {
      const d = new Date(isoString)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const msgDate = new Date(d)
      msgDate.setHours(0, 0, 0, 0)

      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      // Nếu là hôm nay, hiển thị "Hôm nay" + giờ
      if (msgDate.getTime() === today.getTime()) {
        return `Hôm nay ${timeStr}`
      }

      // Nếu không phải hôm nay, hiển thị ngày/tháng + giờ
      const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      return `${dateStr} ${timeStr}`
    } catch {
      return ''
    }
  }

  // relative time (minutes/hours/days ago)
  const formatRelative = (isoString) => {
    try {
      const diff = Date.now() - new Date(isoString).getTime()
      const mins = Math.floor(diff / 60000)
      if (mins < 1) return 'vừa xong'
      if (mins < 60) return `${mins} phút trước`
      const hrs = Math.floor(mins / 60)
      if (hrs < 24) return `${hrs} giờ trước`
      const days = Math.floor(hrs / 24)
      return `${days} ngày trước`
    } catch {
      return ''
    }
  }

  // helper to format date divider (Hôm nay, ngày/tháng/năm)
  const formatDateDivider = (isoString) => {
    try {
      const msgDate = new Date(isoString)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const msgDateOnly = new Date(msgDate)
      msgDateOnly.setHours(0, 0, 0, 0)

      if (msgDateOnly.getTime() === today.getTime()) {
        return 'Hôm nay'
      }

      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      if (msgDateOnly.getTime() === yesterday.getTime()) {
        return 'Hôm qua'
      }

      return msgDate.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' })
    } catch {
      return ''
    }
  }

  // helper: status text cho 1 user (online/offline + lần cuối online)
  const getUserStatusText = (userId) => {
    if (!userId) return ''

    // Hide status for blocked users
    if (isBlockedUser(userId)) {
      return ''
    }

    const status = onlineStatus[String(userId)]
    if (!status) return ''
    if (status.status === 'online') return 'Đang hoạt động'
    if (status.lastSeen) return `${formatRelative(status.lastSeen)}`
    return 'Ngoại tuyến'
  }

  // helper to check if two dates are different days
  const isDifferentDay = (date1, date2) => {
    if (!date1 || !date2) return true
    try {
      const d1 = new Date(date1)
      const d2 = new Date(date2)
      d1.setHours(0, 0, 0, 0)
      d2.setHours(0, 0, 0, 0)
      return d1.getTime() !== d2.getTime()
    } catch {
      return true
    }
  }

  const isSystemGroupMessage = (msg) => {
    if (!msg) return false

    // isSystem áp dụng cho cả DIRECT và GROUP
    if (msg.isSystem) return true

    // Fallback nhận diện theo nội dung chỉ áp dụng cho GROUP để tương thích dữ liệu cũ.
    if (selectedContact?.type !== 'GROUP') return false

    const type = String(msg.type || msg.messageType || '').toUpperCase()
    if (type.includes('SYSTEM')) return true

    const content = String(msg.content || '').toLowerCase()
    return (
      content.includes('đã thêm') ||
      content.includes('đã xóa') ||
      content.includes('đã rời khỏi nhóm') ||
      content.includes('đã đổi tên nhóm') ||
      content.includes('đã được bổ nhiệm') ||
      content.includes('đã bị thu hồi quyền') ||
      content.includes('đã tham gia nhóm qua link mời') ||
      content.includes('đã chuyển quyền')
    )
  }

  // Handle create group
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Vui lòng nhập tên nhóm')
      return
    }
    if (selectedFriendsForGroup.length === 0) {
      setError('Vui lòng chọn ít nhất một thành viên')
      return
    }
    try {
      const conversation = await conversationService.createConversation({
        type: 'GROUP',
        name: groupName.trim(),
        memberIds: selectedFriendsForGroup
      })
      setShowCreateGroupModal(false)
      setGroupName('')
      setSelectedFriendsForGroup([])
      await loadConversations()
      setSelectedContact(conversation)
    } catch (err) {
      console.error('Lỗi khi tạo nhóm:', err)
      setError(err.message || 'Không thể tạo nhóm')
    }
  }

  // Render main area based on current view
  const renderMainArea = () => {
    switch (currentView) {
      case 'chat':
        return (
          <ChatView
            conversations={conversations}
            selectedContact={selectedContact}
            isCurrentUserMemberOfGroup={isCurrentUserMemberOfGroup}
            chatNotice={chatNotice}
            openUserPopup={openUserPopup}
            user={user}
            onlineStatus={onlineStatus}
            getUserStatusText={getUserStatusText}
            showInfoPanel={showInfoPanel}
            setShowInfoPanel={setShowInfoPanel}
            friends={friends}
            sentRequests={sentRequests}
            friendRequests={friendRequests}
            handleUnfriend={handleUnfriend}
            handleSendRequest={handleSendRequest}
            messages={messages}
            isSystemGroupMessage={isSystemGroupMessage}
            isDifferentDay={isDifferentDay}
            formatDateDivider={formatDateDivider}
            isGifUrl={isGifUrl}
            isImageUrl={isImageUrl}
            isVideoUrl={isVideoUrl}
            isDocumentUrl={isDocumentUrl}
            basenameFromUrl={basenameFromUrl}
            openMediaModal={openMediaModal}
            downloadFile={downloadFile}
            formatTime={formatTime}
            messagesEndRef={messagesEndRef}
            showMediaModal={showMediaModal}
            mediaModalUrl={mediaModalUrl}
            closeMediaModal={closeMediaModal}
            mediaModalType={mediaModalType}
            mediaModalName={mediaModalName}
            pendingFiles={pendingFiles}
            isUploadingFile={isUploadingFile}
            setPendingFiles={setPendingFiles}
            setUploadProgress={setUploadProgress}
            fileInputRef2={fileInputRef2}
            videoInputRef={videoInputRef}
            uploadProgress={uploadProgress}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            handleFileChange={handleFileChange}
            handleVideoFileChange={handleVideoFileChange}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            handleSendMessage={handleSendMessage}
            emojiPickerRef={emojiPickerRef}
            getMyGroupRoleType={getMyGroupRoleType}
            groupActionLoading={groupActionLoading}
            handleOpenAddMembersModal={handleOpenAddMembersModal}
            handleGetInviteLink={handleGetInviteLink}
            handleRenameGroup={handleRenameGroup}
            getRoleLabel={getRoleLabel}
            normalizeRoleType={normalizeRoleType}
            handlePromoteMember={handlePromoteMember}
            handleDemoteMember={handleDemoteMember}
            handleRemoveGroupMember={handleRemoveGroupMember}
            handleLeaveGroup={handleLeaveGroup}
            handleDeleteGroup={handleDeleteGroup}
            toggleBlock={toggleBlock}
            isBlockedUser={isBlockedUser}
            getDirectParticipantId={getDirectParticipantId}
            blockedUsers={blockedUsers}
            handleRecallMessage={handleRecallMessage}
            handleToggleMessageReaction={handleToggleMessageReaction}
            handleToggleMessagePin={handleToggleMessagePin}
            hasMyReaction={hasMyReaction}
            messageMenuOpen={messageMenuOpen}
            setMessageMenuOpen={setMessageMenuOpen}
          />
        )

      case 'friends':
        return (
          <FriendsView
            friendsView={friendsView}
            friendRequests={friendRequests}
            sentRequests={sentRequests}
            handleContactClick={handleContactClick}
            setCurrentView={setCurrentView}
            handleDeclineRequest={handleDeclineRequest}
            handleAcceptRequest={handleAcceptRequest}
            handleRevokeRequest={handleRevokeRequest}
            conversations={conversations}
            groupSearchTerm={groupSearchTerm}
            setGroupSearchTerm={setGroupSearchTerm}
            groupSortOrder={groupSortOrder}
            setGroupSortOrder={setGroupSortOrder}
            filteredFriends={filteredFriends}
            friendSearchTerm={friendSearchTerm}
            setFriendSearchTerm={setFriendSearchTerm}
            friendSortOrder={friendSortOrder}
            setFriendSortOrder={setFriendSortOrder}
            friendMenuOpen={friendMenuOpen}
            setFriendMenuOpen={setFriendMenuOpen}
            handleUnfriend={handleUnfriend}
            friends={friends}
          />
        )

      case 'ai':
        if (!aiConversation) {
          return (
            <div className="main-area ai-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                onClick={handleOpenAIChat}
                style={{
                  padding: '12px 24px',
                  background: '#003399',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Mở Chat AI
              </button>
            </div>
          )
        }
        return (
          <AIView
            messages={aiMessages}
            setMessages={setAiMessages}
            aiTyping={aiTyping}
            onSendMessage={handleSendAIMessage}
            onClearChat={handleClearAIChat}
            pendingFile={pendingFile}
            setPendingFile={setPendingFile}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            fileInputRef={fileInputRefAI}
            formatTime={formatTime}
            isUploadingFile={isUploadingFile}
          />
        )

      case 'settings':
        return (
          <SettingsView
            onOpenChangePassword={() => {
              setError('')
              setShowChangePassword(true)
            }}
            onOpenCloseAccount={() => {
              setError('')
              setShowCloseAccount(true)
            }}
            onLogout={handleLogout}
          />
        )

      default:
        return null
    }
  }

  return (
    <>
      <div className="home-container">
        <AppSidebar
          user={user}
          currentView={currentView}
          friendRequestCount={friendRequests.length}
          onOpenProfile={openProfile}
          onChangeView={handleViewChange}
        />

        <ContactsPanel
          currentView={currentView}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onOpenAddFriendModal={() => setShowAddFriendModal(true)}
          onOpenCreateGroupModal={() => setShowCreateGroupModal(true)}
          onOpenJoinGroupModal={() => {
            setShowJoinGroupModal(true)
            setJoinGroupCode('')
          }}
          error={sidebarError}
          friendsView={friendsView}
          friendRequestCount={friendRequests.length}
          onChangeFriendsView={setFriendsView}
          onLoadFriendRequests={loadFriendRequests}
          loading={loading}
          filteredContacts={filteredContacts}
          selectedContact={selectedContact}
          onContactClick={handleContactClick}
          onOpenUserPopup={openUserPopup}
          currentUser={user}
          onlineStatus={onlineStatus}
          formatRelative={formatRelative}
        />

        {renderMainArea()}

        <ConfirmPopup popup={confirmPopup} onClose={closeConfirmPopup} />

        <UserProfileModal
          open={showUserProfile}
          onClose={() => setShowUserProfile(false)}
          error={error}
          user={user}
          isEditingProfile={isEditingProfile}
          profileForm={profileForm}
          onProfileChange={handleProfileChange}
          onStartEdit={startEditProfile}
          onSaveProfile={saveProfile}
          onCancelEdit={() => setIsEditingProfile(false)}
          onBannerClick={handleBannerClick}
          bannerInputRef={bannerInputRef}
          onBannerUpload={handleBannerUpload}
          onAvatarClick={handleAvatarClick}
          avatarInputRef={avatarInputRef}
          onAvatarUpload={handleAvatarUpload}
          formatDate={formatDate}
        />
      </div>

      <UserInfoModal
        user={popupUser}
        onClose={closePopup}
        formatDate={formatDate}
        currentUserId={user?._id}
        friends={friends}
        sentRequests={sentRequests}
        friendRequests={friendRequests}
        onAddFriend={handleSendRequest}
        onUnfriend={handleUnfriend}
        onAcceptRequest={handleAcceptRequest}
        onDeclineRequest={handleDeclineRequest}
        onRevokeRequest={handleRevokeRequest}
      />

      <AddFriendModal
        open={showAddFriendModal}
        onClose={resetAddFriendModal}
        searchEmail={searchEmail}
        onSearchEmailChange={setSearchEmail}
        onSearchUser={handleSearchUser}
        searchLoading={searchLoading}
        error={error}
        searchResults={searchResults}
        friends={friends}
        sentRequests={sentRequests}
        friendRequests={friendRequests}
        onAcceptRequest={handleAcceptRequest}
        onSendRequestFromModal={handleSendRequestFromModal}
      />

      <SendRequestModal
        open={showSendRequestModal}
        selectedUser={selectedUserToAdd}
        requestMessage={requestMessage}
        onMessageChange={setRequestMessage}
        onClose={() => setShowSendRequestModal(false)}
        onConfirm={confirmSendRequest}
      />

      {showChangePassword && (
        <div className="profile-modal" onClick={() => setShowChangePassword(false)}>
          <div className="profile-content" onClick={(e) => e.stopPropagation()}>
            <div className="profile-header">
              <h3>Đổi mật khẩu</h3>
              <button
                className="close-btn"
                onClick={() => setShowChangePassword(false)}
              >
                <MdClose />
              </button>
            </div>
            {error && <div className="error-message" style={{ padding: '0 20px', color: 'red', fontSize: '13px' }}>{error}</div>}
            <div className="profile-body">
              <div className="form-group">
                <label>Mật khẩu hiện tại</label>
                <input
                  type="password"
                  name="oldPassword"
                  value={passwordForm.oldPassword}
                  onChange={handlePasswordChange}
                />
              </div>
              <div className="form-group">
                <label>Mật khẩu mới</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                />
              </div>
              <div className="form-group">
                <label>Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                />
              </div>
              <div className="profile-actions">
                <button className="btn-submit-danger" onClick={submitPasswordChange}>
                  Đổi mật khẩu
                </button>
                <button
                  className="btn-cancel-gray"
                  onClick={() => setShowChangePassword(false)}
                >
                  Quay lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCloseAccount && (
        <div className="profile-modal" onClick={() => setShowCloseAccount(false)}>
          <div className="profile-content" onClick={(e) => e.stopPropagation()}>
            <div className="profile-header">
              <h3>Đóng tài khoản</h3>
              <button
                className="close-btn"
                onClick={() => setShowCloseAccount(false)}
              >
                <MdClose />
              </button>
            </div>
            {error && <div className="error-message" style={{ padding: '0 20px', color: 'red', fontSize: '13px' }}>{error}</div>}
            <div className="profile-body">
              <div className="form-group">
                <label>Nhập mật khẩu để xác nhận</label>
                <input
                  type="password"
                  value={closeAccountPassword}
                  onChange={(e) => setCloseAccountPassword(e.target.value)}
                />
              </div>
              <div className="profile-actions">
                <button className="btn-submit-danger" onClick={submitCloseAccount}>
                  Đóng tài khoản
                </button>
                <button
                  className="btn-cancel-gray"
                  onClick={() => setShowCloseAccount(false)}
                >
                  Quay lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <GroupModals
        showAddMembersModal={showAddMembersModal}
        setShowAddMembersModal={setShowAddMembersModal}
        selectedContact={selectedContact}
        friends={friends}
        selectedMembersToAdd={selectedMembersToAdd}
        setSelectedMembersToAdd={setSelectedMembersToAdd}
        handleAddMembersToGroup={handleAddMembersToGroup}
        groupActionLoading={groupActionLoading}
        showTransferOwnerModal={showTransferOwnerModal}
        setShowTransferOwnerModal={setShowTransferOwnerModal}
        user={user}
        transferTargetUserId={transferTargetUserId}
        setTransferTargetUserId={setTransferTargetUserId}
        handleTransferOwnerAndLeave={handleTransferOwnerAndLeave}
        showRenameModal={showRenameModal}
        setShowRenameModal={setShowRenameModal}
        newGroupName={newGroupName}
        setNewGroupName={setNewGroupName}
        handleSubmitRename={handleSubmitRename}
        showCreateGroupModal={showCreateGroupModal}
        setShowCreateGroupModal={setShowCreateGroupModal}
        groupName={groupName}
        setGroupName={setGroupName}
        selectedFriendsForGroup={selectedFriendsForGroup}
        setSelectedFriendsForGroup={setSelectedFriendsForGroup}
        handleCreateGroup={handleCreateGroup}
        showJoinGroupModal={showJoinGroupModal}
        setShowJoinGroupModal={setShowJoinGroupModal}
        joinGroupCode={joinGroupCode}
        setJoinGroupCode={setJoinGroupCode}
        joinGroupLoading={joinGroupLoading}
        setJoinGroupLoading={setJoinGroupLoading}
        conversationService={conversationService}
        loadConversations={loadConversations}
        setSelectedContact={setSelectedContact}
        setError={setError}
        showInviteCodeModal={showInviteCodeModal}
        setShowInviteCodeModal={setShowInviteCodeModal}
        inviteCode={inviteCode}
        copyInviteSuccess={copyInviteSuccess}
        handleCopyInviteCode={handleCopyInviteCode}
      />

    </>
  )
}

export default Home
