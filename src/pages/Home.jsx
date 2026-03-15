import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdChat, MdPeople, MdSmartToy, MdSettings, MdPerson, MdPersonAdd, MdLink, MdLogout, MdEdit, MdClose, MdMenu, MdBlock, MdEmojiEmotions, MdAttachFile, MdVideocam, MdSend } from 'react-icons/md'
import EmojiPicker from 'emoji-picker-react'
import authService from '../services/authService'
import conversationService from '../services/conversationService'
import friendService from '../services/friendService'
import userService from '../services/userService'
import socketService from '../services/socketService'
import { isImageUrl, isVideoUrl, isGifUrl, isDocumentUrl, basenameFromUrl, downloadFile } from '../utils/mediaHelpers'
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
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState([])
  const [onlineStatus, setOnlineStatus] = useState({}) // { userId: { status: 'online'|'offline', lastSeen: timestamp } }
  const messagesEndRef = useRef(null)
  const messageInputRef = useRef(null)

  // load list of users blocked by current user
  const loadBlockedUsers = async () => {
    try {
      const res = await userService.getBlockedUsers()
      setBlockedUsers(res.blocked || [])
    } catch (err) {
      console.error('cannot load blocked users', err)
    }
  }
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })

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
      // Only add message if it's from the current conversation
      if (selectedContact && String(newMsg.conversationId) === String(selectedContact._id)) {
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(m => String(m._id) === String(newMsg._id))
          if (exists) return prev
          return [...prev, newMsg]
        })
      }
      // Update conversation list with new message
      loadConversations()
    }

    const handleMessageRecalled = (data) => {
      const { messageId, conversationId } = data
      if (String(conversationId) === String(selectedContact?._id)) {
        setMessages(prev =>
          prev.map(msg =>
            String(msg._id) === String(messageId)
              ? { ...msg, isRecalled: true, content: null, fileUrl: null }
              : msg
          )
        )
      }
    }

    const socket = socketService.getSocket()
    if (socket) {
      socket.removeAllListeners('new_message')
      socket.removeAllListeners('message_recalled')
      socket.on('new_message', handleNewMessage)
      socket.on('message_recalled', handleMessageRecalled)
    }

    return () => {
      if (socket) {
        socket.off('new_message', handleNewMessage)
        socket.off('message_recalled', handleMessageRecalled)
      }
    }
  }, [selectedContact])

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
            else setFilteredContacts([{ _id: null, participantId: u._id, participantName: u.name, name: u.name }])
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
            return pId !== userId
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
        if (c.type === 'GROUP') {
          // ưu tiên tên group từ backend
          displayName = c.groupId?.name || c.name || 'Nhóm không tên'
        }

        // nếu sau khi chuẩn hoá vẫn không có tên, bỏ qua để tránh dòng trống / lỗi
        if (!displayName) return null

        return {
          ...c,
          participants: populatedParticipants,
          participantId,
          participantName,
          participantAvatar,
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
    }
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await authService.logout()
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
        dateOfBirth: latest.dateOfBirth ? new Date(latest.dateOfBirth).toISOString().slice(0,10) : '',
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
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().slice(0,10) : '',
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
      alert('Đổi mật khẩu thành công')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Có lỗi khi đổi mật khẩu')
    }
  }

  // Handle contact click (conversation or friend)
  const handleContactClick = async (contact) => {
    let convo = contact;
    // Chỉ khi click từ danh sách bạn bè (friend không có type) mới tự tạo cuộc trò chuyện DIRECT.
    const isFriendItem = !contact.type && !contact.participantId
    if (isFriendItem) {
      // try find existing conversation với bạn đó
      convo = conversations.find(c => c.participantId === contact._id);
      if (!convo) {
        try {
          // tạo cuộc trò chuyện 1-1 mới
          await conversationService.createConversation({ type: 'DIRECT', memberIds: [contact._id] });
          await loadConversations();
          convo = conversations.find(c => c.participantId === contact._id) || {
            _id: null,
            participantId: contact._id,
            participantName: contact.name,
            name: contact.name
          };
        } catch (e) {
          console.error('Failed to create conversation', e);
          convo = {
            _id: null,
            participantId: contact._id,
            participantName: contact.name,
            name: contact.name
          };
        }
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
      setMessages(res.messages || [])
    } catch (err) {
      console.error('Không thể tải tin nhắn', err)
    }
  }

  // Watch for selection change or view change
  useEffect(() => {
    if (selectedContact && currentView === 'chat') {
      setChatNotice('')
      loadMessages(selectedContact._id)
    } else {
      setMessages([])
      setChatNotice('')
    }
  }, [selectedContact, currentView])

  // scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // actions for info panel
  const toggleBlock = async () => {
    if (!selectedContact || !selectedContact.participantId) return
    try {
      if (blockedUsers.includes(selectedContact.participantId)) {
        await userService.unblockUser(selectedContact.participantId)
      } else {
        await userService.blockUser(selectedContact.participantId)
      }
      await loadBlockedUsers()
    } catch (err) {
      console.error('block/unblock failed', err)
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
    if (!window.confirm(`Bạn có chắc muốn xóa ${memberName || 'thành viên này'} khỏi nhóm?`)) return
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
    if (!window.confirm(`Bổ nhiệm ${memberName || 'thành viên này'} làm phó nhóm?`)) return
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
    if (!window.confirm(`Thu hồi quyền phó nhóm của ${memberName || 'thành viên này'}?`)) return
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
    if (!window.confirm('Bạn có chắc muốn xoá nhóm? Hành động này không thể hoàn tác.')) return
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
    if (!window.confirm('Bạn có chắc muốn rời nhóm này?')) return
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

  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙁', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '☝️', '👆', '👇', '☟', '✊', '👊', '🤛', '🤜', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '👃', '🧠', '🦣', '🦴', '🫀', '🫁', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '👋', '🎉', '🎊', '🎈', '🎀', '🎁', '🎂', '🍰', '🎃', '🎄', '⛄', '☃️', '🎆', '🎇', '✨', '🌟', '⭐', '🌠', '🌌', '🌃', '🌆', '🌇', '🌉', '🌁', '⛅', '⛈️', '🌤️', '🌥️', '☁️', '🌦️', '🌧️', '⚡', '🌩️', '🌨️', '❄️', '☃️', '🌬️', '💨', '💧', '💦', '☔', '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🥓', '🥔', '🍤', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🍯', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃']

  const handleFileChange = e => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    // Backend giới hạn 5MB → chặn sớm ở client để tránh lỗi 500
    const maxSize = 5 * 1024 * 1024
    if (f.size > maxSize) {
      setError('File đính kèm tối đa 5MB. Vui lòng chọn file nhỏ hơn.')
      e.target.value = ''
      setPendingFile(null)
      return
    }
    setError('')
    setPendingFile(f)
  }

  const handleVideoFileChange = e => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const maxSize = 5 * 1024 * 1024
    if (f.size > maxSize) {
      setError('Video tối đa 5MB. Vui lòng chọn video nhỏ hơn.')
      e.target.value = ''
      setPendingFile(null)
      return
    }
    setError('')
    setPendingFile(f)
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
    if ((!newMessage.trim() && !pendingFile) || !selectedContact) return
    if (!newMessage.trim() && !pendingFile) {
      setError('Nhập nội dung hoặc chọn file')
      return
    }

    // Guard: if user has been removed from the group, block sending immediately.
    if (selectedContact?.type === 'GROUP' && !isCurrentUserMemberOfGroup(selectedContact)) {
      setChatNotice('Bạn không phải thành viên nhóm')
      return
    }

    try {
      let activeConv = selectedContact
      
      // If conversation doesn't exist yet, create it first
      if (!activeConv._id && activeConv.participantId) {
        try {
          const created = await conversationService.createConversation({ 
            type: 'DIRECT', 
            memberIds: [activeConv.participantId] 
          })
          await loadConversations()
          const freshList = await conversationService.getConversations()
          const convs = freshList.conversations || []
          activeConv = convs.find(c => String(c._id) === String(created._id)) || created
          setSelectedContact(activeConv)
        } catch (err) {
          setError(err.message || 'Không thể tạo cuộc trò chuyện')
          return
        }
      }

      // Create FormData matching Test_Frontend-main
      const form = new FormData()
      const content = newMessage.trim()
      if (content) form.append('content', content)
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
      
      // Append file as 'image' field (matching Test_Frontend-main)
      if (pendingFile) form.append('image', pendingFile)

      // Send message
      const isGroup = activeConv?.type === 'GROUP'
      let res = isGroup 
        ? await conversationService.sendGroupMessage(form)
        : await conversationService.sendDirectMessage(form)
      
      let created = res?.message || null
      
      // Clear input and file
      setNewMessage('')
      setPendingFile(null)
      setChatNotice('')
      if (fileInputRef2.current) fileInputRef2.current.value = ''
      if (messageInputRef.current) {
        messageInputRef.current.style.height = 'auto'
      }
      
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
          const exists = prev.some(m => String(m._id) === String(created._id))
          if (exists) return prev
          return [...prev, created]
        })
        
        // Update conversation list
        setConversations(prev => {
          const convId = String(created.conversationId)
          const idx = prev.findIndex(c => String(c._id) === convId)
          if (idx === -1) {
            loadConversations().catch(() => {})
            return prev
          }
          const updated = [...prev]
          const conv = { 
            ...updated[idx], 
            lastMessage: created, 
            lastMessageAt: created.createdAt || new Date().toISOString() 
          }
          updated.splice(idx, 1)
          updated.unshift(conv)
          return updated
        })
      }
      
      // Reload conversations to ensure sidebar is updated
      await loadConversations()
      
      // If conversation was just created, update selected contact id
      if (!activeConv._id && created?.conversationId) {
        setSelectedContact(prev => ({ ...prev, _id: created.conversationId }))
      }
    } catch (err) {
      console.error('Lỗi khi gửi tin nhắn', err)
      const msg = err?.message || 'Không thể gửi tin nhắn'
      const lower = String(msg).toLowerCase()
      if (lower.includes('không phải thành viên') || lower.includes('not member')) {
        setChatNotice('Bạn không phải thành viên nhóm')
      } else {
        setError(msg)
      }
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
    } catch (err) {
      setError('Không thể từ chối yêu cầu kết bạn')
    }
  }

  // Send a friend request to given user id
  const handleSendRequest = async (userId) => {
    try {
      await friendService.sendFriendRequest(userId)
      await loadFriendRequests()
      alert('Đã gửi yêu cầu kết bạn')
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
      alert('Đã gửi yêu cầu kết bạn')
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
    if (!window.confirm('Bạn có chắc chắn muốn hủy kết bạn?')) return
    try {
      await friendService.unfriend(userId)
      // Cập nhật local state ngay
      setFriends(prev => prev.filter(f => String(f._id) !== String(userId)))
      if (selectedContact && selectedContact._id === userId) {
        setSelectedContact(null)
      }
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
    if (!msg || selectedContact?.type !== 'GROUP') return false

    if (msg.isSystem || msg.systemMessage) return true
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
          <div className="main-area chat-view">
            {conversations.length === 0 ? (
              <div className="welcome">
                <h1>CHÀO MỪNG ĐẾN VỚI ZTING</h1>
                <p>Giao tiếp không khoảng cách, kết nối không giới hạn</p>
                <p className="instruction">Chọn một bạn bè hoặc bắt đầu một cuộc trò chuyện để tiếp tục.</p>
              </div>
            ) : selectedContact ? (
              <div className="chat-wrapper">
                <div className="chat-container">
                  {(() => {
                    const removedFromGroup = selectedContact?.type === 'GROUP' && !isCurrentUserMemberOfGroup(selectedContact)
                    if (!removedFromGroup && !chatNotice) return null
                    return (
                      <div style={{ padding: '10px 20px', background: '#fff3cd', color: '#7a5b00', borderBottom: '1px solid #ffe58f', fontSize: '13px' }}>
                        {chatNotice || 'Bạn không phải thành viên nhóm'}
                      </div>
                    )
                  })()}
                  <div className="chat-header">
                    <div className="chat-header-left">
                      <div
                        className="chat-avatar-wrapper"
                        style={{ cursor: selectedContact?.type !== 'GROUP' ? 'pointer' : 'default' }}
                        onClick={() => {
                          if (selectedContact?.type !== 'GROUP' && (selectedContact.participantId || selectedContact._id)) {
                            openUserPopup(selectedContact.participantId || selectedContact._id)
                          }
                        }}
                      >
                        <div className="chat-avatar">
                          {selectedContact?.participantAvatar ? (
                            <img src={selectedContact.participantAvatar} alt="" />
                          ) : selectedContact?.avatarUrl ? (
                            <img src={selectedContact.avatarUrl} alt="" />
                          ) : (
                            (selectedContact.participantName || selectedContact.name || 'U').charAt(0).toUpperCase()
                          )}
                        </div>
                        {selectedContact?.type !== 'GROUP' && selectedContact?.participantId && (() => {
                          const userStatus = onlineStatus[String(selectedContact.participantId)]
                          const isOnline = userStatus?.status === 'online'
                          return (
                            <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`}></span>
                          )
                        })()}
                      </div>
                      <div className="chat-header-info">
                        <h2>{selectedContact.name || selectedContact.participantName}</h2>
                        {selectedContact.type !== 'GROUP' && (
                          (() => {
                            const contactId = selectedContact.participantId || selectedContact._id
                            const text = getUserStatusText(contactId)
                            return text ? (
                              <p className="chat-status">{text}</p>
                            ) : null
                          })()
                        )}
                      </div>
                    </div>
                    <MdMenu className="info-toggle" onClick={() => setShowInfoPanel(v => !v)} title="Chi tiết" />
                    {/* compute status flags */}
                    {/* compute status flags */}
                    {(() => {
                      const contactId = selectedContact.participantId || selectedContact._id;
                      const isFriend = friends.some(f => f._id === contactId);
                      const hasSent = sentRequests.some(r => {
                        const toId = r.toUserId?._id || r.toUserId;
                        return toId === contactId;
                      });
                      const hasReceived = friendRequests.some(r => {
                        const fromId = r.fromUserId?._id || r.fromUserId;
                        return fromId === contactId;
                      });
                      return (
                        <>                        
                              {isFriend && (
                            <button className="btn-unfriend" onClick={() => handleUnfriend(contactId)}>
                              Huỷ kết bạn
                            </button>
                          )}
                        </>
                      )
                    })()}
                  </div>
                  <div className="chat-messages">
                    {messages.length === 0 ? (
                      <p className="no-messages">Bạn chưa có tin nhắn nào. Hãy gửi tin nhắn để bắt đầu cuộc trò chuyện!</p>
                    ) : (
                      (() => {
                        const groups = []
                        messages.forEach((msg) => {
                          const isSystem = isSystemGroupMessage(msg)

                          if (isSystem) {
                            groups.push({
                              isSystem: true,
                              messages: [msg],
                              createdAt: msg.createdAt
                            })
                            return
                          }

                          const isMine = String(msg.senderId?._id || msg.senderId) === String(user?._id)

                          const prevGroup = groups.length ? groups[groups.length - 1] : null
                          const canAppendToPrev =
                            prevGroup &&
                            !prevGroup.isSystem &&
                            String(prevGroup.senderId) === String(msg.senderId?._id || msg.senderId) &&
                            prevGroup.isMine === isMine

                          if (!canAppendToPrev) {
                            groups.push({
                              senderId: msg.senderId?._id || msg.senderId,
                              senderName: msg.senderId?.name,
                              senderAvatar: msg.senderId?.avatarUrl,
                              isMine,
                              messages: [msg],
                              createdAt: msg.createdAt
                            })
                          } else {
                            prevGroup.messages.push(msg)
                          }
                        })
                        
                        const result = []
                        groups.forEach((group, groupIdx) => {
                          // Add date divider if this is the first message or if date changed
                          const prevGroup = groupIdx > 0 ? groups[groupIdx - 1] : null
                          const showDateDivider = !prevGroup || isDifferentDay(group.createdAt, prevGroup.createdAt)
                          
                          if (showDateDivider && group.createdAt) {
                            result.push(
                              <div key={`divider-${groupIdx}`} className="date-divider">
                                {formatDateDivider(group.createdAt)}
                              </div>
                            )
                          }

                          if (group.isSystem) {
                            const sysMsg = group.messages[0]
                            const sysText = sysMsg?.isRecalled ? 'Tin nhắn đã được thu hồi' : (sysMsg?.content || '')
                            result.push(
                              <div key={`system-${groupIdx}`} className="system-message-row">
                                <span className="system-message-pill">{sysText}</span>
                              </div>
                            )
                            return
                          }
                          
                          result.push(
                            <div key={`group-${groupIdx}`} className={`message-group ${group.isMine ? 'sent-group' : 'received-group'}`}>
                              {!group.isMine && (
                                <div className="group-avatar" onClick={() => openUserPopup(group.senderId)}>
                                  {group.senderAvatar ? (
                                    <img src={group.senderAvatar} alt="" />
                                  ) : (
                                    (group.senderName ? group.senderName.charAt(0).toUpperCase() : 'U')
                                  )}
                                </div>
                              )}
                              <div className="group-messages">
                                {!group.isMine && (
                                  <div className="group-sender-name">{group.senderName || 'User'}</div>
                                )}
                                {group.messages.map(msg => (
                                  <div key={msg._id || msg.id || Math.random()} className="message-item">
                                    {msg.isRecalled ? (
                                      <span className="message-content recalled">
                                        <em>Tin nhắn đã được thu hồi</em>
                                      </span>
                                    ) : (
                                      <span className="message-content">
                                        {msg.fileUrl ? (
                                          <>
                                            {isGifUrl(msg.fileUrl) ? (
                                              <img src={msg.fileUrl} alt="gif" className="message-image" style={{ cursor: 'zoom-in', maxWidth: '300px', borderRadius: '8px' }} onClick={() => openMediaModal(msg.fileUrl, 'image')} />
                                            ) : isImageUrl(msg.fileUrl) ? (
                                              <img src={msg.fileUrl} alt="attachment" className="message-image" style={{ cursor: 'zoom-in', maxWidth: '300px', borderRadius: '8px' }} onClick={() => openMediaModal(msg.fileUrl, 'image')} />
                                            ) : isVideoUrl(msg.fileUrl) ? (
                                              <div className="message-video-preview" style={{ position: 'relative', maxWidth: '300px', borderRadius: '8px', cursor: 'pointer', overflow: 'hidden' }} onClick={() => openMediaModal(msg.fileUrl, 'video')}>
                                                <video src={msg.fileUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted preload="metadata" />
                                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                  <span style={{ fontSize: 26, color: '#fff', fontWeight: 700 }}>▶</span>
                                                </div>
                                              </div>
                                            ) : (
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span className="message-file">{basenameFromUrl(msg.fileUrl)}</span>
                                                <button onClick={() => downloadFile(msg.fileUrl, basenameFromUrl(msg.fileUrl))} title="Tải về" style={{ background: '#eef2ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 6, fontSize: 13, fontWeight: 600, padding: '4px 8px', cursor: 'pointer' }}>⬇ Tải về</button>
                                              </div>
                                            )}
                                            {msg.content && <div style={{ marginTop: 4 }}>{msg.content}</div>}
                                          </>
                                        ) : isGifUrl(msg.content) ? (
                                          <img src={msg.content} alt="gif" className="message-image" style={{ cursor: 'zoom-in', maxWidth: '300px', borderRadius: '8px' }} onClick={() => openMediaModal(msg.content, 'image')} />
                                        ) : isImageUrl(msg.content) ? (
                                          <img src={msg.content} alt="image" className="message-image" style={{ cursor: 'zoom-in', maxWidth: '300px', borderRadius: '8px' }} onClick={() => openMediaModal(msg.content, 'image')} />
                                        ) : isVideoUrl(msg.content) ? (
                                          <div className="message-video-preview" style={{ position: 'relative', maxWidth: '300px', borderRadius: '8px', cursor: 'pointer', overflow: 'hidden' }} onClick={() => openMediaModal(msg.content, 'video')}>
                                            <video src={msg.content} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted preload="metadata" />
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                              <span style={{ fontSize: 26, color: '#fff', fontWeight: 700 }}>▶</span>
                                            </div>
                                          </div>
                                        ) : isDocumentUrl(msg.content) ? (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className="message-file">{basenameFromUrl(msg.content)}</span>
                                            <button onClick={() => downloadFile(msg.content, basenameFromUrl(msg.content))} title="Tải về" style={{ background: '#eef2ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: 6, fontSize: 13, fontWeight: 600, padding: '4px 8px', cursor: 'pointer' }}>⬇ Tải về</button>
                                          </div>
                                        ) : (
                                          <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</span>
                                        )}
                                      </span>
                                    )}
                                    {msg.createdAt && (
                                      <span className="message-time">{formatTime(msg.createdAt)}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })
                        
                        return result
                      })()
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {showMediaModal && mediaModalUrl && (
                    <div onClick={closeMediaModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, flexDirection: 'column', gap: 16 }}>
                      <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
                        {mediaModalType === 'video' ? (
                          <video src={mediaModalUrl} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8, display: 'block' }} />
                        ) : (
                          <img src={mediaModalUrl} alt={mediaModalName || 'media'} style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8, display: 'block' }} />
                        )}
                        <button onClick={closeMediaModal} title="Đóng" style={{ position: 'absolute', top: -12, right: -12, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 32, height: 32, fontSize: 18, cursor: 'pointer' }}>✕</button>
                      </div>
                      <button onClick={() => downloadFile(mediaModalUrl, mediaModalName || 'download')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1d4ed8', color: '#fff', padding: '8px 20px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>⬇ Tải về</button>
                    </div>
                  )}

                  <div className="chat-input">
                    {pendingFile && (
                      <div className="chat-file-preview">
                        <span className="chat-file-preview-name">{pendingFile.name}</span>
                        <button
                          onClick={() => {
                            setPendingFile(null)
                            if (fileInputRef2.current) fileInputRef2.current.value = ''
                            if (videoInputRef.current) videoInputRef.current.value = ''
                          }}
                          className="chat-file-preview-remove"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <div className="chat-input-row">
                      <button 
                        className="icon-btn emoji-btn" 
                        title="Emoji"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        <MdEmojiEmotions />
                      </button>
                      {showEmojiPicker && (
                        <div className="emoji-picker-container" ref={emojiPickerRef}>
                          <EmojiPicker 
                            onEmojiClick={(emojiData) => {
                              const emoji = emojiData?.emoji || emojiData
                              setNewMessage(prev => prev + (emoji || ''))
                              setShowEmojiPicker(false)
                            }}
                            width="100%"
                            height={400}
                          />
                        </div>
                      )}
                      <input
                        ref={fileInputRef2}
                        type="file"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />
                      <button className="icon-btn attach-btn" onClick={() => fileInputRef2.current?.click()} title="Đính kèm file">
                        <MdAttachFile />
                      </button>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        style={{ display: 'none' }}
                        onChange={handleVideoFileChange}
                      />
                      <button className="icon-btn video-btn" onClick={() => videoInputRef.current?.click()} title="Gửi video">
                        <MdVideocam />
                      </button>
                      <textarea
                        ref={messageInputRef}
                        value={newMessage}
                        rows={1}
                        placeholder="Nhập tin nhắn..."
                        onChange={e => {
                          const val = e.target.value
                          setNewMessage(val)
                          if (messageInputRef.current) {
                            messageInputRef.current.style.height = 'auto'
                            const height = Math.min(messageInputRef.current.scrollHeight, 180)
                            messageInputRef.current.style.height = `${height}px`
                          }
                        }}
                        onKeyDown={async e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            if (!newMessage.trim() && !pendingFile) return
                            await handleSendMessage()
                          }
                        }}
                        onInput={() => {
                          if (messageInputRef.current) {
                            messageInputRef.current.style.height = 'auto'
                            const height = Math.min(messageInputRef.current.scrollHeight, 180)
                            messageInputRef.current.style.height = `${height}px`
                          }
                        }}
                      />
                      <button onClick={handleSendMessage} className="chat-send-button"><MdSend style={{ marginRight: 6, fontSize: 18 }} />Gửi</button>
                    </div>
                  </div>
                </div>
                {showInfoPanel && selectedContact && (
                  <div className="info-panel">
                    {selectedContact.type === 'GROUP' ? (
                      (() => {
                        const myRoleType = getMyGroupRoleType(selectedContact)
                        const canRenameGroup = myRoleType === 'OWNER' || myRoleType === 'DEPUTY'
                        const canManageMembers = myRoleType === 'OWNER' || myRoleType === 'DEPUTY'
                        const canManageRoles = myRoleType === 'OWNER'

                        return (
                          <>
                            <div className="info-header">
                              <div className="avatar-large group-avatar-large">
                                {selectedContact.avatarUrl ? (
                                  <img src={selectedContact.avatarUrl} alt="" />
                                ) : (
                                  (selectedContact.name || 'G').charAt(0).toUpperCase()
                                )}
                              </div>
                              <h3>{selectedContact.name}</h3>
                              <p>{selectedContact.participants?.length || 0} thành viên</p>
                              <div className="group-actions">
                                <button className="member-action-btn" onClick={handleOpenAddMembersModal} disabled={groupActionLoading}>Thêm thành viên</button>
                                <MdLink className="action-icon" title="Mã mời nhóm" onClick={handleGetInviteLink} />
                                {canRenameGroup && (
                                  <MdEdit className="action-icon" title="Đổi tên nhóm" onClick={handleRenameGroup} />
                                )}
                              </div>
                            </div>
                            <div className="info-body">
                              <div className="info-section members">
                                <h4>Thành viên ({selectedContact.participants?.length || 0})</h4>
                                {selectedContact.participants?.map(p => {
                                  const userId = p.userId?._id || p._id
                                  const userName = p.userId?.name || p.name || 'User'
                                  const roleType = normalizeRoleType(p.role)
                                  const isSelf = String(userId) === String(user?._id)
                                  const canRemove = canManageMembers && !isSelf && roleType !== 'OWNER'
                                  const canPromote = canManageRoles && !isSelf && roleType === 'MEMBER'
                                  const canDemote = canManageRoles && !isSelf && roleType === 'DEPUTY'

                                  return (
                                    <div className="member-item" key={userId}>
                                      <div className="member-meta">
                                        <span className="member-name">{userName}{isSelf ? ' (Bạn)' : ''}</span>
                                        <span className="member-role">{getRoleLabel(p.role)}</span>
                                      </div>
                                      <div className="member-actions-inline">
                                        {canPromote && (
                                          <button className="member-action-btn" onClick={() => handlePromoteMember(userId, userName)} disabled={groupActionLoading}>Phó nhóm</button>
                                        )}
                                        {canDemote && (
                                          <button className="member-action-btn member-action-warn" onClick={() => handleDemoteMember(userId, userName)} disabled={groupActionLoading}>Thu hồi quyền</button>
                                        )}
                                        {canRemove && (
                                          <button className="member-action-btn member-action-danger" onClick={() => handleRemoveGroupMember(userId, userName)} disabled={groupActionLoading}>Xóa</button>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                              <div className="info-section">
                                <h4>Ảnh/Video</h4>
                              </div>
                              <div className="info-section">
                                <h4>File</h4>
                              </div>

                              <div className="group-footer-actions">
                                <button className="btn-danger" onClick={handleLeaveGroup} disabled={groupActionLoading}>Rời nhóm</button>
                                {myRoleType === 'OWNER' && (
                                  <button className="btn-danger" onClick={handleDeleteGroup} disabled={groupActionLoading}>Xóa nhóm</button>
                                )}
                              </div>
                            </div>
                          </>
                        )
                      })()
                    ) : (
                      <>
                        <div className="info-header">
                          <div className="avatar-large">
                            {(selectedContact.participantName || selectedContact.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <h3>{selectedContact.participantName || selectedContact.name}</h3>
                          {(() => {
                            const contactId = selectedContact.participantId || selectedContact._id
                            const text = getUserStatusText(contactId)
                            return text ? (
                              <p className="info-status">{text}</p>
                            ) : null
                          })()}
                          <button className="btn-block" onClick={toggleBlock}>
                            {blockedUsers.includes(selectedContact.participantId) ? 'Bỏ chặn' : 'Chặn'}
                          </button>
                        </div>
                        <div className="info-body">
                          <div className="info-section">
                            <h4>Ảnh/Video</h4>
                          </div>
                          <div className="info-section">
                            <h4>File</h4>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="welcome">
                <h1>CHÀO MỪNG ĐẾN VỚI ZTING</h1>
                <p>Giao tiếp không khoảng cách, kết nối không giới hạn</p>
              </div>
            )}
          </div>
        )

      case 'friends':
        return (
          <div className="main-area friends-view">
            {friendsView === 'friend-requests' ? (
              <div className="friends-detail-view">
                <div className="fl-page-header">
                  <MdPersonAdd className="fl-page-icon" />
                  <h2 className="fl-page-title">Lời mời kết bạn</h2>
                </div>
                <div className="fr-content">
                  <div className="fr-section-header">Lời mời đã nhận ({friendRequests.length})</div>
                  {friendRequests.length > 0 ? (
                    <div className="fr-card-grid">
                      {friendRequests.map(request => (
                        <div key={request._id} className="fr-card">
                          <div className="fr-card-top">
                            <div className="fr-card-avatar">
                              {request.fromUserId?.avatarUrl ? (
                                <img src={request.fromUserId.avatarUrl} alt={request.fromUserId.name} />
                              ) : (
                                request.fromUserId?.name?.charAt(0).toUpperCase() || 'U'
                              )}
                            </div>
                            <div className="fr-card-info">
                              <span className="fr-card-name">{request.fromUserId?.name}</span>
                              <span className="fr-card-meta">
                                {request.createdAt ? new Date(request.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' - ' : ''}
                                Từ danh thiếp
                              </span>
                            </div>
                            <button
                              className="fr-chat-btn"
                              title="Nhắn tin"
                              onClick={(e) => { e.stopPropagation(); handleContactClick(request.fromUserId); setCurrentView('chat') }}
                            >
                              <MdChat />
                            </button>
                          </div>
                          {request.message && (
                            <div className="fr-card-message">{request.message}</div>
                          )}
                          <div className="fr-card-actions">
                            <button className="fr-btn-decline" onClick={() => handleDeclineRequest(request._id)}>Từ chối</button>
                            <button className="fr-btn-accept" onClick={() => handleAcceptRequest(request._id)}>Đồng ý</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="fr-empty">Chưa có lời mời kết bạn nào</div>
                  )}
                  {sentRequests.length > 0 && (
                    <>
                      <div className="fr-section-header fr-section-header--spaced">Lời mời đã gửi ({sentRequests.length})</div>
                      <div className="fr-card-grid">
                        {sentRequests.map(request => (
                          <div key={request._id} className="fr-card">
                            <div className="fr-card-top">
                              <div className="fr-card-avatar">
                                {request.toUserId?.avatarUrl ? (
                                  <img src={request.toUserId.avatarUrl} alt={request.toUserId.name} />
                                ) : (
                                  request.toUserId?.name?.charAt(0).toUpperCase() || 'U'
                                )}
                              </div>
                              <div className="fr-card-info">
                                <span className="fr-card-name">{request.toUserId?.name}</span>
                                <span className="fr-card-meta">
                                  {request.createdAt ? new Date(request.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : 'Đã gửi lời mời'}
                                </span>
                              </div>
                            </div>
                            <div className="fr-card-actions">
                              <button className="fr-btn-revoke" onClick={() => handleRevokeRequest(request._id, request.toUserId?._id || request.toUserId)}>Thu hồi lời mời</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : friendsView === 'group-list' ? (
              <div className="friends-detail-view">
                <div className="fl-page-header">
                  <MdGroup className="fl-page-icon" />
                  <h2 className="fl-page-title">Danh sách nhóm</h2>
                </div>
                {(() => {
                  const myGroups = conversations.filter(c => c.type === 'GROUP')
                  const filtered = myGroups
                    .filter(g => (g.name || '').toLowerCase().includes(groupSearchTerm.toLowerCase()))
                    .sort((a, b) => groupSortOrder === 'Z-A'
                      ? (b.name || '').localeCompare(a.name || '', 'vi')
                      : (a.name || '').localeCompare(b.name || '', 'vi')
                    )
                  return (
                    <>
                      <div className="fl-sub-header">
                        Nhóm ({myGroups.length})
                      </div>
                      <div className="fl-toolbar">
                        <div className="fl-search-box">
                          <svg className="fl-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                          <input
                            type="text"
                            placeholder="Tìm nhóm"
                            value={groupSearchTerm}
                            onChange={e => setGroupSearchTerm(e.target.value)}
                            className="fl-search-input"
                          />
                        </div>
                        <select
                          value={groupSortOrder}
                          onChange={e => setGroupSortOrder(e.target.value)}
                          className="fl-sort-select"
                        >
                          <option value="A-Z">Tên A-Z</option>
                          <option value="Z-A">Tên Z-A</option>
                        </select>
                      </div>
                      {filtered.length === 0 ? (
                        <div className="empty-state">
                          <p>{groupSearchTerm ? 'Không tìm thấy nhóm nào' : 'Bạn chưa tham gia nhóm nào'}</p>
                        </div>
                      ) : (
                        <div className="fl-list">
                          {filtered.map(group => (
                            <div
                              key={group._id}
                              className="fl-friend-row"
                              onClick={() => { handleContactClick(group); setCurrentView('chat') }}
                            >
                              <div className="fl-avatar" style={{ backgroundColor: '#003399', fontSize: '16px' }}>
                                {group.avatarUrl ? (
                                  <img src={group.avatarUrl} alt={group.name} />
                                ) : (
                                  (group.name || 'G').charAt(0).toUpperCase()
                                )}
                              </div>
                              <span className="fl-name">{group.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            ) : friendsView === 'group-invites' ? (
              <div className="friends-detail-view">
                <div className="fl-page-header">
                  <MdEmail className="fl-page-icon" />
                  <h2 className="fl-page-title">Lời mời vào nhóm và cộng đồng</h2>
                </div>
                <div className="empty-state">
                  <p>Chưa có lời mời nào</p>
                </div>
              </div>
            ) : (
              <div className="friends-detail-view">
                <div className="fl-page-header">
                  <MdContacts className="fl-page-icon" />
                  <h2 className="fl-page-title">Danh sách bạn bè</h2>
                </div>
                <div className="fl-sub-header">
                  Bạn bè ({filteredFriends.length})
                </div>
                <div className="fl-toolbar">
                  <div className="fl-search-box">
                    <svg className="fl-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                      type="text"
                      placeholder="Tìm bạn"
                      value={friendSearchTerm}
                      onChange={(e) => setFriendSearchTerm(e.target.value)}
                      className="fl-search-input"
                    />
                  </div>
                  <select
                    value={friendSortOrder}
                    onChange={(e) => setFriendSortOrder(e.target.value)}
                    className="fl-sort-select"
                  >
                    <option value="A-Z">↕ Tên (A-Z)</option>
                    <option value="Z-A">↕ Tên (Z-A)</option>
                  </select>
                </div>
                {filteredFriends.length > 0 ? (() => {
                  const groups = {}
                  filteredFriends.forEach(f => {
                    const letter = (f.name || 'U').charAt(0).toUpperCase()
                    if (!groups[letter]) groups[letter] = []
                    groups[letter].push(f)
                  })
                  const sortedLetters = Object.keys(groups).sort((a, b) =>
                    friendSortOrder === 'Z-A' ? b.localeCompare(a) : a.localeCompare(b)
                  )
                  return (
                    <div className="fl-list">
                      {sortedLetters.map(letter => (
                        <div key={letter} className="fl-group">
                          <div className="fl-group-letter">{letter}</div>
                          {groups[letter].map(friend => (
                            <div
                              key={friend._id}
                              className="fl-friend-row"
                              onClick={() => { handleContactClick(friend); setCurrentView('chat') }}
                            >
                              <div className="fl-avatar">
                                {friend.avatarUrl ? (
                                  <img src={friend.avatarUrl} alt={friend.name} />
                                ) : (
                                  friend.name?.charAt(0).toUpperCase() || 'U'
                                )}
                              </div>
                              <span className="fl-name">{friend.name}</span>
                              <button
                                className="fl-more-btn"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setFriendMenuOpen(friendMenuOpen === friend._id ? null : friend._id)
                                }}
                                title="Tùy chọn"
                              >
                                ···
                              </button>
                              {friendMenuOpen === friend._id && (
                                <div className="fl-friend-menu">
                                  <button onClick={(e) => { e.stopPropagation(); handleContactClick(friend); setCurrentView('chat'); setFriendMenuOpen(null) }}>
                                    Nhắn tin
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleUnfriend(friend._id); setFriendMenuOpen(null) }}>
                                    Hủy kết bạn
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )
                })() : friends.length === 0 ? (
                  <div className="empty-state">
                    <p>Chưa có bạn nào. Hãy thêm bạn để bắt đầu!</p>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>Không tìm thấy bạn nào phù hợp</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 'ai':
        return (
          <div className="main-area ai-view">
            <div className="ai-container">
              <h2>Trợ lý AI</h2>
              <p>Chat với trợ lý AI để nhận hỗ trợ và tư vấn</p>
              <div className="ai-input">
                <input
                  type="text"
                  placeholder="Nhập câu hỏi cho AI..."
                  className="ai-input-field"
                />
                <button className="send-btn">Gửi</button>
              </div>
            </div>
          </div>
        )

      case 'settings':
        return (
          <div className="main-area settings-view">
            <div className="settings-container">
              <h2>Cài đặt</h2>
              <div className="settings-sections">
                <div className="settings-section">
                  <h3>Bảo mật</h3>
                  <div className="settings-item">
                    <button className="btn-danger" onClick={() => {
                    setError('')
                    setShowChangePassword(true)
                  }}>Đổi mật khẩu</button>
                  </div>
                </div>

                <div className="settings-section">
                  <h3>Khác</h3>
                  <div className="settings-item">
                    <button className="btn-logout" onClick={handleLogout}>
                      <MdLogout /> Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
      <div className="home-container">
      <div className="sidebar">
        <div
          className="avatar user-avatar"
          onClick={openProfile}
          title="Hồ sơ người dùng"
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="avatar" />
          ) : (
            (user?.name ? user.name.charAt(0).toUpperCase() : 'U')
          )}
        </div>

        <div
          className={`icon ${currentView === 'chat' ? 'active' : ''}`}
          onClick={() => handleViewChange('chat')}
          title="Tin nhắn"
        >
          <MdChat />
        </div>

        <div
          className={`icon ${currentView === 'friends' ? 'active' : ''}`}
          onClick={() => handleViewChange('friends')}
          title="Danh bạ"
        >
          <MdContacts />
          {friendRequests.length > 0 && (
            <span className="sidebar-badge">{friendRequests.length > 99 ? '99+' : friendRequests.length}</span>
          )}
        </div>

        <div
          className={`icon ${currentView === 'ai' ? 'active' : ''}`}
          onClick={() => handleViewChange('ai')}
          title="Trợ lý AI"
        >
          <MdSmartToy />
        </div>

        <div
          className={`icon settings-icon ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => handleViewChange('settings')}
          title="Cài đặt"
        >
          <MdSettings />
        </div>
      </div>

      {(currentView === 'friends' || currentView === 'chat') && (
        <div className="contacts-panel">
          {currentView === 'chat' || currentView === 'friends' ? (
          <>
            <div className="contacts-header">
              <div className="search-wrapper">
                <MdEdit className="search-icon" />
                <input
                  className="search"
                  placeholder="Tìm tên/ email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="contacts-icon-group">
                <div className="icon" title="Thêm bạn" onClick={() => setShowAddFriendModal(true)}>
                  <MdPersonAdd />
                </div>
                <div className="icon" title="Tạo nhóm chat" onClick={() => setShowCreateGroupModal(true)}>
                  <MdPeople />
                </div>
                <div className="icon" title="Tham gia nhóm bằng mã" onClick={() => { setShowJoinGroupModal(true); setJoinGroupCode('') }}>
                  <MdLink />
                </div>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {currentView === 'friends' ? (
              <nav className="friends-nav">
                <div
                  className={`friends-nav-item ${friendsView === 'friends-list' ? 'active' : ''}`}
                  onClick={() => setFriendsView('friends-list')}
                >
                  <MdContacts className="friends-nav-icon" />
                  <span>Danh sách bạn bè</span>
                </div>
                <div
                  className={`friends-nav-item ${friendsView === 'group-list' ? 'active' : ''}`}
                  onClick={() => setFriendsView('group-list')}
                >
                  <MdGroup className="friends-nav-icon" />
                  <span>Danh sách nhóm</span>
                </div>
                <div
                  className={`friends-nav-item ${friendsView === 'friend-requests' ? 'active' : ''}`}
                  onClick={() => { setFriendsView('friend-requests'); loadFriendRequests() }}
                >
                  <MdPersonAdd className="friends-nav-icon" />
                  <span>Lời mời kết bạn</span>
                  {friendRequests.length > 0 && (
                    <span className="friends-nav-badge">{friendRequests.length}</span>
                  )}
                </div>
                <div
                  className={`friends-nav-item ${friendsView === 'group-invites' ? 'active' : ''}`}
                  onClick={() => setFriendsView('group-invites')}
                >
                  <MdEmail className="friends-nav-icon" />
                  <span>Lời mời vào nhóm và cộng đồng</span>
                </div>
              </nav>
            ) : loading ? (
              <div className="loading-state">
                <p>Đang tải...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="empty-contacts">
                <p>Không tìm thấy liên hệ nào</p>
              </div>
            ) : (
            filteredContacts
                // bỏ qua các item không có tên hiển thị để tránh dòng trống
                .filter(contact => (contact.name || contact.participantName || contact.groupId?.name || contact.email))
                .map(contact => {
                  const displayName = contact.name || contact.participantName || contact.groupId?.name || contact.email || ''
                  const avatarUrl = contact.participantAvatar || contact.avatarUrl
                  const userId = contact.participantId || contact._id
                  const isGroup = contact.type === 'GROUP'
                  const userStatus = !isGroup && userId ? onlineStatus[String(userId)] : null
                  const isOnline = userStatus?.status === 'online'
                  const isConversation = !!contact.type || !!contact.participantId
                  const lastTime = isConversation
                    ? (contact.lastMessageAt || contact.lastMessage?.createdAt)
                    : null
                  const lastTimeText = lastTime ? formatRelative(lastTime) : ''
                  const unread = isConversation && contact.unreadCounts && user?._id
                    ? (contact.unreadCounts[String(user._id)] || 0)
                    : 0
                  const unreadText = unread > 99 ? '99+' : String(unread)
                  
                  return (
                    <div
                      key={contact._id || contact.participantId}
                      className={`contact-item ${selectedContact?._id === contact._id ? 'active' : ''}`}
                      onClick={() => handleContactClick(contact)}
                    >
                      <div 
                        className="avatar-wrapper"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (!isGroup && userId) {
                            openUserPopup(userId)
                          }
                        }}
                        style={{ cursor: !isGroup && userId ? 'pointer' : 'default' }}
                      >
                        <div className="avatar">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                        {!isGroup && userId && (
                          <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`}></span>
                        )}
                      </div>
                      <div className="contact-info">
                        <div className="contact-title-row">
                          <span className="name">
                            {displayName}
                          </span>
                          {(lastTimeText || unread > 0) && (
                            <div className="contact-meta-right">
                              {lastTimeText && (
                                <span className="contact-time">
                                  {lastTimeText}
                                </span>
                              )}
                              {unread > 0 && (
                                <span className="unread-badge">
                                  {unreadText}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="last-message">
                          {contact.lastMessage?.isRecalled
                            ? 'Tin nhắn đã được thu hồi'
                            : (contact.lastMessage?.content ||
                              (!isConversation ? (contact.email || '') : 'Không có tin nhắn'))}
                        </span>
                      </div>
                    </div>
                  )
                })
            )}
          </>
        ) : (
          <div className="contacts-panel-empty">
            <p>Chọn một option từ thanh bên để bắt đầu</p>
          </div>
        )}
        </div>
      )}

      {renderMainArea()}

      {/* User Profile Modal */}
      {showUserProfile && (
        <div className="profile-modal" onClick={() => setShowUserProfile(false)}>
          <div className="profile-content" onClick={(e) => e.stopPropagation()}>
            <div className="profile-header">
              <h3>Hồ sơ người dùng</h3>
              <button
                className="close-btn"
                onClick={() => setShowUserProfile(false)}
              >
                <MdClose />
              </button>
            </div>
            {error && <div className="error-message" style={{padding:'0 20px',color:'red',fontSize:'13px'}}>{error}</div>}

            <div
              className="profile-banner"
              onClick={handleBannerClick}
              title="Click để đổi banner"
            >
              {user?.bannerUrl ? (
                <img src={user.bannerUrl} alt="banner" />
              ) : (
                <span>Banner</span>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              ref={bannerInputRef}
              style={{ display: 'none' }}
              onChange={handleBannerUpload}
            />

            <div className="profile-body">
              <div className="profile-avatar-wrapper">
                <div
                  className="profile-avatar-large"
                  onClick={handleAvatarClick}
                  title="Click để đổi avatar"
                >
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="avatar" />
                  ) : (
                    (user?.name || 'U').charAt(0).toUpperCase()
                  )}
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                ref={avatarInputRef}
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />

              <div className="profile-info">
                {isEditingProfile ? (
                  <>
                    <div className="form-group">
                      <label>Họ tên</label>
                      <input
                        name="name"
                        value={profileForm.name}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Ngày sinh</label>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={profileForm.dateOfBirth}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Giới tính</label>
                      <input
                        name="gender"
                        value={profileForm.gender}
                        onChange={handleProfileChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>BIO</label>
                      <textarea
                        name="bio"
                        value={profileForm.bio}
                        onChange={handleProfileChange}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* ID được ẩn theo yêu cầu */}
                    <p>
                      <strong>Tên:</strong> {user?.name || 'Không có tên'}
                    </p>
                    <p>
                      <strong>Email:</strong> {user?.email || 'Không có email'}
                    </p>
                    <p>
                      <strong>Ngày sinh:</strong> {formatDate(user?.dateOfBirth) || 'dd/mm/yyyy'}
                    </p>
                    <p>
                      <strong>Giới tính:</strong> {user?.gender || 'Không có'}
                    </p>
                    <p>
                      <strong>BIO:</strong> {user?.bio || ''}
                    </p>
                  </>
                )}
                {!isEditingProfile && (
                  <button className="btn-edit" onClick={startEditProfile}>
                    <MdEdit />
                  </button>
                )}
              </div>
            </div>
            <div className="profile-footer">
              {isEditingProfile ? (
                <>
                  <button className="btn" onClick={saveProfile}>
                    Cập nhật
                  </button>
                  <button
                    className="btn btn-cancel"
                    onClick={() => setIsEditingProfile(false)}
                  >
                    Quay lại
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-cancel"
                    onClick={() => setShowUserProfile(false)}
                  >
                    Đóng
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>  {/* end home-container */}

      {/* popup when clicking on another user's avatar in chat */}
      {popupUser && (
        <div className="profile-modal" onClick={closePopup}>
          <div className="profile-content" onClick={e => e.stopPropagation()}>
            <div className="profile-header">
              <h3>Hồ sơ người dùng</h3>
              <button
                className="close-btn"
                onClick={closePopup}
              >
                <MdClose />
              </button>
            </div>

            <div
              className="profile-banner"
              title="Banner"
            >
              {popupUser?.bannerUrl ? (
                <img src={popupUser.bannerUrl} alt="banner" />
              ) : (
                <span>Banner</span>
              )}
            </div>

            <div className="profile-body">
              <div className="profile-avatar-wrapper">
                <div
                  className="profile-avatar-large"
                  title="Avatar"
                >
                  {popupUser?.avatarUrl ? (
                    <img src={popupUser.avatarUrl} alt="avatar" />
                  ) : (
                    (popupUser?.name || 'U').charAt(0).toUpperCase()
                  )}
                </div>
              </div>

              <div className="profile-info">
                <p>
                  <strong>Tên:</strong> {popupUser?.name || 'Không có tên'}
                </p>
                <p>
                  <strong>Email:</strong> {popupUser?.email || 'Không có email'}
                </p>
                <p>
                  <strong>Ngày sinh:</strong> {formatDate(popupUser?.dateOfBirth) || 'dd/mm/yyyy'}
                </p>
                <p>
                  <strong>Giới tính:</strong> {popupUser?.gender || 'Không có'}
                </p>
                <p>
                  <strong>BIO:</strong> {popupUser?.bio || ''}
                </p>
              </div>
            </div>
            <div className="profile-footer">
              <button
                className="btn btn-cancel"
                onClick={closePopup}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Friend Modal */}
      {showAddFriendModal && (
        <div className="profile-modal" onClick={resetAddFriendModal}>
          <div className="add-friend-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-header">
              <h3>Thêm bạn</h3>
              <button className="close-btn" onClick={resetAddFriendModal}><MdClose /></button>
            </div>
            <div className="add-friend-body">
              <div className="add-friend-search-row">
                <input
                  type="text"
                  className="add-friend-input"
                  placeholder="Nhập email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                />
                <button
                  className="add-friend-search-btn"
                  onClick={handleSearchUser}
                  disabled={searchLoading}
                >
                  {searchLoading ? 'Đang tìm...' : 'Tìm kiếm'}
                </button>
              </div>
              {error && <div className="error-message" style={{ padding: '4px 0', color: 'red', fontSize: 13 }}>{error}</div>}
              <div className="add-friend-results-label">Kết quả gần nhất</div>
              {searchResults.length === 0 ? (
                <div className="add-friend-empty">
                  <p>Chưa có kết quả</p>
                  <button className="add-friend-search-btn-ghost" onClick={handleSearchUser}>Tìm kiếm</button>
                </div>
              ) : (
                searchResults.map(u => (
                  <div key={u._id} className="add-friend-result-item">
                    <div className="add-friend-avatar">
                      {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} /> : (u.name?.charAt(0).toUpperCase() || 'U')}
                    </div>
                    <div className="add-friend-info">
                      <span className="add-friend-name">{u.name}</span>
                      <span className="add-friend-email">{u.email}</span>
                    </div>
                    <div className="add-friend-action">
                      {u.isSelf ? (
                        <span className="add-friend-tag">Bạn</span>
                      ) : friends.some(f => String(f._id) === String(u._id)) ? (
                        <span className="add-friend-tag">Bạn bè</span>
                      ) : sentRequests.some(r => String(r.toUserId?._id || r.toUserId) === String(u._id)) ? (
                        <span className="add-friend-tag">Đã gửi</span>
                      ) : friendRequests.some(r => String(r.fromUserId?._id || r.fromUserId) === String(u._id)) ? (
                        <button className="fr-btn-accept" onClick={() => handleAcceptRequest(u._id)}>Đồng ý</button>
                      ) : (
                        <button className="fr-btn-accept" onClick={() => handleSendRequestFromModal(u._id, u.name)}>Kết bạn</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send Request Confirmation Modal */}
      {showSendRequestModal && selectedUserToAdd && (
        <div className="profile-modal" onClick={() => setShowSendRequestModal(false)}>
          <div className="add-friend-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-header">
              <h3>Gửi lời mời kết bạn</h3>
              <button className="close-btn" onClick={() => setShowSendRequestModal(false)}><MdClose /></button>
            </div>
            <div className="add-friend-body">
              <p style={{ marginBottom: 8 }}>Gửi lời mời đến <strong>{selectedUserToAdd.name}</strong></p>
              <textarea
                className="add-friend-input"
                style={{ resize: 'none', height: 80, width: '100%', boxSizing: 'border-box' }}
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-cancel" style={{ flex: 1 }} onClick={() => setShowSendRequestModal(false)}>Hủy</button>
                <button className="fr-btn-accept" style={{ flex: 1 }} onClick={confirmSendRequest}>Gửi</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            {error && <div className="error-message" style={{padding:'0 20px',color:'red',fontSize:'13px'}}>{error}</div>}
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
                <button className="btn" onClick={submitPasswordChange}>
                  Đổi mật khẩu
                </button>
                <button
                  className="btn btn-cancel"
                  onClick={() => setShowChangePassword(false)}
                >
                  Quay lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddMembersModal && (
        <div className="profile-modal" onClick={() => setShowAddMembersModal(false)}>
          <div className="profile-popup" style={{ maxHeight: '90vh', width: '480px', maxWidth: '95vw', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="profile-header">
              <h2>Thêm thành viên vào nhóm</h2>
              <MdClose className="close-icon" onClick={() => setShowAddMembersModal(false)} />
            </div>
            <div className="profile-content" style={{ padding: '20px', overflowY: 'auto', flex: 1, width: '100%', maxWidth: 'none', boxSizing: 'border-box', borderRadius: 0, boxShadow: 'none' }}>
              {(() => {
                const inGroupIds = new Set((selectedContact?.participants || []).map(p => String(p.userId?._id || p._id)))
                const candidates = friends.filter(f => !inGroupIds.has(String(f._id)))

                if (candidates.length === 0) {
                  return <p style={{ color: '#666' }}>Không còn bạn bè nào để thêm vào nhóm.</p>
                }

                return (
                  <div style={{ border: '1px solid #ddd', borderRadius: '8px', maxHeight: '340px', overflowY: 'auto', padding: '10px' }}>
                    {candidates.map(friend => (
                      <div
                        key={friend._id}
                        style={{ display: 'flex', alignItems: 'center', padding: '10px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedMembersToAdd(prev =>
                            prev.includes(friend._id)
                              ? prev.filter(id => id !== friend._id)
                              : [...prev, friend._id]
                          )
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembersToAdd.includes(friend._id)}
                          onChange={() => {}}
                          style={{ marginRight: '10px', cursor: 'pointer' }}
                        />
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#003399', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginRight: '10px', flexShrink: 0, overflow: 'hidden' }}>
                          {friend.avatarUrl ? (
                            <img src={friend.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            friend.name?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                        <span>{friend.name}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  onClick={handleAddMembersToGroup}
                  disabled={groupActionLoading}
                  style={{ flex: 1, padding: '10px 20px', backgroundColor: '#003399', color: 'white', border: 'none', borderRadius: '8px', cursor: groupActionLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px', opacity: groupActionLoading ? 0.7 : 1 }}
                >
                  {groupActionLoading ? 'Đang thêm...' : 'Thêm thành viên'}
                </button>
                <button
                  onClick={() => setShowAddMembersModal(false)}
                  style={{ flex: 1, padding: '10px 20px', backgroundColor: '#e8e8e8', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                >
                  Huỷ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTransferOwnerModal && (
        <div className="profile-modal" onClick={() => setShowTransferOwnerModal(false)}>
          <div className="profile-popup" style={{ maxWidth: '560px', width: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="profile-header">
              <h2>Chuyển quyền và rời nhóm</h2>
              <MdClose className="close-icon" onClick={() => setShowTransferOwnerModal(false)} />
            </div>
            <div className="profile-content" style={{ padding: '24px', width: '100%', maxWidth: 'none', boxSizing: 'border-box', borderRadius: 0, boxShadow: 'none' }}>
              <p style={{ margin: '0 0 12px', color: '#666', fontSize: '16px' }}>Chọn thành viên sẽ trở thành trưởng nhóm mới.</p>
              <div style={{ border: '1px solid #ddd', borderRadius: '12px', maxHeight: '280px', overflowY: 'auto', padding: '8px 12px' }}>
                {(selectedContact?.participants || [])
                  .filter(p => String(p.userId?._id || p._id) !== String(user?._id))
                  .map(p => {
                    const userId = p.userId?._id || p._id
                    const userName = p.userId?.name || p.name || 'User'
                    return (
                      <label key={userId} style={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '56px', padding: '8px 6px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}>
                        <input
                          type="radio"
                          name="transferOwner"
                          value={userId}
                          checked={String(transferTargetUserId) === String(userId)}
                          onChange={() => setTransferTargetUserId(userId)}
                        />
                        <span style={{ fontSize: '16px', lineHeight: 1.1 }}>{userName}</span>
                      </label>
                    )
                  })}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '18px' }}>
                <button
                  onClick={handleTransferOwnerAndLeave}
                  disabled={groupActionLoading || !transferTargetUserId}
                  style={{ flex: 1, minHeight: '50px', padding: '0 16px', backgroundColor: '#003399', color: 'white', border: 'none', borderRadius: '12px', cursor: groupActionLoading || !transferTargetUserId ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '16px', whiteSpace: 'nowrap', opacity: groupActionLoading || !transferTargetUserId ? 0.7 : 1 }}
                >
                  {groupActionLoading ? 'Đang xử lý...' : 'Chuyển quyền & Rời nhóm'}
                </button>
                <button
                  onClick={() => setShowTransferOwnerModal(false)}
                  style={{ flex: 1, minHeight: '50px', padding: '0 16px', backgroundColor: '#e8e8e8', color: '#333', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '16px' }}
                >
                  Huỷ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Group Modal */}
      {showRenameModal && (
        <div className="profile-modal" onClick={() => setShowRenameModal(false)}>
          <div className="profile-popup" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="profile-header">
              <h2>Đổi tên nhóm</h2>
              <MdClose className="close-icon" onClick={() => setShowRenameModal(false)} />
            </div>
            <div className="profile-content" style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Tên nhóm mới</label>
                <input
                  type="text"
                  placeholder="Nhập tên nhóm mới"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitRename()}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleSubmitRename}
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    backgroundColor: '#003399',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Lưu
                </button>
                <button
                  onClick={() => setShowRenameModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    backgroundColor: '#e8e8e8',
                    color: '#333',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Huỷ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="profile-modal" onClick={() => setShowCreateGroupModal(false)}>
          <div className="profile-popup" style={{ maxHeight: '90vh', width: '480px', maxWidth: '95vw', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="profile-header">
              <h2>Tạo nhóm chat</h2>
              <MdClose className="close-icon" onClick={() => setShowCreateGroupModal(false)} />
            </div>
            <div className="profile-content" style={{ padding: '20px', overflowY: 'auto', flex: 1, width: '100%', maxWidth: 'none', boxSizing: 'border-box', borderRadius: 0, boxShadow: 'none' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Tên nhóm</label>
                <input
                  type="text"
                  placeholder="Nhập tên nhóm"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Chọn bạn bè ({selectedFriendsForGroup.length})</label>
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '10px'
                }}>
                  {friends.length === 0 ? (
                    <p style={{ color: '#999' }}>Bạn chưa có bạn bè. Vui lòng thêm bạn bè trước.</p>
                  ) : (
                    friends.map(friend => (
                      <div
                        key={friend._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '10px',
                          borderBottom: '1px solid #f0f0f0',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setSelectedFriendsForGroup(prev =>
                            prev.includes(friend._id)
                              ? prev.filter(id => id !== friend._id)
                              : [...prev, friend._id]
                          )
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFriendsForGroup.includes(friend._id)}
                          onChange={() => {}}
                          style={{ marginRight: '10px', cursor: 'pointer' }}
                        />
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: '#003399',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          marginRight: '10px',
                          flexShrink: 0,
                          overflow: 'hidden'
                        }}>
                          {friend.avatarUrl ? (
                            <img src={friend.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            friend.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span>{friend.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleCreateGroup}
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    backgroundColor: '#003399',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                >
                  Tạo nhóm
                </button>
                <button
                  onClick={() => setShowCreateGroupModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px 20px',
                    backgroundColor: '#e8e8e8',
                    color: '#333',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px'
                  }}
                >
                  Huỷ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showJoinGroupModal && (
        <div className="profile-modal" onClick={() => setShowJoinGroupModal(false)}>
          <div className="profile-popup" style={{ width: '420px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="profile-header">
              <h2>Tham gia nhóm bằng mã</h2>
              <MdClose className="close-icon" onClick={() => setShowJoinGroupModal(false)} />
            </div>
            <div className="profile-content" style={{ padding: '20px', width: '100%', maxWidth: 'none', boxSizing: 'border-box', borderRadius: 0, boxShadow: 'none' }}>
              <p style={{ color: '#555', marginBottom: '14px', fontSize: '14px' }}>Nhập mã mời để tham gia vào nhóm chat.</p>
              <input
                type="text"
                placeholder="Nhập mã nhóm..."
                value={joinGroupCode}
                onChange={e => setJoinGroupCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !joinGroupLoading && joinGroupCode.trim() && (async () => {
                  setJoinGroupLoading(true)
                  try {
                    const conv = await conversationService.joinByInvite(joinGroupCode.trim())
                    setShowJoinGroupModal(false)
                    await loadConversations()
                    if (conv?.conversation) setSelectedContact(conv.conversation)
                  } catch (err) {
                    setError(err.message || 'Mã nhóm không hợp lệ hoặc đã hết hạn.')
                  } finally {
                    setJoinGroupLoading(false)
                  }
                })()}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', marginBottom: '16px' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={async () => {
                    if (!joinGroupCode.trim() || joinGroupLoading) return
                    setJoinGroupLoading(true)
                    try {
                      const conv = await conversationService.joinByInvite(joinGroupCode.trim())
                      setShowJoinGroupModal(false)
                      await loadConversations()
                      if (conv?.conversation) setSelectedContact(conv.conversation)
                    } catch (err) {
                      setError(err.message || 'Mã nhóm không hợp lệ hoặc đã hết hạn.')
                    } finally {
                      setJoinGroupLoading(false)
                    }
                  }}
                  disabled={!joinGroupCode.trim() || joinGroupLoading}
                  style={{ flex: 1, padding: '10px', backgroundColor: joinGroupCode.trim() && !joinGroupLoading ? '#003399' : '#b0b8d1', color: 'white', border: 'none', borderRadius: '8px', cursor: joinGroupCode.trim() && !joinGroupLoading ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '14px' }}
                >
                  {joinGroupLoading ? 'Đang tham gia...' : 'Tham gia'}
                </button>
                <button
                  onClick={() => setShowJoinGroupModal(false)}
                  style={{ flex: 1, padding: '10px', backgroundColor: '#e8e8e8', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                >
                  Huỷ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInviteCodeModal && (
        <div className="profile-modal" onClick={() => setShowInviteCodeModal(false)}>
          <div className="profile-popup" style={{ width: '460px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="profile-header">
              <h2>Link mời nhóm</h2>
              <MdClose className="close-icon" onClick={() => setShowInviteCodeModal(false)} />
            </div>
            <div className="profile-content" style={{ padding: '18px', width: '100%', maxWidth: 'none', boxSizing: 'border-box', borderRadius: 0, boxShadow: 'none' }}>
              <p style={{ margin: '0 0 14px', color: '#8a97a8', fontSize: '14px' }}>Chia sẻ mã này để ai cũng có thể tham gia nhóm</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#eff2f6', borderRadius: '10px', padding: '10px' }}>
                <div style={{ flex: 1, fontSize: '22px', fontWeight: 700, letterSpacing: '1px', color: '#1f2a3d', wordBreak: 'break-all' }}>
                  {inviteCode}
                </div>
                <button
                  onClick={handleCopyInviteCode}
                  style={{ minWidth: '98px', height: '42px', border: 'none', borderRadius: '10px', background: copyInviteSuccess ? '#18a957' : '#2f67d8', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {copyInviteSuccess ? 'Đã chép' : 'Sao chép'}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                <button
                  onClick={() => setShowInviteCodeModal(false)}
                  style={{ width: '94px', height: '40px', border: '1px solid #d7dee9', borderRadius: '10px', background: '#f7f9fc', color: '#7d8796', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    
    </>
  )
}

export default Home
