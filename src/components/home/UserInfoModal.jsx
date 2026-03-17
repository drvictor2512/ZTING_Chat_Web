import React from 'react'
import { MdClose } from 'react-icons/md'

const UserInfoModal = ({ user, onClose, formatDate }) => {
    if (!user) return null

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
                    <button className="btn btn-cancel" onClick={onClose}>Đóng</button>
                </div>
            </div>
        </div>
    )
}

export default UserInfoModal
