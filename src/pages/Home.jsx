import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdChat, MdPeople, MdSmartToy, MdSettings, MdPerson, MdPersonAdd, MdLink, MdLogout, MdEdit, MdClose } from 'react-icons/md'
import authService from '../services/authService'
import conversationService from '../services/conversationService'
import friendService from '../services/friendService'
import userService from '../services/userService'
import '../styles/home.css'

const Home = () => {
  const navigate = useNavigate()
  const user = authService.getCurrentUser()

  // Views: 'chat', 'friends', 'ai', 'settings'
  const [currentView, setCurrentView] = useState('chat')
  const [conversations, setConversations] = useState([])
  const [friends, setFriends] = useState([])
  const [friendRequests, setFriendRequests] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredContacts, setFilteredContacts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)

  // Check authentication
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login')
    }
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
      const data = await conversationService.getConversations()
      setConversations(data.data || [])
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
      const data = await friendService.getAllFriends()
      setFriends(data.data || [])
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
      const data = await friendService.getFriendRequests()
      setFriendRequests(data.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  // Handle view change
  const handleViewChange = async (view) => {
    setCurrentView(view)
    setSearchTerm('')
    setSelectedContact(null)

    if (view === 'friends' && friends.length === 0) {
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

  // Handle contact click
  const handleContactClick = (contact) => {
    setSelectedContact(contact)
    // TODO: Navigate to chat view or open chat window
  }

  // Handle accept friend request
  const handleAcceptRequest = async (requestId) => {
    try {
      await friendService.acceptFriendRequest(requestId)
      loadFriendRequests()
      loadFriends()
    } catch (err) {
      setError('Không thể chấp nhận yêu cầu kết bạn')
    }
  }

  // Handle decline friend request
  const handleDeclineRequest = async (requestId) => {
    try {
      await friendService.declineFriendRequest(requestId)
      loadFriendRequests()
    } catch (err) {
      setError('Không thể từ chối yêu cầu kết bạn')
    }
  }

  // Render main area based on current view
  const renderMainArea = () => {
    switch (currentView) {
      case 'chat':
        return (
          <div className="main-area">
            {conversations.length === 0 ? (
              <>
                <h1>CHÀO MỪNG ĐẾN VỚI ZTING</h1>
                <p>Giao tiếp không khoảng cách, kết nối không giới hạn</p>
              </>
            ) : selectedContact ? (
              <>
                <div className="chat-header">
                  <h2>{selectedContact.name || selectedContact.participantName}</h2>
                </div>
                <div className="chat-messages">
                  <p>Chọn một cuộc trò chuyện để bắt đầu</p>
                </div>
              </>
            ) : (
              <>
                <h1>CHÀO MỪNG ĐẾN VỚI ZTING</h1>
                <p>Giao tiếp không khoảng cách, kết nối không giới hạn</p>
              </>
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
                          <span className="name">{request.senderId.name}</span>
                          <span className="email">{request.senderId.email}</span>
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
                  <h3>Tài khoản</h3>
                  <div className="settings-item">
                    <label>Tên người dùng:</label>
                    <span>{user?.name || 'Không có tên'}</span>
                  </div>
                  <div className="settings-item">
                    <label>Email:</label>
                    <span>{user?.email || 'Không có email'}</span>
                  </div>
                  <button className="btn-edit">
                    <MdEdit /> Chỉnh sửa hồ sơ
                  </button>
                </div>

                <div className="settings-section">
                  <h3>Bảo mật</h3>
                  <div className="settings-item">
                    <button className="btn-danger">Đổi mật khẩu</button>
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
    <div className="home-container">
      <div className="sidebar">
        <div
          className="avatar user-avatar"
          onClick={() => setShowUserProfile(!showUserProfile)}
          title="Hồ sơ người dùng"
        >
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
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
                {currentView === 'chat' && (
                  <>
                    <div className="icon" title="Hồ sơ">
                      <MdPerson />
                    </div>
                    <div className="icon" title="Thêm bạn">
                      <MdPersonAdd />
                    </div>
                    <div className="icon" title="Tham gia group">
                      <MdLink />
                    </div>
                  </>
                )}
                {currentView === 'friends' && (
                  <div className="icon" title="Thêm bạn">
                    <MdPersonAdd />
                  </div>
                )}
                {/* Logout icon available in header for quick sign-out */}
                <div className="icon" title="Đăng xuất" onClick={handleLogout}>
                  <MdLogout />
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
                      {contact.lastMessage || 'Không có tin nhắn'}
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
            <div className="profile-body">
              <div className="profile-avatar-large"></div>
              <div className="profile-info">
                <p>
                  <strong>Tên:</strong> {user?.name || 'Không có tên'}
                </p>
                <p>
                  <strong>Email:</strong> {user?.email || 'Không có email'}
                </p>
                <p>
                  <strong>ID:</strong> {user?._id || 'Không có ID'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
