import React from 'react'
import { MdClose } from 'react-icons/md'

const UserInfoModal = ({
    user,
    onClose,
    formatDate,
    currentUserId,
    friends = [],
    sentRequests = [],
    friendRequests = [],
    onAddFriend,
    onUnfriend,
    onAcceptRequest,
    onDeclineRequest,
    onRevokeRequest
}) => {
    if (!user) return null

    // Check relationship status
    const isSelf = String(currentUserId) === String(user._id)
    const isFriend = !isSelf && friends.some(f => String(f._id) === String(user._id))
    
    const sentRequest = !isSelf && sentRequests.find(r => {
        const toId = r.toUserId?._id || r.toUserId
        return String(toId) === String(user._id)
    })
    
    const incomingRequest = !isSelf && friendRequests.find(r => {
        const fromId = r.fromUserId?._id || r.fromUserId
        return String(fromId) === String(user._id)
    })

    const handleAddClick = () => {
        if (onAddFriend) {
            onAddFriend(user._id)
            onClose()
        }
    }

    const handleUnfriendClick = () => {
        if (onUnfriend) {
            onUnfriend(user._id)
        }
    }

    const handleAcceptClick = () => {
        if (onAcceptRequest && incomingRequest) {
            onAcceptRequest(incomingRequest._id)
            onClose()
        }
    }

    const handleDeclineClick = () => {
        if (onDeclineRequest && incomingRequest) {
            onDeclineRequest(incomingRequest._id)
            onClose()
        }
    }

    const handleRevokeClick = () => {
        if (onRevokeRequest && sentRequest) {
            onRevokeRequest(sentRequest._id, user._id)
            onClose()
        }
    }

    return (
        <div className="profile-modal" onClick={onClose}>
            <div className="profile-content" onClick={e => e.stopPropagation()}>
                <div className="profile-header">
                    <h3>Hồ sơ người dùng</h3>
                    <button className="close-btn" onClick={onClose}>
                        <MdClose />
                    </button>
                </div>

                <div className="profile-banner" title="Banner">
                    {user?.bannerUrl ? (
                        <img src={user.bannerUrl} alt="banner" />
                    ) : (
                        <span>Banner</span>
                    )}
                </div>

                <div className="profile-body">
                    <div className="profile-avatar-wrapper">
                        <div className="profile-avatar-large" title="Avatar">
                            {user?.avatarUrl ? (
                                <img src={user.avatarUrl} alt="avatar" />
                            ) : (
                                (user?.name || 'U').charAt(0).toUpperCase()
                            )}
                        </div>
                    </div>

                    <div className="profile-info">
                        <p><strong>Tên:</strong> {user?.name || 'Không có tên'}</p>
                        <p><strong>Email:</strong> {user?.email || 'Không có email'}</p>
                        <p><strong>Ngày sinh:</strong> {formatDate(user?.dateOfBirth) || 'dd/mm/yyyy'}</p>
                        <p><strong>Giới tính:</strong> {user?.gender || 'Không có'}</p>
                        <p><strong>BIO:</strong> {user?.bio || ''}</p>
                    </div>
                </div>
                <div className="profile-footer">
                    {!isSelf && (
                        <div className="friend-actions">
                            {isFriend ? (
                                <button className="btn btn-danger" onClick={handleUnfriendClick}>Hủy kết bạn</button>
                            ) : sentRequest ? (
                                <button className="btn btn-warning" onClick={handleRevokeClick}>Thu hồi</button>
                            ) : incomingRequest ? (
                                <>
                                    <button className="btn" onClick={handleAcceptClick}>Chấp nhận</button>
                                    <button className="btn btn-cancel" onClick={handleDeclineClick}>Từ chối</button>
                                </>
                            ) : (
                                <button className="btn" onClick={handleAddClick}>Kết bạn</button>
                            )}
                        </div>
                    )}
                    <button className="btn btn-cancel" onClick={onClose}>Đóng</button>
                </div>
            </div>
        </div>
    )
}

export default UserInfoModal
