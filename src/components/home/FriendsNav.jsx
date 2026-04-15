import React from 'react'
import { MdContacts, MdGroup, MdPersonAdd } from 'react-icons/md'

const FriendsNav = ({ friendsView, friendRequestCount, onChangeView, onOpenFriendRequests }) => {
  return (
    <nav className="friends-nav">
      <div
        className={`friends-nav-item ${friendsView === 'friends-list' ? 'active' : ''}`}
        onClick={() => onChangeView('friends-list')}
      >
        <MdContacts className="friends-nav-icon" />
        <span>Danh sách bạn bè</span>
      </div>
      <div
        className={`friends-nav-item ${friendsView === 'group-list' ? 'active' : ''}`}
        onClick={() => onChangeView('group-list')}
      >
        <MdGroup className="friends-nav-icon" />
        <span>Danh sách nhóm</span>
      </div>
      <div
        className={`friends-nav-item ${friendsView === 'friend-requests' ? 'active' : ''}`}
        onClick={() => {
          onChangeView('friend-requests')
          onOpenFriendRequests?.()
        }}
      >
        <MdPersonAdd className="friends-nav-icon" />
        <span>Lời mời kết bạn</span>
        {friendRequestCount > 0 && (
          <span className="friends-nav-badge">{friendRequestCount}</span>
        )}
      </div>
    </nav>
  )
}

export default FriendsNav