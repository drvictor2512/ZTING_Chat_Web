import React from 'react'
import { MdPersonAdd, MdChat, MdGroup, MdEmail, MdContacts } from 'react-icons/md'

const FriendsView = ({
    friendsView,
    friendRequests,
    sentRequests,
    handleContactClick,
    setCurrentView,
    handleDeclineRequest,
    handleAcceptRequest,
    handleRevokeRequest,
    conversations,
    groupSearchTerm,
    setGroupSearchTerm,
    groupSortOrder,
    setGroupSortOrder,
    filteredFriends,
    friendSearchTerm,
    setFriendSearchTerm,
    friendSortOrder,
    setFriendSortOrder,
    friendMenuOpen,
    setFriendMenuOpen,
    handleUnfriend,
    friends
}) => {
    return (
        <div className="main-area friends-view">
            {friendsView === 'friend-requests' ? (
                <div className="friends-detail-view">
                    <div className="fl-page-header">
                        <MdPersonAdd className="fl-page-icon" />
                        <h2 className="fl-page-title">Lời mời kết bạn</h2>
                    </div>
                    <div className="fr-content">
                        <div className="fr-section-header">Lời mời đã nhận ({friendRequests.length})</div>
                        {friendRequests.length > 0 ? (
                            <div className="fr-card-grid">
                                {friendRequests.map(request => (
                                    <div key={request._id} className="fr-card">
                                        <div className="fr-card-top">
                                            <div className="fr-card-avatar">
                                                {request.fromUserId?.avatarUrl ? (
                                                    <img src={request.fromUserId.avatarUrl} alt={request.fromUserId.name} />
                                                ) : (
                                                    request.fromUserId?.name?.charAt(0).toUpperCase() || 'U'
                                                )}
                                            </div>
                                            <div className="fr-card-info">
                                                <span className="fr-card-name">{request.fromUserId?.name}</span>
                                                <span className="fr-card-meta">
                                                    {request.createdAt ? new Date(request.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' - ' : ''}
                                                    Từ danh thiếp
                                                </span>
                                            </div>
                                            <button
                                                className="fr-chat-btn"
                                                title="Nhắn tin"
                                                onClick={(e) => { e.stopPropagation(); handleContactClick(request.fromUserId); setCurrentView('chat') }}
                                            >
                                                <MdChat />
                                            </button>
                                        </div>
                                        {request.message && (
                                            <div className="fr-card-message">{request.message}</div>
                                        )}
                                        <div className="fr-card-actions">
                                            <button className="fr-btn-decline" onClick={() => handleDeclineRequest(request._id)}>Từ chối</button>
                                            <button className="fr-btn-accept" onClick={() => handleAcceptRequest(request._id)}>Đồng ý</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="fr-empty">Chưa có lời mời kết bạn nào</div>
                        )}
                        {sentRequests.length > 0 && (
                            <>
                                <div className="fr-section-header fr-section-header--spaced">Lời mời đã gửi ({sentRequests.length})</div>
                                <div className="fr-card-grid">
                                    {sentRequests.map(request => (
                                        <div key={request._id} className="fr-card">
                                            <div className="fr-card-top">
                                                <div className="fr-card-avatar">
                                                    {request.toUserId?.avatarUrl ? (
                                                        <img src={request.toUserId.avatarUrl} alt={request.toUserId.name} />
                                                    ) : (
                                                        request.toUserId?.name?.charAt(0).toUpperCase() || 'U'
                                                    )}
                                                </div>
                                                <div className="fr-card-info">
                                                    <span className="fr-card-name">{request.toUserId?.name}</span>
                                                    <span className="fr-card-meta">
                                                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : 'Đã gửi lời mời'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="fr-card-actions">
                                                <button className="fr-btn-revoke" onClick={() => handleRevokeRequest(request._id, request.toUserId?._id || request.toUserId)}>Thu hồi lời mời</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : friendsView === 'group-list' ? (
                <div className="friends-detail-view">
                    <div className="fl-page-header">
                        <MdGroup className="fl-page-icon" />
                        <h2 className="fl-page-title">Danh sách nhóm</h2>
                    </div>
                    {(() => {
                        const myGroups = conversations.filter(c => c.type === 'GROUP')
                        const filtered = myGroups
                            .filter(g => (g.name || '').toLowerCase().includes(groupSearchTerm.toLowerCase()))
                            .sort((a, b) => groupSortOrder === 'Z-A'
                                ? (b.name || '').localeCompare(a.name || '', 'vi')
                                : (a.name || '').localeCompare(b.name || '', 'vi')
                            )
                        return (
                            <>
                                <div className="fl-sub-header">
                                    Nhóm ({myGroups.length})
                                </div>
                                <div className="fl-toolbar">
                                    <div className="fl-search-box">
                                        <svg className="fl-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                        <input
                                            type="text"
                                            placeholder="Tìm nhóm"
                                            value={groupSearchTerm}
                                            onChange={e => setGroupSearchTerm(e.target.value)}
                                            className="fl-search-input"
                                        />
                                    </div>
                                    <select
                                        value={groupSortOrder}
                                        onChange={e => setGroupSortOrder(e.target.value)}
                                        className="fl-sort-select"
                                    >
                                        <option value="A-Z">Tên A-Z</option>
                                        <option value="Z-A">Tên Z-A</option>
                                    </select>
                                </div>
                                {filtered.length === 0 ? (
                                    <div className="empty-state">
                                        <p>{groupSearchTerm ? 'Không tìm thấy nhóm nào' : 'Bạn chưa tham gia nhóm nào'}</p>
                                    </div>
                                ) : (
                                    <div className="fl-list">
                                        {filtered.map(group => {
                                            const rawParticipants = Array.isArray(group.participants) ? group.participants : []
                                            const normalizedParticipants = rawParticipants.map((p) => {
                                                const pId = p.userId?._id || p._id
                                                const pName = p.userId?.name || p.name || 'G'
                                                const pAvatar = p.userId?.avatarUrl || p.avatarUrl || ''
                                                return { _id: pId, name: pName, avatarUrl: pAvatar }
                                            }).filter(p => p._id)

                                            const groupMemberCount = normalizedParticipants.length
                                            const showGroupCountBadge = groupMemberCount > 3
                                            const visibleItems = showGroupCountBadge
                                                ? normalizedParticipants.slice(0, 2)
                                                : normalizedParticipants.slice(0, 3)
                                            const groupAvatarItems = visibleItems.length > 0
                                                ? visibleItems
                                                : [{ _id: group._id || group.name, name: group.name || 'G', avatarUrl: group.avatarUrl || group.group?.avatarUrl || group.groupAvatar || '' }]
                                            const stackCount = showGroupCountBadge ? 3 : groupAvatarItems.length

                                            return (
                                                <div
                                                    key={group._id}
                                                    className="fl-friend-row"
                                                    onClick={() => { handleContactClick(group); setCurrentView('chat') }}
                                                >
                                                    <div className="fl-avatar" style={{ backgroundColor: 'transparent', overflow: 'visible' }}>
                                                        <div className={`group-avatar-stack count-${stackCount}`}>
                                                            {groupAvatarItems.map((member, index) => (
                                                                <div className={`group-stack-item pos-${index + 1}`} key={member._id || `${group._id}-${index}`}>
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
                                                    </div>
                                                    <span className="fl-name">{group.name}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </>
                        )
                    })()}
                </div>
            ) : friendsView === 'group-invites' ? (
                <div className="friends-detail-view">
                    <div className="fl-page-header">
                        <MdEmail className="fl-page-icon" />
                        <h2 className="fl-page-title">Lời mời vào nhóm và cộng đồng</h2>
                    </div>
                    <div className="empty-state">
                        <p>Chưa có lời mời nào</p>
                    </div>
                </div>
            ) : (
                <div className="friends-detail-view">
                    <div className="fl-page-header">
                        <MdContacts className="fl-page-icon" />
                        <h2 className="fl-page-title">Danh sách bạn bè</h2>
                    </div>
                    <div className="fl-sub-header">
                        Bạn bè ({filteredFriends.length})
                    </div>
                    <div className="fl-toolbar">
                        <div className="fl-search-box">
                            <svg className="fl-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            <input
                                type="text"
                                placeholder="Tìm bạn"
                                value={friendSearchTerm}
                                onChange={(e) => setFriendSearchTerm(e.target.value)}
                                className="fl-search-input"
                            />
                        </div>
                        <select
                            value={friendSortOrder}
                            onChange={(e) => setFriendSortOrder(e.target.value)}
                            className="fl-sort-select"
                        >
                            <option value="A-Z">↕ Tên (A-Z)</option>
                            <option value="Z-A">↕ Tên (Z-A)</option>
                        </select>
                    </div>
                    {filteredFriends.length > 0 ? (() => {
                        const groups = {}
                        filteredFriends.forEach(f => {
                            const letter = (f.name || 'U').charAt(0).toUpperCase()
                            if (!groups[letter]) groups[letter] = []
                            groups[letter].push(f)
                        })
                        const sortedLetters = Object.keys(groups).sort((a, b) =>
                            friendSortOrder === 'Z-A' ? b.localeCompare(a) : a.localeCompare(b)
                        )
                        return (
                            <div className="fl-list">
                                {sortedLetters.map(letter => (
                                    <div key={letter} className="fl-group">
                                        <div className="fl-group-letter">{letter}</div>
                                        {groups[letter].map(friend => (
                                            <div
                                                key={friend._id}
                                                className="fl-friend-row"
                                                onClick={() => { handleContactClick(friend); setCurrentView('chat') }}
                                            >
                                                <div className="fl-avatar">
                                                    {friend.avatarUrl ? (
                                                        <img src={friend.avatarUrl} alt={friend.name} />
                                                    ) : (
                                                        friend.name?.charAt(0).toUpperCase() || 'U'
                                                    )}
                                                </div>
                                                <span className="fl-name">{friend.name}</span>
                                                <button
                                                    className="fl-more-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setFriendMenuOpen(friendMenuOpen === friend._id ? null : friend._id)
                                                    }}
                                                    title="Tùy chọn"
                                                >
                                                    ···
                                                </button>
                                                {friendMenuOpen === friend._id && (
                                                    <div className="fl-friend-menu">
                                                        <button onClick={(e) => { e.stopPropagation(); handleContactClick(friend); setCurrentView('chat'); setFriendMenuOpen(null) }}>
                                                            Nhắn tin
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleUnfriend(friend._id); setFriendMenuOpen(null) }}>
                                                            Hủy kết bạn
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )
                    })() : friends.length === 0 ? (
                        <div className="empty-state">
                            <p>Chưa có bạn nào. Hãy thêm bạn để bắt đầu!</p>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>Không tìm thấy bạn nào phù hợp</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default FriendsView
