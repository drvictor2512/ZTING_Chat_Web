import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdChat, MdPeople, MdSmartToy, MdSettings, MdPerson, MdPersonAdd, MdLink, MdLogout, MdEdit, MdClose, MdMenu, MdBlock } from 'react-icons/md'
import authService from '../services/authService'
import conversationService from '../services/conversationService'
import friendService from '../services/friendService'
import userService from '../services/userService'
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
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', dateOfBirth: '', gender: '', bio: '' })
  const avatarInputRef = useRef(null)
  const bannerInputRef = useRef(null)
  const [selectedContact, setSelectedContact] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState([])
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
    }
    loadBlockedUsers()
  }, [navigate])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Update filtered contacts based on search term and current view
  useEffect(() => {
    if (currentView === 'chat') {
      const filtered = conversations.filter(conv =>
        conv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (conv.participantName && conv.participantName.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredContacts(filtered)
    } else if (currentView === 'friends') {
      const filtered = friends.filter(friend =>
        friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        friend.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredContacts(filtered)
    }
  }, [searchTerm, currentView, conversations, friends])

  // Load conversations
  const loadConversations = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await conversationService.getConversations()
      let convs = res.conversations || []
      // attach helper fields for easy display and friend operations
      convs = convs.map(c => {
        // find other participant (not current user)
        let participantId = null
        let participantName = ''
        if (c.participants && c.participants.length === 2) {
          const other = c.participants.find(p => p._id !== user?._id)
          if (other) {
            participantId = other._id
            participantName = other.name
          }
        }
        return {
          ...c,
          participantId,
          participantName,
          // ensure name falls back to participant name for direct chats
          name: c.name || participantName
        }
      })
      setConversations(convs)
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
    // if clicked item is a simple friend (no participantId) attempt to find or create a convo
    if (!contact.participantId) {
      // try find existing conversation with that participant
      convo = conversations.find(c => c.participantId === contact._id);
      if (!convo) {
        // create new direct conversation
        try {
          await conversationService.createConversation({ type: 'DIRECT', memberIds: [contact._id] });
          await loadConversations();
          convo = conversations.find(c => c.participantId === contact._id) || { _id: null, participantId: contact._id, participantName: contact.name, name: contact.name };
        } catch (e) {
          console.error('Failed to create conversation', e);
          convo = { _id: null, participantId: contact._id, participantName: contact.name, name: contact.name };
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

  const handleRenameGroup = async () => {
    if (!selectedContact) return
    const newName = prompt('Nhập tên mới cho nhóm', selectedContact.name || '')
    if (!newName) return
    try {
      await conversationService.renameGroup(selectedContact._id, newName)
      await loadConversations()
      setSelectedContact(prev => ({ ...prev, name: newName }))
    } catch (err) {
      console.error('rename failed', err)
      setError('Không đổi tên nhóm được')
    }
  }

  const handleDeleteGroup = async () => {
    if (!selectedContact) return
    if (!window.confirm('Bạn có chắc muốn xoá nhóm? Hành động này không thể hoàn tác.')) return
    try {
      await conversationService.deleteGroup(selectedContact._id)
      await loadConversations()
      setSelectedContact(null)
    } catch (err) {
      console.error('delete group failed', err)
      setError('Không thể xoá nhóm')
    }
  }

  // send a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return
    try {
      const convoId = selectedContact._id
      let payload = { content: newMessage }
      if (convoId) {
        payload.conversationId = convoId
      } else {
        // send by recipient id for new convo
        payload.recipientId = selectedContact.participantId || selectedContact._id
      }
      const res = await conversationService.sendMessage(payload)
      // append to list
      const msg = res.message || res
      setMessages(prev => [...prev, msg])
      // if conversation was just created, update selected contact id
      if (!convoId && msg.conversationId) {
        setSelectedContact(prev => ({ ...prev, _id: msg.conversationId }))
        // also reload conversations so sidebar gets new convo
        await loadConversations()
      }
      setNewMessage('')
    } catch (err) {
      console.error('Lỗi khi gửi tin nhắn', err)
      setError('Không thể gửi tin nhắn')
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

  // helper to format a date/time string
  const formatTime = (isoString) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  // relative time (minutes/hours ago)
  const formatRelative = (isoString) => {
    try {
      const diff = Date.now() - new Date(isoString).getTime()
      const mins = Math.floor(diff / 60000)
      if (mins < 1) return 'vừa xong'
      if (mins < 60) return `${mins} phút trước`
      const hrs = Math.floor(mins / 60)
      return `${hrs} giờ trước`
    } catch {
      return ''
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
                    <h2>{selectedContact.name || selectedContact.participantName}</h2>
                    <MdMenu className="info-toggle" onClick={() => setShowInfoPanel(v => !v)} title="Chi tiết" />
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
                      messages.map(msg => {
                        const isMine = String(msg.senderId?._id || msg.senderId) === String(user?._id)
                        return (
                          <div
                            key={msg._id || msg.id || Math.random()}
                            className={`message-item ${isMine ? 'sent' : 'received'}`}
                          >
                            <span className="message-content">{msg.content}</span>
                            {msg.createdAt && (
                              <span className="message-time">{formatTime(msg.createdAt)}</span>
                            )}
                          </div>
                        )
                      })
                    )}
                  <div ref={messagesEndRef} />
                  </div>
                  <div className="chat-input">
                    <input
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Nhập tin nhắn..."
                      onKeyDown={e => { if (e.key === 'Enter') handleSendMessage() }}
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
                            <h4>Thành viên</h4>
                            {selectedContact.participants?.map(p => (
                              <div className="member-item" key={p.userId?._id || p.userId}>
                                <span className="member-name">{p.userId?.name || '...'}</span>
                                <span className="member-role">{p.role}</span>
                              </div>
                            ))}
                          </div>
                          <div className="info-section">
                            <h4>Ảnh/Video</h4>
                          </div>
                          <div className="info-section">
                            <h4>File</h4>
                          </div>
                          <button className="btn-danger" onClick={handleDeleteGroup}>Xóa nhóm</button>
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
                    {filteredContacts.map(friend => (
                      <div key={friend._id} className="friend-card">
                        <div className="friend-avatar"></div>
                        <div className="friend-info">
                          <span className="name">{friend.name}</span>
                          <span className="status">Đang hoạt động</span>
                        </div>
                        <button
                          className="btn-unfriend"
                          onClick={() => handleUnfriend(friend._id)}
                        >
                          Huỷ
                        </button>
                      </div>
                    ))}
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
                  placeholder="Tìm kiếm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="contacts-icon-group">
                <div className="icon" title="Hồ sơ" onClick={openProfile}>
                  <MdPerson />
                </div>
                <div className="icon" title="Thêm bạn" onClick={async () => {
                    const email = prompt('Nhập email người dùng để gửi yêu cầu kết bạn');
                    if (!email) return;
                    try {
                      const res = await userService.searchUserByEmail(email.trim());
                      const found = res.user || res;
                      if (found && found._id) {
                        await handleSendRequest(found._id);
                      } else {
                        setError('Không tìm thấy người dùng với email đã nhập');
                      }
                    } catch (err) {
                      console.error(err);
                      setError(err.message || 'Không tìm thấy người dùng với email đã nhập');
                    }
                  }}>
                  <MdPersonAdd />
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
              filteredContacts.map(contact => (
                <div
                  key={contact._id}
                  className={`contact-item ${selectedContact?._id === contact._id ? 'active' : ''}`}
                  onClick={() => handleContactClick(contact)}
                >
                  <div className="avatar">
                    {(contact.name || contact.participantName)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="contact-info">
                    <span className="name">
                      {contact.name || contact.participantName}
                    </span>
                    <span className="last-message">
                      {contact.lastMessage?.content || 'Không có tin nhắn'}
                    </span>
                  </div>
                </div>
              ))
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
    </>
  )
}

export default Home
