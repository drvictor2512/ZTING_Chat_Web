import React from 'react'
import { MdClose } from 'react-icons/md'

const AddFriendModal = ({
  open,
  onClose,
  searchEmail,
  onSearchEmailChange,
  onSearchUser,
  searchLoading,
  error,
  searchResults,
  friends,
  sentRequests,
  friendRequests,
  onAcceptRequest,
  onSendRequestFromModal
}) => {
  if (!open) return null

  return (
    <div className="profile-modal" onClick={onClose}>
      <div className="add-friend-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <h3>Thêm bạn</h3>
          <button className="close-btn" onClick={onClose}><MdClose /></button>
        </div>
        <div className="add-friend-body">
          <div className="add-friend-search-row">
            <input
              type="text"
              className="add-friend-input"
              placeholder="Nhập email..."
              value={searchEmail}
              onChange={(e) => onSearchEmailChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearchUser()}
            />
            <button className="add-friend-search-btn" onClick={onSearchUser} disabled={searchLoading}>
              {searchLoading ? 'Đang tìm...' : 'Tìm kiếm'}
            </button>
          </div>
          {error && <div className="error-message" style={{ padding: '4px 0', color: 'red', fontSize: 13 }}>{error}</div>}
          <div className="add-friend-results-label">Kết quả gần nhất</div>
          {searchResults.length === 0 ? (
            <div className="add-friend-empty">
              <p>Chưa có kết quả</p>
              <button className="add-friend-search-btn-ghost" onClick={onSearchUser}>Tìm kiếm</button>
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
                    <button className="fr-btn-accept" onClick={() => onAcceptRequest(u._id)}>Đồng ý</button>
                  ) : (
                    <button className="fr-btn-accept" onClick={() => onSendRequestFromModal(u._id, u.name)}>Kết bạn</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default AddFriendModal
