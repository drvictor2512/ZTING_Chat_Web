import React from 'react'
import { MdClose, MdEdit } from 'react-icons/md'

const UserProfileModal = ({
    open,
    onClose,
    error,
    user,
    isEditingProfile,
    profileForm,
    onProfileChange,
    onStartEdit,
    onSaveProfile,
    onCancelEdit,
    onBannerClick,
    bannerInputRef,
    onBannerUpload,
    onAvatarClick,
    avatarInputRef,
    onAvatarUpload,
    formatDate
}) => {
    if (!open) return null

    return (
        <div className="profile-modal" onClick={onClose}>
            <div className="profile-content" onClick={(e) => e.stopPropagation()}>
                <div className="profile-header">
                    <h3>Hồ sơ người dùng</h3>
                    <button className="close-btn" onClick={onClose}>
                        <MdClose />
                    </button>
                </div>
                {error && <div className="error-message" style={{ padding: '0 20px', color: 'red', fontSize: '13px' }}>{error}</div>}

                <div className="profile-banner" onClick={onBannerClick} title="Click để đổi banner">
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
                    onChange={onBannerUpload}
                />

                <div className="profile-body">
                    <div className="profile-avatar-wrapper">
                        <div className="profile-avatar-large" onClick={onAvatarClick} title="Click để đổi avatar">
                            {user?.avatarUrl ? (
                                <img src={user.avatarUrl} alt="avatar" />
                            ) : (
                                (user?.name || 'U').charAt(0).toUpperCase()
                            )}
                        </div>
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        ref={avatarInputRef}
                        style={{ display: 'none' }}
                        onChange={onAvatarUpload}
                    />

                    <div className="profile-info">
                        {isEditingProfile ? (
                            <>
                                <div className="form-group">
                                    <label>Họ tên</label>
                                    <input name="name" value={profileForm.name} onChange={onProfileChange} />
                                </div>
                                <div className="form-group">
                                    <label>Ngày sinh</label>
                                    <input type="date" name="dateOfBirth" value={profileForm.dateOfBirth} onChange={onProfileChange} />
                                </div>
                                <div className="form-group">
                                    <label>Giới tính</label>
                                    <input name="gender" value={profileForm.gender} onChange={onProfileChange} />
                                </div>
                                <div className="form-group">
                                    <label>BIO</label>
                                    <textarea name="bio" value={profileForm.bio} onChange={onProfileChange} />
                                </div>
                            </>
                        ) : (
                            <>
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
                            <button className="btn-edit" onClick={onStartEdit}>
                                <MdEdit />
                            </button>
                        )}
                    </div>
                </div>
                <div className="profile-footer">
                    {isEditingProfile ? (
                        <>
                            <button className="btn" onClick={onSaveProfile}>Cập nhật</button>
                            <button className="btn btn-cancel" onClick={onCancelEdit}>Quay lại</button>
                        </>
                    ) : (
                        <button className="btn btn-cancel" onClick={onClose}>Đóng</button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default UserProfileModal
