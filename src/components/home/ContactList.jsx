import React from 'react'

const ContactList = ({
  filteredContacts,
  selectedContact,
  onContactClick,
  onOpenUserPopup,
  currentUser,
  onlineStatus,
  formatRelative
}) => {
  return (
    <>
      {filteredContacts
        .filter(contact => (contact.name || contact.participantName || contact.group?.name || contact.groupName || contact.email))
        .map(contact => {
          const displayName = contact.name || contact.participantName || contact.group?.name || contact.groupName || contact.email || ''
          const avatarUrl = contact.participantAvatar || contact.avatarUrl
          const userId = contact.participantId || contact._id
          const isGroup = contact.type === 'GROUP'
          const rawParticipants = Array.isArray(contact.participants) ? contact.participants : []
          const normalizedParticipants = rawParticipants.map((p) => {
            const pId = p.userId?._id || p._id
            const pName = p.userId?.name || p.name || 'U'
            const pAvatar = p.userId?.avatarUrl || p.avatarUrl || ''
            return {
              _id: pId,
              name: pName,
              avatarUrl: pAvatar
            }
          }).filter(p => p._id)
          const groupMembersForAvatar = isGroup
            ? (() => {
              const myId = String(currentUser?._id || '')
              const others = normalizedParticipants.filter(p => String(p._id) !== myId)
              const me = normalizedParticipants.find(p => String(p._id) === myId)
              const source = [...others]
              if (source.length < 4 && me) {
                source.push(me)
              }
              if (source.length === 0) {
                return normalizedParticipants.slice(0, 4)
              }
              return source.slice(0, 4)
            })()
            : []
          const groupMemberCount = normalizedParticipants.length || groupMembersForAvatar.length
          const showGroupCountBadge = isGroup && groupMemberCount > 4
          const groupAvatarItems = isGroup
            ? (() => {
              const visibleItems = showGroupCountBadge
                ? groupMembersForAvatar.slice(0, 3)
                : groupMembersForAvatar.slice(0, 4)
              return visibleItems.length > 0
                ? visibleItems
                : [{ _id: contact._id || displayName, name: displayName || 'G', avatarUrl: contact.avatarUrl || '' }]
            })()
            : []
          const groupAvatarStackCount = showGroupCountBadge ? 4 : groupAvatarItems.length
          const userStatus = !isGroup && userId ? onlineStatus[String(userId)] : null
          const isOnline = userStatus?.status === 'online'
          const isConversation = !!contact.type || !!contact.participantId
          const lastTime = isConversation
            ? (contact.lastMessageAt || contact.lastMessage?.createdAt)
            : null
          const lastTimeText = lastTime ? formatRelative(lastTime) : ''
          const unread = isConversation && contact.unreadCounts && currentUser?._id
            ? (contact.unreadCounts[String(currentUser._id)] || 0)
            : 0
          const unreadText = unread > 99 ? '99+' : String(unread)

          return (
            <div
              key={contact._id || contact.participantId}
              className={`contact-item ${selectedContact?._id === contact._id ? 'active' : ''}`}
              onClick={() => onContactClick(contact)}
            >
              <div
                className="avatar-wrapper"
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isGroup && userId) {
                    onOpenUserPopup(userId)
                  }
                }}
                style={{ cursor: !isGroup && userId ? 'pointer' : 'default' }}
              >
                <div className={`avatar ${isGroup ? 'avatar-group-stack' : ''}`}>
                  {isGroup ? (
                    <div className={`group-avatar-stack count-${groupAvatarStackCount}`}>
                      {groupAvatarItems.map((member, index) => (
                        <div className={`group-stack-item pos-${index + 1}`} key={member._id}>
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.name} />
                          ) : (
                            <span>{(member.name || 'G').charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                      ))}
                      {showGroupCountBadge && (
                        <span className="group-stack-count">{groupMemberCount}</span>
                      )}
                    </div>
                  ) : avatarUrl ? (
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
        })}
    </>
  )
}

export default ContactList