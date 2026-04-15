import React, { useState, useEffect, useMemo } from 'react'
import { MdClose, MdSearch, MdGroup, MdPerson } from 'react-icons/md'

const ForwardPopup = ({ isOpen, onClose, conversations, messageToForward, onForward, user }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedConversations, setSelectedConversations] = useState([])
  const [isForwarding, setIsForwarding] = useState(false)
  const [activeTab, setActiveTab] = useState('recent') // 'recent', 'groups', 'friends'

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      setSelectedConversations([])
      setActiveTab('recent')
    }
  }, [isOpen])

  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations
    const term = searchTerm.toLowerCase()
    return conversations.filter(conv => 
      (conv.name || '').toLowerCase().includes(term) ||
      (conv.participantName || '').toLowerCase().includes(term)
    )
  }, [conversations, searchTerm])

  const groupedConversations = useMemo(() => {
    const groups = filteredConversations.filter(c => c.type === 'GROUP')
    const directs = filteredConversations.filter(c => c.type === 'DIRECT')
    return { groups, directs }
  }, [filteredConversations])

  const toggleConversation = (convId) => {
    setSelectedConversations(prev => 
      prev.includes(convId) 
        ? prev.filter(id => id !== convId)
        : [...prev, convId]
    )
  }

  const handleForward = async () => {
    if (selectedConversations.length === 0 || !messageToForward) return
    
    setIsForwarding(true)
    try {
      // Separate group conversations and direct user conversations
      const targetConversationIds = []
      const targetUserIds = []
      
      for (const convId of selectedConversations) {
        const conv = conversations.find(c => c._id === convId)
        if (conv) {
          if (conv.type === 'GROUP') {
            targetConversationIds.push(convId)
          } else {
            // For direct conversations, get the other participant's userId
            const myId = String(user?._id || '')
            const otherParticipant = conv.participants?.find(p => {
              const pId = p._id || p.userId?._id
              return String(pId) !== myId
            })
            if (otherParticipant) {
              const userId = otherParticipant._id || otherParticipant.userId?._id
              if (userId) targetUserIds.push(userId)
            }
          }
        }
      }
      
      await onForward({
        messageId: messageToForward._id,
        targetConversationIds,
        targetUserIds
      })
      onClose()
    } catch (error) {
      console.error('Forward error:', error)
    } finally {
      setIsForwarding(false)
    }
  }

  const getMessagePreview = () => {
    if (!messageToForward) return ''
    const content = messageToForward.content || ''
    if (content.length > 100) {
      return content.substring(0, 100) + '...'
    }
    return content
  }

  if (!isOpen) return null

  return (
    <div className="forward-popup-overlay" onClick={onClose}>
      <div className="forward-popup" onClick={e => e.stopPropagation()}>
        <div className="forward-popup-header">
          <h3>Chia sẻ</h3>
          <button className="forward-popup-close" onClick={onClose}>
            <MdClose />
          </button>
        </div>

        <div className="forward-popup-search">
          <MdSearch className="search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="forward-popup-tabs">
          <button 
            className={activeTab === 'recent' ? 'active' : ''}
            onClick={() => setActiveTab('recent')}
          >
            Gần đây
          </button>
          <button 
            className={activeTab === 'groups' ? 'active' : ''}
            onClick={() => setActiveTab('groups')}
          >
            Nhóm trò chuyện
          </button>
          <button 
            className={activeTab === 'friends' ? 'active' : ''}
            onClick={() => setActiveTab('friends')}
          >
            Bạn bè
          </button>
        </div>

        <div className="forward-popup-content">
          {(activeTab === 'recent' || activeTab === 'groups') && groupedConversations.groups.length > 0 && (
            <div className="forward-section">
              <h4>Nhóm</h4>
              {groupedConversations.groups.map(conv => (
                <div 
                  key={conv._id} 
                  className={`forward-item ${selectedConversations.includes(conv._id) ? 'selected' : ''}`}
                  onClick={() => toggleConversation(conv._id)}
                >
                  <input 
                    type="checkbox" 
                    checked={selectedConversations.includes(conv._id)}
                    onChange={() => toggleConversation(conv._id)}
                    onClick={e => e.stopPropagation()}
                  />
                  <div className="forward-item-avatar">
                    <MdGroup />
                  </div>
                  <div className="forward-item-info">
                    <span className="forward-item-name">{conv.name}</span>
                    <span className="forward-item-type">Nhóm • {conv.participants?.length || 0} thành viên</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(activeTab === 'recent' || activeTab === 'friends') && groupedConversations.directs.length > 0 && (
            <div className="forward-section">
              <h4>Bạn bè</h4>
              {groupedConversations.directs.map(conv => (
                <div 
                  key={conv._id} 
                  className={`forward-item ${selectedConversations.includes(conv._id) ? 'selected' : ''}`}
                  onClick={() => toggleConversation(conv._id)}
                >
                  <input 
                    type="checkbox" 
                    checked={selectedConversations.includes(conv._id)}
                    onChange={() => toggleConversation(conv._id)}
                    onClick={e => e.stopPropagation()}
                  />
                  <div className="forward-item-avatar">
                    {conv.participantAvatar ? (
                      <img src={conv.participantAvatar} alt="" />
                    ) : (
                      <MdPerson />
                    )}
                  </div>
                  <div className="forward-item-info">
                    <span className="forward-item-name">{conv.participantName || conv.name}</span>
                    <span className="forward-item-type">Cá nhân</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredConversations.length === 0 && (
            <div className="forward-empty">Không tìm thấy cuộc trò chuyện</div>
          )}
        </div>

        {messageToForward && (
          <div className="forward-message-preview">
            <span className="forward-preview-label">Chia sẻ tin nhắn:</span>
            <div className="forward-preview-content">
              {messageToForward.fileUrl && <span className="forward-preview-file">[File]</span>}
              <span>{getMessagePreview() || '[Tin nhắn]'}</span>
            </div>
          </div>
        )}

        <div className="forward-popup-actions">
          <button className="forward-btn-cancel" onClick={onClose} disabled={isForwarding}>
            Hủy
          </button>
          <button 
            className="forward-btn-confirm" 
            onClick={handleForward}
            disabled={selectedConversations.length === 0 || isForwarding}
          >
            {isForwarding ? 'Đang chia sẻ...' : `Chia sẻ (${selectedConversations.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ForwardPopup
