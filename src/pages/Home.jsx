import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdChat, MdPeople, MdSmartToy, MdSettings, MdPerson, MdPersonAdd, MdLink, MdLogout, MdEdit, MdClose, MdMenu, MdBlock, MdEmojiEmotions, MdAttachFile } from 'react-icons/md'
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
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState([])
  const [onlineStatus, setOnlineStatus] = useState({}) // { userId: { status: 'online'|'offline', lastSeen: timestamp } }
  const messagesEndRef = useRef(null)

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
      setConversations(convs.filter(Boolean))
    } catch (err) {
      setError('Không thể tải cuộc trò chuyện')
      console.error(err)
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
    setSelectedContact(convo)
    if (currentView !== 'chat') {
      setCurrentView('chat')
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
      loadMessages(selectedContact._id)
    } else {
      setMessages([])
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
      alert('Link mời: ' + res.link)
    } catch (err) {
      console.error('cannot get invite link', err)
      setError('Không tạo được link mời')
    }
  }

  const handleRenameGroup = () => {
    if (!selectedContact) return
    setNewGroupName(selectedContact.name || '')
    setShowRenameModal(true)
  }
  
  const handleSubmitRename = async () => {
    if (!newGroupName.trim()) {
      setError('Vui lòng nhập tên nhóm')
      return
    }
    try {
      await conversationService.renameGroup(selectedContact._id, newGroupName.trim())
      await loadConversations()
      setSelectedContact(prev => ({ ...prev, name: newGroupName.trim() }))
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef(null)
  
  // Create group modal
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [selectedFriendsForGroup, setSelectedFriendsForGroup] = useState([])
  const [groupName, setGroupName] = useState('')
  
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

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !pendingFile) || !selectedContact) return
    if (!newMessage.trim() && !pendingFile) {
      setError('Nhập nội dung hoặc chọn file')
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
      if (fileInputRef2.current) fileInputRef2.current.value = ''
      
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
      setError(err.message || 'Không thể gửi tin nhắn')
    }
  }

  // Handle accept friend request
  const handleAcceptRequest = async (requestId) => {
    try {
      await friendService.acceptFriendRequest(requestId)
      await loadFriendRequests()
      await loadFriends()
    } catch (err) {
      setError('Không thể chấp nhận yêu cầu kết bạn')
    }
  }

  // Handle decline friend request
  const handleDeclineRequest = async (requestId) => {
    try {
      await friendService.declineFriendRequest(requestId)
      await loadFriendRequests()
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

  // Unfriend someone
  const handleUnfriend = async (userId) => {
    try {
      await friendService.unfriend(userId)
      await loadFriends()
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
                  <div className="chat-header">
                    <div className="chat-header-left">
                      <div className="chat-avatar-wrapper">
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
                        {selectedContact.lastMessageAt && (
                          <p className="chat-status">{formatRelative(selectedContact.lastMessageAt)}</p>
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
                        messages.forEach((msg, idx) => {
                          const isMine = String(msg.senderId?._id || msg.senderId) === String(user?._id)
                          const prevMsg = idx > 0 ? messages[idx - 1] : null
                          const prevIsMine = prevMsg ? String(prevMsg.senderId?._id || prevMsg.senderId) === String(user?._id) : null
                          const isPrevSameSender = prevMsg && String(prevMsg.senderId?._id || prevMsg.senderId) === String(msg.senderId?._id || msg.senderId) && prevIsMine === isMine
                          
                          if (!isPrevSameSender) {
                            groups.push({
                              senderId: msg.senderId?._id || msg.senderId,
                              senderName: msg.senderId?.name,
                              senderAvatar: msg.senderId?.avatarUrl,
                              isMine,
                              messages: [msg],
                              createdAt: msg.createdAt
                            })
                          } else {
                            groups[groups.length - 1].messages.push(msg)
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
                                              <img src={msg.fileUrl} alt="gif" className="message-image" style={{ cursor: 'zoom-in', maxWidth: '300px', borderRadius: '8px' }} onClick={() => window.open(msg.fileUrl, '_blank')} />
                                            ) : isImageUrl(msg.fileUrl) ? (
                                              <img src={msg.fileUrl} alt="attachment" className="message-image" style={{ cursor: 'zoom-in', maxWidth: '300px', borderRadius: '8px' }} onClick={() => window.open(msg.fileUrl, '_blank')} />
                                            ) : isVideoUrl(msg.fileUrl) ? (
                                              <video controls className="message-video" style={{ maxWidth: '300px', borderRadius: '8px' }}><source src={msg.fileUrl} /></video>
                                            ) : (
                                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span className="message-file">📎 {basenameFromUrl(msg.fileUrl)}</span>
                                                <button onClick={() => downloadFile(msg.fileUrl, basenameFromUrl(msg.fileUrl))} title="Tải về" style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: 0 }}>⬇</button>
                                              </div>
                                            )}
                                            {msg.content && <div style={{ marginTop: 4 }}>{msg.content}</div>}
                                          </>
                                        ) : isGifUrl(msg.content) ? (
                                          <img src={msg.content} alt="gif" className="message-image" style={{ cursor: 'zoom-in', maxWidth: '300px', borderRadius: '8px' }} onClick={() => window.open(msg.content, '_blank')} />
                                        ) : isImageUrl(msg.content) ? (
                                          <img src={msg.content} alt="image" className="message-image" style={{ cursor: 'zoom-in', maxWidth: '300px', borderRadius: '8px' }} onClick={() => window.open(msg.content, '_blank')} />
                                        ) : isVideoUrl(msg.content) ? (
                                          <video controls className="message-video" style={{ maxWidth: '300px', borderRadius: '8px' }}><source src={msg.content} /></video>
                                        ) : isDocumentUrl(msg.content) ? (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className="message-file">📎 {basenameFromUrl(msg.content)}</span>
                                            <button onClick={() => downloadFile(msg.content, basenameFromUrl(msg.content))} title="Tải về" style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: 0 }}>⬇</button>
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
                  <div className="chat-input">
                    {pendingFile && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '4px 8px', background: '#f1f5f9', borderRadius: 8, width: '100%' }}>
                        <span style={{ fontSize: 13, color: '#334155' }}>📎 {pendingFile.name}</span>
                        <button 
                          onClick={() => { 
                            setPendingFile(null)
                            if (fileInputRef2.current) fileInputRef2.current.value = ''
                          }} 
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16, lineHeight: 1, marginLeft: 'auto' }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
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
                      accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    <button className="icon-btn attach-btn" onClick={() => fileInputRef2.current?.click()} title="Đính kèm">
                      <MdAttachFile />
                    </button>
                    <input
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Nhập tin nhắn..."
                      onKeyDown={async e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          if (!newMessage.trim() && !pendingFile) return
                          await handleSendMessage()
                        }
                      }}
                    />
                    <button onClick={handleSendMessage}>Gửi</button>
                  </div>
                </div>
                {showInfoPanel && selectedContact && (
                  <div className="info-panel">
                    {selectedContact.type === 'GROUP' ? (
                      <>
                        <div className="info-header">
                          <div className="avatar-large">
                            {(selectedContact.name || '').charAt(0).toUpperCase()}
                          </div>
                          <h3>{selectedContact.name}</h3>
                          <p>{selectedContact.participants?.length || 0} thành viên</p>
                          <div className="group-actions">
                            <MdLink className="action-icon" title="Link mới" onClick={handleGetInviteLink} />
                            <MdEdit className="action-icon" title="Đổi tên nhóm" onClick={handleRenameGroup} />
                          </div>
                        </div>
                        <div className="info-body">
                          <div className="info-section members">
                            <h4>Thành viên ({selectedContact.participants?.length || 0})</h4>
                            {selectedContact.participants?.map(p => {
                              const userId = p.userId?._id || p._id
                              const userName = p.userId?.name || p.name || 'User'
                              const role = p.role || 'Thành viên'
                              return (
                                <div className="member-item" key={userId}>
                                  <span className="member-name">{userName}</span>
                                  <span className="member-role">{role}</span>
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
                          {(() => {
                            const me = selectedContact.participants?.find(p => String(p._id) === String(user?._id))
                            const isOwner = me?.role === 'Trưởng nhóm'
                            return isOwner ? (
                              <button className="btn-danger" onClick={handleDeleteGroup}>Xóa nhóm</button>
                            ) : (
                              <button className="btn-danger" onClick={handleLeaveGroup}>Rời nhóm</button>
                            )
                          })()}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="info-header">
                          <div className="avatar-large">
                            {(selectedContact.participantName || selectedContact.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <h3>{selectedContact.participantName || selectedContact.name}</h3>
                          {selectedContact.lastMessageAt && (
                            <p className="info-status">{formatRelative(selectedContact.lastMessageAt)}</p>
                          )}
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
            <div className="friends-container">
              {friendRequests.length > 0 && (
                <div className="friend-requests-section">
                  <h3>Yêu cầu kết bạn ({friendRequests.length})</h3>
                  <div className="requests-list">
                    {friendRequests.map(request => (
                      <div key={request._id} className="friend-request-item">
                        <div className="request-info">
                          <span className="name">{request.fromUserId?.name}</span>
                          <span className="email">{request.fromUserId?.email}</span>
                        </div>
                        <div className="request-actions">
                          <button
                            className="btn-accept"
                            onClick={() => handleAcceptRequest(request._id)}
                          >
                            Chấp nhận
                          </button>
                          <button
                            className="btn-decline"
                            onClick={() => handleDeclineRequest(request._id)}
                          >
                            Từ chối
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sentRequests.length > 0 && (
                <div className="friend-requests-section">
                  <h3>Đã gửi ({sentRequests.length})</h3>
                  <div className="requests-list">
                    {sentRequests.map(request => (
                      <div key={request._id} className="friend-request-item">
                        <div className="request-info">
                          <span className="name">{request.toUserId?.name}</span>
                          <span className="email">{request.toUserId?.email}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {friends.length > 0 && (
                <div className="friends-list-section">
                  <h3>Danh sách bạn ({friends.length})</h3>
                  <div className="friends-grid">
                    {filteredContacts.map(contact => {
                      if (contact.searchResult) {
                        // result from global email search, not yet a friend
                        return (
                          <div key={contact._id} className="friend-card search-result">
                            <div className="friend-avatar"></div>
                            <div className="friend-info">
                              <span className="name">{contact.name || 'Không tên'}</span>
                              <span className="email">{contact.email}</span>
                            </div>
                            <button className="btn" onClick={() => handleSendRequest(contact._id)}>
                              Kết bạn
                            </button>
                          </div>
                        )
                      }
                      // existing friend card
                      return (
                        <div key={contact._id} className="friend-card">
                          <div className="friend-avatar"></div>
                          <div className="friend-info">
                            <span className="name">{contact.name}</span>
                            <span className="status">Đang hoạt động</span>
                          </div>
                          <button
                            className="btn-unfriend"
                            onClick={() => handleUnfriend(contact._id)}
                          >
                            Huỷ
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {friends.length === 0 && friendRequests.length === 0 && (
                <div className="empty-state">
                  <p>Chưa có bạn nào. Tìm bạn để kết nối!</p>
                </div>
              )}
            </div>
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
          title="Bạn bè"
        >
          <MdPeople />
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
                <div className="icon" title="Hồ sơ" onClick={openProfile}>
                  <MdPerson />
                </div>
                <div className="icon" title="Tạo nhóm" onClick={() => setShowCreateGroupModal(true)}>
                  <MdPeople />
                </div>
                <div className="icon" title="Tham gia group">
                  <MdLink />
                </div>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
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
                        <span className="name">
                          {displayName}
                        </span>
                        <span className="last-message">
                          {contact.lastMessage?.content || 'Không có tin nhắn'}
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
          <div className="profile-popup" style={{ maxHeight: '90vh', minWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="profile-header">
              <h2>Tạo nhóm chat</h2>
              <MdClose className="close-icon" onClick={() => setShowCreateGroupModal(false)} />
            </div>
            <div className="profile-content" style={{ padding: '20px' }}>
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
    </>
  )
}

export default Home
