import React from 'react'
import { buildLastMessagePreview } from '../../utils/mediaHelpers'

const normalizeUnreadCounts = (value) => {
  if (!value) return {}
  if (value instanceof Map) return Object.fromEntries(value)
  if (Array.isArray(value)) return Object.fromEntries(value)
  if (typeof value === 'object') return value
  return {}
}

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
              const visibleItems = groupMembersForAvatar.slice(0, 4)
              const baseItems = visibleItems.length > 0
                ? visibleItems
                : [{ _id: contact._id || displayName, name: displayName || 'G', avatarUrl: contact.avatarUrl || '' }]

              if (!showGroupCountBadge) return baseItems

              return baseItems.map((item, index) => {
                if (index !== 3) return item
                return {
                  _id: `${item._id || displayName}-count`,
                  name: String(groupMemberCount),
                  avatarUrl: '',
                  isCount: true
                }
              })
            })()
            : []
          const groupAvatarStackCount = groupAvatarItems.length
          const userStatus = !isGroup && userId ? onlineStatus[String(userId)] : null
          const isOnline = userStatus?.status === 'online'
          const isConversation = !!contact.type || !!contact.participantId
          const lastTime = isConversation
            ? (contact.lastMessageAt || contact.lastMessage?.createdAt)
            : null
          const lastTimeText = lastTime ? formatRelative(lastTime) : ''
          const unreadCounts = normalizeUnreadCounts(contact.unreadCounts)
          const unread = isConversation && currentUser?._id
            ? (Number(unreadCounts[String(currentUser._id)] || 0))
            : 0
          const unreadText = unread > 99 ? '99+' : String(unread)
          const isPendingConversation = Boolean(contact.pending && !contact._id)
          const isActive =
            (selectedContact?._id && contact._id && String(selectedContact._id) === String(contact._id)) ||
            (!selectedContact?._id && !contact._id && String(selectedContact?.participantId || '') === String(contact.participantId || ''))

          return (
            <div
              key={contact._id || contact.participantId}
              className={`contact-item ${isActive ? 'active' : ''}`}
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
                        <div className={`group-stack-item pos-${index + 1} ${member.isCount ? 'is-count' : ''}`} key={member._id}>
                          {member.isCount ? (
                            <span>{member.name}</span>
                          ) : member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.name} />
                          ) : (
                            <span>{(member.name || 'G').charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                      ))}
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
                  {buildLastMessagePreview(contact.lastMessage, {
                    isPendingConversation,
                    isConversation,
                    fallbackEmail: contact.email || ''
                  })}
                </span>
              </div>
            </div>
          )
        })}
    </>
  )
}

export default ContactList