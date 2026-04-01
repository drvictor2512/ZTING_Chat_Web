import React from 'react'
import { MdClose } from 'react-icons/md'

const GroupModals = ({
    showAddMembersModal,
    setShowAddMembersModal,
    selectedContact,
    friends,
    selectedMembersToAdd,
    setSelectedMembersToAdd,
    handleAddMembersToGroup,
    groupActionLoading,
    showTransferOwnerModal,
    setShowTransferOwnerModal,
    user,
    transferTargetUserId,
    setTransferTargetUserId,
    handleTransferOwnerAndLeave,
    showRenameModal,
    setShowRenameModal,
    newGroupName,
    setNewGroupName,
    handleSubmitRename,
    showCreateGroupModal,
    setShowCreateGroupModal,
    groupName,
    setGroupName,
    selectedFriendsForGroup,
    setSelectedFriendsForGroup,
    handleCreateGroup,
    showJoinGroupModal,
    setShowJoinGroupModal,
    joinGroupCode,
    setJoinGroupCode,
    joinGroupLoading,
    setJoinGroupLoading,
    conversationService,
    loadConversations,
    setSelectedContact,
    setError,
    showInviteCodeModal,
    setShowInviteCodeModal,
    inviteCode,
    copyInviteSuccess,
    handleCopyInviteCode
}) => {
    const closeActionButtonStyle = {
        backgroundColor: '#f7f9fc',
        color: '#7d8796',
        border: '1px solid #d7dee9',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold'
    }

    return (
        <>
            {showAddMembersModal && (
                <div className="profile-modal" onClick={() => setShowAddMembersModal(false)}>
                    <div className="profile-popup" style={{ maxHeight: '90vh', width: '480px', maxWidth: '95vw', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div className="profile-header">
                            <h2>Thêm thành viên vào nhóm</h2>
                            <MdClose className="close-icon" onClick={() => setShowAddMembersModal(false)} />
                        </div>
                        <div className="profile-content" style={{ padding: '20px', overflowY: 'auto', flex: 1, width: '100%', maxWidth: 'none', boxSizing: 'border-box', borderRadius: 0, boxShadow: 'none' }}>
                            {(() => {
                                const inGroupIds = new Set((selectedContact?.participants || []).map(p => String(p.userId?._id || p._id)))
                                const candidates = friends.filter(f => !inGroupIds.has(String(f._id)))

                                if (candidates.length === 0) {
                                    return <p style={{ color: '#666' }}>Không còn bạn bè nào để thêm vào nhóm.</p>
                                }

                                return (
                                    <div style={{ border: '1px solid #ddd', borderRadius: '8px', maxHeight: '340px', overflowY: 'auto', padding: '10px' }}>
                                        {candidates.map(friend => (
                                            <div
                                                key={friend._id}
                                                style={{ display: 'flex', alignItems: 'center', padding: '10px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                                                onClick={() => {
                                                    setSelectedMembersToAdd(prev =>
                                                        prev.includes(friend._id)
                                                            ? prev.filter(id => id !== friend._id)
                                                            : [...prev, friend._id]
                                                    )
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMembersToAdd.includes(friend._id)}
                                                    onChange={() => { }}
                                                    style={{ marginRight: '10px', cursor: 'pointer' }}
                                                />
                                                <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#003399', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginRight: '10px', flexShrink: 0, overflow: 'hidden' }}>
                                                    {friend.avatarUrl ? (
                                                        <img src={friend.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        friend.name?.charAt(0).toUpperCase() || 'U'
                                                    )}
                                                </div>
                                                <span>{friend.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )
                            })()}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                <button
                                    onClick={handleAddMembersToGroup}
                                    disabled={groupActionLoading}
                                    style={{ flex: 1, padding: '10px 20px', backgroundColor: '#003399', color: 'white', border: 'none', borderRadius: '8px', cursor: groupActionLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '14px', opacity: groupActionLoading ? 0.7 : 1 }}
                                >
                                    {groupActionLoading ? 'Đang thêm...' : 'Thêm thành viên'}
                                </button>
                                <button
                                    onClick={() => setShowAddMembersModal(false)}
                                    style={{ ...closeActionButtonStyle, flex: 1, padding: '10px 20px', fontSize: '14px' }}
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showTransferOwnerModal && (
                <div className="profile-modal" onClick={() => setShowTransferOwnerModal(false)}>
                    <div className="profile-popup" style={{ maxWidth: '560px', width: '95vw' }} onClick={e => e.stopPropagation()}>
                        <div className="profile-header">
                            <h2>Chuyển quyền và rời nhóm</h2>
                            <MdClose className="close-icon" onClick={() => setShowTransferOwnerModal(false)} />
                        </div>
                        <div className="profile-content" style={{ padding: '24px', width: '100%', maxWidth: 'none', boxSizing: 'border-box', borderRadius: 0, boxShadow: 'none' }}>
                            <p style={{ margin: '0 0 12px', color: '#666', fontSize: '16px' }}>Chọn thành viên sẽ trở thành trưởng nhóm mới.</p>
                            <div style={{ border: '1px solid #ddd', borderRadius: '12px', maxHeight: '280px', overflowY: 'auto', padding: '8px 12px' }}>
                                {(selectedContact?.participants || [])
                                    .filter(p => String(p.userId?._id || p._id) !== String(user?._id))
                                    .map(p => {
                                        const userId = p.userId?._id || p._id
                                        const userName = p.userId?.name || p.name || 'User'
                                        return (
                                            <label key={userId} style={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '56px', padding: '8px 6px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}>
                                                <input
                                                    type="radio"
                                                    name="transferOwner"
                                                    value={userId}
                                                    checked={String(transferTargetUserId) === String(userId)}
                                                    onChange={() => setTransferTargetUserId(userId)}
                                                />
                                                <span style={{ fontSize: '16px', lineHeight: 1.1 }}>{userName}</span>
                                            </label>
                                        )
                                    })}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '18px' }}>
                                <button
                                    onClick={handleTransferOwnerAndLeave}
                                    disabled={groupActionLoading || !transferTargetUserId}
                                    style={{ flex: 1, minHeight: '50px', padding: '0 16px', backgroundColor: '#003399', color: 'white', border: 'none', borderRadius: '12px', cursor: groupActionLoading || !transferTargetUserId ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '16px', whiteSpace: 'nowrap', opacity: groupActionLoading || !transferTargetUserId ? 0.7 : 1 }}
                                >
                                    {groupActionLoading ? 'Đang xử lý...' : 'Chuyển quyền & Rời nhóm'}
                                </button>
                                <button
                                    onClick={() => setShowTransferOwnerModal(false)}
                                    style={{ ...closeActionButtonStyle, flex: 1, minHeight: '50px', padding: '0 16px', borderRadius: '12px', fontWeight: 700, fontSize: '16px' }}
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showRenameModal && (
                <div className="profile-modal" onClick={() => setShowRenameModal(false)}>
                    <div className="profile-popup" style={{ maxWidth: '520px', width: '95vw' }} onClick={e => e.stopPropagation()}>
                        <div className="profile-header">
                            <h2>Đổi tên nhóm</h2>
                            <MdClose className="close-icon" onClick={() => setShowRenameModal(false)} />
                        </div>
                        <div className="profile-content" style={{ padding: '24px', width: '100%', maxWidth: 'none', boxSizing: 'border-box', borderRadius: 0, boxShadow: 'none' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Tên nhóm mới</label>
                                <input
                                    type="text"
                                    placeholder="Nhập tên nhóm mới"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitRename()}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={handleSubmitRename}
                                    style={{
                                        flex: 1,
                                        padding: '10px 20px',
                                        backgroundColor: '#003399',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Lưu
                                </button>
                                <button
                                    onClick={() => setShowRenameModal(false)}
                                    style={{
                                        ...closeActionButtonStyle,
                                        flex: 1,
                                        padding: '10px 20px',
                                        borderRadius: '8px'
                                    }}
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCreateGroupModal && (
                <div className="profile-modal" onClick={() => setShowCreateGroupModal(false)}>
                    <div className="profile-popup" style={{ maxHeight: '90vh', width: '480px', maxWidth: '95vw', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div className="profile-header">
                            <h2>Tạo nhóm chat</h2>
                            <MdClose className="close-icon" onClick={() => setShowCreateGroupModal(false)} />
                        </div>
                        <div className="profile-content" style={{ padding: '20px', overflowY: 'auto', flex: 1, width: '100%', maxWidth: 'none', boxSizing: 'border-box', borderRadius: 0, boxShadow: 'none' }}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Tên nhóm</label>
                                <input
                                    type="text"
                                    placeholder="Nhập tên nhóm"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Chọn bạn bè ({selectedFriendsForGroup.length})</label>
                                <div style={{
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    padding: '10px'
                                }}>
                                    {friends.length === 0 ? (
                                        <p style={{ color: '#999' }}>Bạn chưa có bạn bè. Vui lòng thêm bạn bè trước.</p>
                                    ) : (
                                        friends.map(friend => (
                                            <div
                                                key={friend._id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '10px',
                                                    borderBottom: '1px solid #f0f0f0',
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => {
                                                    setSelectedFriendsForGroup(prev =>
                                                        prev.includes(friend._id)
                                                            ? prev.filter(id => id !== friend._id)
                                                            : [...prev, friend._id]
                                                    )
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedFriendsForGroup.includes(friend._id)}
                                                    onChange={() => { }}
                                                    style={{ marginRight: '10px', cursor: 'pointer' }}
                                                />
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '50%',
                                                    backgroundColor: '#003399',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    marginRight: '10px',
                                                    flexShrink: 0,
                                                    overflow: 'hidden'
                                                }}>
                                                    {friend.avatarUrl ? (
                                                        <img src={friend.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        friend.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <span>{friend.name}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={handleCreateGroup}
                                    style={{
                                        flex: 1,
                                        padding: '10px 20px',
                                        backgroundColor: '#003399',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '14px'
                                    }}
                                >
                                    Tạo nhóm
                                </button>
                                <button
                                    onClick={() => setShowCreateGroupModal(false)}
                                    style={{
                                        ...closeActionButtonStyle,
                                        flex: 1,
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showJoinGroupModal && (
                <div className="profile-modal" onClick={() => setShowJoinGroupModal(false)}>
                    <div className="profile-popup" style={{ width: '420px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
                        <div className="profile-header">
                            <h2>Tham gia nhóm bằng mã</h2>
                            <MdClose className="close-icon" onClick={() => setShowJoinGroupModal(false)} />
                        </div>
                        <div className="profile-content" style={{ padding: '20px', width: '100%', maxWidth: 'none', boxSizing: 'border-box', borderRadius: 0, boxShadow: 'none' }}>
                            <p style={{ color: '#555', marginBottom: '14px', fontSize: '14px' }}>Nhập mã mời để tham gia vào nhóm chat.</p>
                            <input
                                type="text"
                                placeholder="Nhập mã nhóm..."
                                value={joinGroupCode}
                                onChange={e => setJoinGroupCode(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !joinGroupLoading && joinGroupCode.trim() && (async () => {
                                    setJoinGroupLoading(true)
                                    try {
                                        const conv = await conversationService.joinByInvite(joinGroupCode.trim())
                                        setShowJoinGroupModal(false)
                                        await loadConversations()
                                        if (conv?.conversation) setSelectedContact(conv.conversation)
                                    } catch (err) {
                                        setError(err.message || 'Mã nhóm không hợp lệ hoặc đã hết hạn.')
                                    } finally {
                                        setJoinGroupLoading(false)
                                    }
                                })()}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', marginBottom: '16px' }}
                                autoFocus
                            />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={async () => {
                                        if (!joinGroupCode.trim() || joinGroupLoading) return
                                        setJoinGroupLoading(true)
                                        try {
                                            const conv = await conversationService.joinByInvite(joinGroupCode.trim())
                                            setShowJoinGroupModal(false)
                                            await loadConversations()
                                            if (conv?.conversation) setSelectedContact(conv.conversation)
                                        } catch (err) {
                                            setError(err.message || 'Mã nhóm không hợp lệ hoặc đã hết hạn.')
                                        } finally {
                                            setJoinGroupLoading(false)
                                        }
                                    }}
                                    disabled={!joinGroupCode.trim() || joinGroupLoading}
                                    style={{ flex: 1, padding: '10px', backgroundColor: joinGroupCode.trim() && !joinGroupLoading ? '#003399' : '#b0b8d1', color: 'white', border: 'none', borderRadius: '8px', cursor: joinGroupCode.trim() && !joinGroupLoading ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '14px' }}
                                >
                                    {joinGroupLoading ? 'Đang tham gia...' : 'Tham gia'}
                                </button>
                                <button
                                    onClick={() => setShowJoinGroupModal(false)}
                                    style={{ ...closeActionButtonStyle, flex: 1, padding: '10px', borderRadius: '8px', fontSize: '14px' }}
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showInviteCodeModal && (
                <div className="profile-modal" onClick={() => setShowInviteCodeModal(false)}>
                    <div className="profile-popup" style={{ width: '460px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
                        <div className="profile-header">
                            <h2>Link mời nhóm</h2>
                            <MdClose className="close-icon" onClick={() => setShowInviteCodeModal(false)} />
                        </div>
                        <div className="profile-content" style={{ padding: '18px', width: '100%', maxWidth: 'none', boxSizing: 'border-box', borderRadius: 0, boxShadow: 'none' }}>
                            <p style={{ margin: '0 0 14px', color: '#8a97a8', fontSize: '14px' }}>Chia sẻ mã này để ai cũng có thể tham gia nhóm</p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#eff2f6', borderRadius: '10px', padding: '10px' }}>
                                <div style={{ flex: 1, fontSize: '22px', fontWeight: 700, letterSpacing: '1px', color: '#1f2a3d', wordBreak: 'break-all' }}>
                                    {inviteCode}
                                </div>
                                <button
                                    onClick={handleCopyInviteCode}
                                    style={{ minWidth: '98px', height: '42px', border: 'none', borderRadius: '10px', background: copyInviteSuccess ? '#18a957' : '#2f67d8', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    {copyInviteSuccess ? 'Đã chép' : 'Sao chép'}
                                </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                                <button
                                    onClick={() => setShowInviteCodeModal(false)}
                                    style={{ ...closeActionButtonStyle, width: '94px', height: '40px', borderRadius: '10px', fontSize: '14px', fontWeight: 700 }}
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default GroupModals
