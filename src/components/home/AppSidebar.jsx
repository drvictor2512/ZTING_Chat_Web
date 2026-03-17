import React from 'react'
import { MdChat, MdContacts, MdSmartToy, MdSettings } from 'react-icons/md'

const AppSidebar = ({ user, currentView, friendRequestCount, onOpenProfile, onChangeView }) => {
  return (
    <div className="sidebar">
      <div
        className="avatar user-avatar"
        onClick={onOpenProfile}
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
        onClick={() => onChangeView('chat')}
        title="Tin nhắn"
      >
        <MdChat />
      </div>

      <div
        className={`icon ${currentView === 'friends' ? 'active' : ''}`}
        onClick={() => onChangeView('friends')}
        title="Danh bạ"
      >
        <MdContacts />
        {friendRequestCount > 0 && (
          <span className="sidebar-badge">{friendRequestCount > 99 ? '99+' : friendRequestCount}</span>
        )}
      </div>

      <div
        className={`icon ${currentView === 'ai' ? 'active' : ''}`}
        onClick={() => onChangeView('ai')}
        title="Trợ lý AI"
      >
        <MdSmartToy />
      </div>

      <div
        className={`icon settings-icon ${currentView === 'settings' ? 'active' : ''}`}
        onClick={() => onChangeView('settings')}
        title="Cài đặt"
      >
        <MdSettings />
      </div>
    </div>
  )
}

export default AppSidebar