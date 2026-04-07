import React from 'react'
import EmojiPicker from 'emoji-picker-react'
import {
    MdGroup,
    MdMenu,
    MdLink,
    MdEdit,
    MdEmojiEmotions,
    MdAttachFile,
    MdVideocam,
    MdSend,
    MdMoreVert
} from 'react-icons/md'

const ChatView = ({
    conversations,
    selectedContact,
    isCurrentUserMemberOfGroup,
    chatNotice,
    openUserPopup,
    user,
    onlineStatus,
    getUserStatusText,
    showInfoPanel,
    setShowInfoPanel,
    friends,
    sentRequests,
    friendRequests,
    handleUnfriend,
    handleSendRequest,
    messages,
    isSystemGroupMessage,
    isDifferentDay,
    formatDateDivider,
    isGifUrl,
    isImageUrl,
    isVideoUrl,
    isDocumentUrl,
    basenameFromUrl,
    openMediaModal,
    downloadFile,
    formatTime,
    messagesEndRef,
    showMediaModal,
    mediaModalUrl,
    closeMediaModal,
    mediaModalType,
    mediaModalName,
    pendingFile,
    isUploadingFile,
    setPendingFile,
    setUploadProgress,
    fileInputRef2,
    videoInputRef,
    uploadProgress,
    showEmojiPicker,
    setShowEmojiPicker,
    handleFileChange,
    newMessage,
    setNewMessage,
    handleSendMessage,
    emojiPickerRef,
    getMyGroupRoleType,
    groupActionLoading,
    handleOpenAddMembersModal,
    handleGetInviteLink,
    handleRenameGroup,
    getRoleLabel,
    normalizeRoleType,
    handlePromoteMember,
    handleDemoteMember,
    handleRemoveGroupMember,
    handleLeaveGroup,
    handleDeleteGroup,
    toggleBlock,
    handleRecallMessage,
    messageMenuOpen,
    setMessageMenuOpen,
    isBlockedUser,
    getDirectParticipantId,
    blockedUsers
}) => {
    // Extract media and files from messages
    const getMediaAndFiles = () => {
        const mediaList = []
        const fileList = []

        messages.forEach(msg => {
            if (msg.isRecalled) return

            // Check fileUrl first
            if (msg.fileUrl) {
                if (isImageUrl(msg.fileUrl) || isGifUrl(msg.fileUrl)) {
                    mediaList.push({
                        id: msg._id,
                        url: msg.fileUrl,
                        type: 'image',
                        timestamp: msg.createdAt
                    })
                } else if (isVideoUrl(msg.fileUrl)) {
                    mediaList.push({
                        id: msg._id,
                        url: msg.fileUrl,
                        type: 'video',
                        timestamp: msg.createdAt
                    })
                } else if (isDocumentUrl(msg.fileUrl)) {
                    fileList.push({
                        id: msg._id,
                        url: msg.fileUrl,
                        name: basenameFromUrl(msg.fileUrl),
                        timestamp: msg.createdAt
                    })
                }
            }

            // Check content for media
            if (msg.content) {
                if (isImageUrl(msg.content) || isGifUrl(msg.content)) {
                    mediaList.push({
                        id: msg._id + '_content',
                        url: msg.content,
                        type: 'image',
                        timestamp: msg.createdAt
                    })
                } else if (isVideoUrl(msg.content)) {
                    mediaList.push({
                        id: msg._id + '_content',
                        url: msg.content,
                        type: 'video',
                        timestamp: msg.createdAt
                    })
                } else if (isDocumentUrl(msg.content)) {
                    fileList.push({
                        id: msg._id + '_content',
                        url: msg.content,
                        name: basenameFromUrl(msg.content),
                        timestamp: msg.createdAt
                    })
                }
            }
        })

        return { mediaList, fileList }
    }

    const { mediaList, fileList } = getMediaAndFiles()
    return (
        <div className="main-area chat-view">
            {conversations.length === 0 ? (
                <div className="welcome">
                    <h1>CHÀO MỪNG ĐẾN VỚI ZTING</h1>
                    <p>Giao tiếp không khoảng cách, kết nối không giới hạn</p>
                    <p className="instruction">Chọn một bạn bè hoặc bắt đầu một cuộc trò chuyện để tiếp tục.</p>
                </div>
            ) : selectedContact ? (
                <div className="chat-wrapper">
                    <div className="chat-container">
                        {(() => {
                            const removedFromGroup = selectedContact?.type === 'GROUP' && !isCurrentUserMemberOfGroup(selectedContact)
                            if (!removedFromGroup && !chatNotice) return null
                            return (
                                <div style={{ padding: '10px 20px', background: '#fff3cd', color: '#7a5b00', borderBottom: '1px solid #ffe58f', fontSize: '13px' }}>
                                    {chatNotice || 'Bạn không phải thành viên nhóm'}
                                </div>
                            )
                        })()}
                        <div className="chat-header">
                            <div className="chat-header-left">
                                <div
                                    className="chat-avatar-wrapper"
                                    style={{ cursor: selectedContact?.type !== 'GROUP' ? 'pointer' : 'default' }}
                                    onClick={() => {
                                        if (selectedContact?.type !== 'GROUP' && (selectedContact.participantId || selectedContact._id)) {
                                            openUserPopup(selectedContact.participantId || selectedContact._id)
                                        }
                                    }}
                                >
                                    <div className={`chat-avatar ${selectedContact?.type === 'GROUP' ? 'group-chat-avatar' : ''}`}>
                                        {selectedContact?.type === 'GROUP' ? (() => {
                                            const rawGroupParticipants = Array.isArray(selectedContact.participants) ? selectedContact.participants : []
                                            const normalizedGroupParticipants = rawGroupParticipants.map((p) => {
                                                const pId = p.userId?._id || p._id
                                                const pName = p.userId?.name || p.name || 'U'
                                                const pAvatar = p.userId?.avatarUrl || p.avatarUrl || ''
                                                return { _id: pId, name: pName, avatarUrl: pAvatar }
                                            }).filter(p => p._id)
                                            const groupMembersForAvatar = (() => {
                                                const myId = String(user?._id || '')
                                                const others = normalizedGroupParticipants.filter(p => String(p._id) !== myId)
                                                const me = normalizedGroupParticipants.find(p => String(p._id) === myId)
                                                const source = [...others]
                                                if (source.length < 4 && me) {
                                                    source.push(me)
                                                }
                                                if (source.length === 0) {
                                                    return normalizedGroupParticipants.slice(0, 4)
                                                }
                                                return source.slice(0, 4)
                                            })()
                                            const totalGroupMembers = normalizedGroupParticipants.length
                                            const showGroupCountBadge = totalGroupMembers > 4
                                            const groupAvatarItems = (() => {
                                                const visibleItems = groupMembersForAvatar.slice(0, 4)
                                                const baseItems = visibleItems.length > 0
                                                    ? visibleItems
                                                    : [{ _id: selectedContact._id || selectedContact.name, name: selectedContact.name || 'G', avatarUrl: selectedContact.avatarUrl || '' }]

                                                if (!showGroupCountBadge) return baseItems

                                                return baseItems.map((item, index) => {
                                                    if (index !== 3) return item
                                                    return {
                                                        _id: `${item._id || selectedContact._id || selectedContact.name}-count`,
                                                        name: String(totalGroupMembers),
                                                        avatarUrl: '',
                                                        isCount: true
                                                    }
                                                })
                                            })()
                                            const groupAvatarStackCount = groupAvatarItems.length

                                            return (
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
                                            )
                                        })() : (
                                            <>
                                                {selectedContact?.participantAvatar ? (
                                                    <img src={selectedContact.participantAvatar} alt="" />
                                                ) : selectedContact?.avatarUrl ? (
                                                    <img src={selectedContact.avatarUrl} alt="" />
                                                ) : (
                                                    (selectedContact.participantName || selectedContact.name || 'U').charAt(0).toUpperCase()
                                                )}
                                            </>
                                        )}
                                    </div>
                                    {selectedContact?.type !== 'GROUP' && selectedContact?.participantId && (() => {
                                        const userStatus = onlineStatus[String(selectedContact.participantId)]
                                        const isOnline = userStatus?.status === 'online'
                                        return (
                                            <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`}></span>
                                        )
                                    })()}
                                </div>
                                <div className="chat-header-info">
                                    <h2>{selectedContact.name || selectedContact.participantName}</h2>
                                    {selectedContact.type === 'GROUP' ? (
                                        <p className="chat-status">
                                            <MdGroup />
                                            {selectedContact.participants?.length || 0} thành viên
                                        </p>
                                    ) : (
                                        (() => {
                                            const contactId = selectedContact.participantId || selectedContact._id
                                            const text = getUserStatusText(contactId)
                                            return text ? (
                                                <p className="chat-status">{text}</p>
                                            ) : null
                                        })()
                                    )}
                                </div>
                            </div>
                            <MdMenu className="info-toggle" onClick={() => setShowInfoPanel(v => !v)} title="Chi tiet" />
                        </div>
                        <div className="chat-messages">
                            {messages.length === 0 ? (
                                <p className="no-messages">Bạn chưa có tin nhắn nào. Hãy gửi tin nhắn để bắt đầu cuộc trò chuyện!</p>
                            ) : (
                                (() => {
                                    const groups = []
                                    messages.forEach((msg) => {
                                        const isSystem = isSystemGroupMessage(msg)

                                        if (isSystem) {
                                            groups.push({
                                                isSystem: true,
                                                messages: [msg],
                                                createdAt: msg.createdAt
                                            })
                                            return
                                        }

                                        const isMine = String(msg.senderId?._id || msg.senderId) === String(user?._id)

                                        const prevGroup = groups.length ? groups[groups.length - 1] : null
                                        const canAppendToPrev =
                                            prevGroup &&
                                            !prevGroup.isSystem &&
                                            String(prevGroup.senderId) === String(msg.senderId?._id || msg.senderId) &&
                                            prevGroup.isMine === isMine

                                        if (!canAppendToPrev) {
                                            groups.push({
                                                senderId: msg.senderId?._id || msg.senderId,
                                                senderName: msg.senderId?.name,
                                                senderAvatar: msg.senderId?.avatarUrl,
                                                isMine,
                                                messages: [msg],
                                                createdAt: msg.createdAt
                                            })
                                        } else {
                                            prevGroup.messages.push(msg)
                                        }
                                    })

                                    const result = []
                                    groups.forEach((group, groupIdx) => {
                                        const prevGroup = groupIdx > 0 ? groups[groupIdx - 1] : null
                                        const showDateDivider = !prevGroup || isDifferentDay(group.createdAt, prevGroup.createdAt)

                                        if (showDateDivider && group.createdAt) {
                                            result.push(
                                                <div key={`divider-${groupIdx}`} className="date-divider">
                                                    {formatDateDivider(group.createdAt)}
                                                </div>
                                            )
                                        }

                                        if (group.isSystem) {
                                            const sysMsg = group.messages[0]
                                            const sysText = sysMsg?.isRecalled ? 'Tin nhắn đã được thu hồi' : (sysMsg?.content || '')
                                            result.push(
                                                <div key={`system-${groupIdx}`} className="system-message-row">
                                                    <span className="system-message-pill">{sysText}</span>
                                                </div>
                                            )
                                            return
                                        }

                                        result.push(
                                            <div key={`group-${groupIdx}`} className={`message-group ${group.isMine ? 'sent-group' : 'received-group'}`}>
                                                {!group.isMine && (
                                                    <div className="group-avatar" onClick={() => openUserPopup(group.senderId)}>
                                                        {group.senderAvatar ? (
                                                            <img src={group.senderAvatar} alt="" />
                                                        ) : (
                                                            (group.senderName ? group.senderName.charAt(0).toUpperCase() : 'U')
                                                        )}
                                                    </div>
                                                )}
                                                <div className="group-messages">
                                                    {!group.isMine && (
                                                        <div className="group-sender-name">{group.senderName || 'User'}</div>
                                                    )}
                                                    {group.messages.map(msg => {
                                                        const hasAttachmentStyle = Boolean(msg.fileUrl) ||
                                                            isGifUrl(msg.content) ||
                                                            isImageUrl(msg.content) ||
                                                            isVideoUrl(msg.content) ||
                                                            isDocumentUrl(msg.content)

                                                        return (
                                                        <div key={msg._id || msg.id || Math.random()} className={`message-item ${hasAttachmentStyle ? 'media-message' : ''}`}>
                                                            {msg.isRecalled ? (
                                                                <span className="message-content recalled">
                                                                    <em>Tin nhắn đã được thu hồi</em>
                                                                </span>
                                                            ) : (
                                                                <span className="message-content">
                                                                    {msg.fileUrl ? (
                                                                        <>
                                                                            {isGifUrl(msg.fileUrl) ? (
                                                                                <img src={msg.fileUrl} alt="gif" className="message-image" style={{ cursor: 'zoom-in', maxWidth: '300px', borderRadius: '8px' }} onClick={() => openMediaModal(msg.fileUrl, 'image')} />
                                                                            ) : isImageUrl(msg.fileUrl) ? (
                                                                                <img src={msg.fileUrl} alt="attachment" className="message-image" style={{ cursor: 'zoom-in', maxWidth: '300px', borderRadius: '8px' }} onClick={() => openMediaModal(msg.fileUrl, 'image')} />
                                                                            ) : isVideoUrl(msg.fileUrl) ? (
                                                                                <div className="message-video-preview" style={{ position: 'relative', maxWidth: '300px', borderRadius: '8px', cursor: 'pointer', overflow: 'hidden' }} onClick={() => openMediaModal(msg.fileUrl, 'video')}>
                                                                                    <video src={msg.fileUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted preload="metadata" />
                                                                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                        <span style={{ fontSize: 26, color: '#fff', fontWeight: 700 }}>▶</span>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="message-file-card">
                                                                                    <div className="message-file-main">
                                                                                        <span className="message-file-icon">📎</span>
                                                                                        <span className="message-file">{basenameFromUrl(msg.fileUrl)}</span>
                                                                                    </div>
                                                                                    <button className="message-file-download" onClick={() => downloadFile(msg.fileUrl, basenameFromUrl(msg.fileUrl))} title="Tải về">⬇ Tải về</button>
                                                                                </div>
                                                                            )}
                                                                            {msg.content && <div style={{ marginTop: 4 }}>{msg.content}</div>}
                                                                        </>
                                                                    ) : isGifUrl(msg.content) ? (
                                                                        <img src={msg.content} alt="gif" className="message-image" style={{ cursor: 'zoom-in', maxWidth: '300px', borderRadius: '8px' }} onClick={() => openMediaModal(msg.content, 'image')} />
                                                                    ) : isImageUrl(msg.content) ? (
                                                                        <img src={msg.content} alt="image" className="message-image" style={{ cursor: 'zoom-in', maxWidth: '300px', borderRadius: '8px' }} onClick={() => openMediaModal(msg.content, 'image')} />
                                                                    ) : isVideoUrl(msg.content) ? (
                                                                        <div className="message-video-preview" style={{ position: 'relative', maxWidth: '300px', borderRadius: '8px', cursor: 'pointer', overflow: 'hidden' }} onClick={() => openMediaModal(msg.content, 'video')}>
                                                                            <video src={msg.content} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted preload="metadata" />
                                                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                <span style={{ fontSize: 26, color: '#fff', fontWeight: 700 }}>▶</span>
                                                                            </div>
                                                                        </div>
                                                                    ) : isDocumentUrl(msg.content) ? (
                                                                        <div className="message-file-card">
                                                                            <div className="message-file-main">
                                                                                <span className="message-file-icon">📎</span>
                                                                                <span className="message-file">{basenameFromUrl(msg.content)}</span>
                                                                            </div>
                                                                            <button className="message-file-download" onClick={() => downloadFile(msg.content, basenameFromUrl(msg.content))} title="Tải về">⬇ Tải về</button>
                                                                        </div>
                                                                    ) : (
                                                                        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</span>
                                                                    )}
                                                                </span>
                                                            )}
                                                            <div className="message-footer">
                                                                {msg.createdAt && (
                                                                    <span className="message-time">{formatTime(msg.createdAt)}</span>
                                                                )}
                                                                {group.isMine && !msg.isRecalled && (
                                                                    <div className="message-menu-container">
                                                                        <button
                                                                            className="message-menu-btn"
                                                                            onClick={() => setMessageMenuOpen(messageMenuOpen === msg._id ? null : msg._id)}
                                                                            title="Tùy chọn"
                                                                        >
                                                                            <MdMoreVert size={16} />
                                                                        </button>
                                                                        {messageMenuOpen === msg._id && (
                                                                            <div className="message-menu-dropdown">
                                                                                <button
                                                                                    className="message-menu-item"
                                                                                    onClick={() => {
                                                                                        handleRecallMessage(msg._id, msg.conversationId)
                                                                                        setMessageMenuOpen(null)
                                                                                    }}
                                                                                >
                                                                                    Thu hồi tin nhắn
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })

                                    return result
                                })()
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {showMediaModal && mediaModalUrl && (
                            <div onClick={closeMediaModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, flexDirection: 'column', gap: 16 }}>
                                <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
                                    {mediaModalType === 'video' ? (
                                        <video src={mediaModalUrl} controls autoPlay style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8, display: 'block' }} />
                                    ) : (
                                        <img src={mediaModalUrl} alt={mediaModalName || 'media'} style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8, display: 'block' }} />
                                    )}
                                    <button onClick={closeMediaModal} title="Đóng" style={{ position: 'absolute', top: -12, right: -12, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 32, height: 32, fontSize: 18, cursor: 'pointer' }}>✕</button>
                                </div>
                                <button onClick={() => downloadFile(mediaModalUrl, mediaModalName || 'download')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1d4ed8', color: '#fff', padding: '8px 20px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>⬇ Tải về</button>
                            </div>
                        )}

                        <div className="chat-input">
                            {pendingFile && (
                                <div className="chat-file-preview">
                                    <span className="chat-file-preview-name">{pendingFile.name}</span>
                                    <button
                                        disabled={isUploadingFile}
                                        onClick={() => {
                                            setPendingFile(null)
                                            setUploadProgress(0)
                                            if (fileInputRef2.current) fileInputRef2.current.value = ''
                                            if (videoInputRef.current) videoInputRef.current.value = ''
                                        }}
                                        className="chat-file-preview-remove"
                                    >
                                        ✕
                                    </button>
                                    {isUploadingFile && (
                                        <div className="chat-upload-progress">
                                            <div className="chat-upload-progress-text">Đang tải lên: {uploadProgress}%</div>
                                            <div className="chat-upload-progress-bar">
                                                <div className="chat-upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="chat-input-row">
                                <div className="chat-input-left-icons">
                                    <button
                                        className="icon-btn emoji-btn"
                                        title="Emoji"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    >
                                        <MdEmojiEmotions />
                                    </button>
                                    <input
                                        ref={fileInputRef2}
                                        type="file"
                                        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                    />
                                    <button className="icon-btn attach-btn" onClick={() => fileInputRef2.current?.click()} title="Đính kèm">
                                        <MdAttachFile />
                                    </button>
                                    <button className="icon-btn video-btn" onClick={() => videoInputRef.current?.click()} title="Gửi video">
                                        <MdVideocam />
                                    </button>
                                    <input
                                        ref={videoInputRef}
                                        type="file"
                                        accept="video/*"
                                        style={{ display: 'none' }}
                                        onChange={handleFileChange}
                                    />
                                </div>

                                <input
                                    className="chat-text-input"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder="Nhập tin nhắn..."
                                    onKeyDown={async e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            if (isUploadingFile) return
                                            if (!newMessage.trim() && !pendingFile) return
                                            await handleSendMessage()
                                        }
                                    }}
                                />

                                <button className="chat-send-button" onClick={handleSendMessage} disabled={isUploadingFile}>
                                    <MdSend /> {isUploadingFile ? `Đang tải ${uploadProgress}%` : 'Gửi'}
                                </button>
                            </div>

                            {showEmojiPicker && (
                                <div className="emoji-picker-container" ref={emojiPickerRef}>
                                    <EmojiPicker
                                        onEmojiClick={(emojiData) => {
                                            const emoji = emojiData?.emoji || emojiData
                                            setNewMessage(prev => prev + (emoji || ''))
                                            setShowEmojiPicker(false)
                                        }}
                                        width="100%"
                                        height={400}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    {showInfoPanel && selectedContact && (
                        <div className="info-panel">
                            {selectedContact.type === 'GROUP' ? (
                                (() => {
                                    const myRoleType = getMyGroupRoleType(selectedContact)
                                    const canRenameGroup = myRoleType === 'OWNER' || myRoleType === 'DEPUTY'
                                    const canManageMembers = myRoleType === 'OWNER' || myRoleType === 'DEPUTY'
                                    const canManageRoles = myRoleType === 'OWNER'

                                    const rawGroupParticipants = Array.isArray(selectedContact.participants) ? selectedContact.participants : []
                                    const normalizedGroupParticipants = rawGroupParticipants.map((p) => {
                                        const pId = p.userId?._id || p._id
                                        const pName = p.userId?.name || p.name || 'U'
                                        const pAvatar = p.userId?.avatarUrl || p.avatarUrl || ''
                                        return { _id: pId, name: pName, avatarUrl: pAvatar }
                                    }).filter(p => p._id)
                                    const groupMembersForAvatar = (() => {
                                        const myId = String(user?._id || '')
                                        const others = normalizedGroupParticipants.filter(p => String(p._id) !== myId)
                                        const me = normalizedGroupParticipants.find(p => String(p._id) === myId)
                                        const source = [...others]
                                        if (source.length < 4 && me) {
                                            source.push(me)
                                        }
                                        if (source.length === 0) {
                                            return normalizedGroupParticipants.slice(0, 4)
                                        }
                                        return source.slice(0, 4)
                                    })()
                                    const totalGroupMembers = normalizedGroupParticipants.length
                                    const showGroupCountBadge = totalGroupMembers > 4
                                    const groupAvatarItems = (() => {
                                        const visibleItems = groupMembersForAvatar.slice(0, 4)
                                        const baseItems = visibleItems.length > 0
                                            ? visibleItems
                                            : [{ _id: selectedContact._id || selectedContact.name, name: selectedContact.name || 'G', avatarUrl: selectedContact.avatarUrl || '' }]

                                        if (!showGroupCountBadge) return baseItems

                                        return baseItems.map((item, index) => {
                                            if (index !== 3) return item
                                            return {
                                                _id: `${item._id || selectedContact._id || selectedContact.name}-count`,
                                                name: String(totalGroupMembers),
                                                avatarUrl: '',
                                                isCount: true
                                            }
                                        })
                                    })()
                                    const groupAvatarStackCount = groupAvatarItems.length

                                    return (
                                        <>
                                            <div className="info-header">
                                                <div className="avatar-large group-avatar-large">
                                                    <div className={`group-avatar-stack count-${groupAvatarStackCount}`}>
                                                        {groupAvatarItems.map((member, index) => (
                                                            <div className={`group-stack-item pos-${index + 1} ${member.isCount ? 'is-count' : ''}`} key={member._id}>
                                                                {member.isCount ? (
                                                                    <span>{member.name}</span>
                                                                ) : member.avatarUrl ? (
                                                                    <img src={member.avatarUrl} alt={member.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    <span style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#ccc', fontSize: '18px', fontWeight: 'bold' }}>{(member.name || 'G').charAt(0).toUpperCase()}</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <h3>{selectedContact.name}</h3>
                                                <p>{totalGroupMembers} thành viên</p>
                                                <div className="group-actions">
                                                    <button className="member-action-btn" onClick={handleOpenAddMembersModal} disabled={groupActionLoading}>Thêm thành viên</button>
                                                    <MdLink className="action-icon" title="Mã mời nhóm" onClick={handleGetInviteLink} />
                                                    {canRenameGroup && (
                                                        <MdEdit className="action-icon" title="Đổi tên nhóm" onClick={handleRenameGroup} />
                                                    )}
                                                </div>
                                            </div>
                                            <div className="info-body">
                                                <div className="info-section members">
                                                    <h4>Thành viên ({selectedContact.participants?.length || 0})</h4>
                                                    {selectedContact.participants?.map(p => {
                                                        const userId = p.userId?._id || p._id
                                                        const userName = p.userId?.name || p.name || 'User'
                                                        const userAvatar = p.userId?.avatarUrl || p.avatarUrl || ''
                                                        const fullName = `${userName}${String(userId) === String(user?._id) ? ' (Bạn)' : ''}`
                                                        const fullRole = getRoleLabel(p.role)
                                                        const roleType = normalizeRoleType(p.role)
                                                        const isSelf = String(userId) === String(user?._id)
                                                        const canRemove = canManageMembers && !isSelf && roleType !== 'OWNER'
                                                        const canPromote = canManageRoles && !isSelf && roleType === 'MEMBER'
                                                        const canDemote = canManageRoles && !isSelf && roleType === 'DEPUTY'

                                                        return (
                                                            <div className="member-item" key={userId}>
                                                                <div className="member-main" title={`${fullName} - ${fullRole}`}>
                                                                    <div className="member-avatar">
                                                                        {userAvatar ? (
                                                                            <img src={userAvatar} alt={userName} />
                                                                        ) : (
                                                                            (userName || 'U').charAt(0).toUpperCase()
                                                                        )}
                                                                    </div>
                                                                    <div className="member-meta">
                                                                        <span className="member-name">{fullName}</span>
                                                                        <span className="member-role">{fullRole}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="member-actions-inline">
                                                                    {canPromote && (
                                                                        <button className="member-action-btn" onClick={() => handlePromoteMember(userId, userName)} disabled={groupActionLoading}>Phó nhóm</button>
                                                                    )}
                                                                    {canDemote && (
                                                                        <button className="member-action-btn member-action-warn" onClick={() => handleDemoteMember(userId, userName)} disabled={groupActionLoading}>Thu hồi quyền</button>
                                                                    )}
                                                                    {canRemove && (
                                                                        <button className="member-action-btn member-action-danger" onClick={() => handleRemoveGroupMember(userId, userName)} disabled={groupActionLoading}>Xóa</button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                                <div className="info-section">
                                                    <h4>Ảnh/Video</h4>
                                                    {mediaList.length > 0 ? (
                                                        <div className="media-grid">
                                                            {mediaList.map(media => (
                                                                <div
                                                                    key={media.id}
                                                                    className="media-item"
                                                                    onClick={() => openMediaModal(media.url, media.type)}
                                                                    title={media.type === 'video' ? 'Nhấn để xem video' : 'Nhấn để xem ảnh'}
                                                                >
                                                                    {media.type === 'image' ? (
                                                                        <img src={media.url} alt="thumbnail" />
                                                                    ) : (
                                                                        <div className="video-thumbnail">
                                                                            <video src={media.url} />
                                                                            <div className="play-icon">▶</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="no-content">Chưa có ảnh/video</p>
                                                    )}
                                                </div>
                                                <div className="info-section">
                                                    <h4>File</h4>
                                                    {fileList.length > 0 ? (
                                                        <div className="file-list">
                                                            {fileList.map(file => (
                                                                <div key={file.id} className="file-item">
                                                                    <span className="file-name" title={file.name}>{file.name}</span>
                                                                    <button
                                                                        className="file-download-btn"
                                                                        onClick={() => downloadFile(file.url, file.name)}
                                                                        title="Tải về"
                                                                    >
                                                                        ⬇
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="no-content">Chưa có file</p>
                                                    )}
                                                </div>

                                                <div className="group-footer-actions">
                                                    <button className="btn-danger" onClick={handleLeaveGroup} disabled={groupActionLoading}>Rời nhóm</button>
                                                    {myRoleType === 'OWNER' && (
                                                        <button className="btn-danger" onClick={handleDeleteGroup} disabled={groupActionLoading}>Xóa nhóm</button>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )
                                })()
                            ) : (
                                <>
                                    <div className="info-header">
                                        <div className="avatar-large">
                                            {selectedContact?.participantAvatar ? (
                                                <img src={selectedContact.participantAvatar} alt={selectedContact.participantName || selectedContact.name || 'avatar'} />
                                            ) : selectedContact?.avatarUrl ? (
                                                <img src={selectedContact.avatarUrl} alt={selectedContact.participantName || selectedContact.name || 'avatar'} />
                                            ) : (
                                                (selectedContact.participantName || selectedContact.name || 'U').charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <h3>{selectedContact.participantName || selectedContact.name}</h3>
                                        {(() => {
                                            const contactId = selectedContact.participantId || selectedContact._id
                                            const text = getUserStatusText(contactId)
                                            return text ? (
                                                <p className="info-status">{text}</p>
                                            ) : null
                                        })()}
                                        <div className="info-buttons">
                                            {(() => {
                                                const directContactId = getDirectParticipantId
                                                    ? getDirectParticipantId(selectedContact)
                                                    : selectedContact.participantId
                                                const blocked = directContactId
                                                    ? (isBlockedUser?.(directContactId) || blockedUsers.includes(directContactId))
                                                    : false
                                                return (
                                                    <button className="btn-block" onClick={toggleBlock}>
                                                        {blocked ? 'Bỏ chặn' : 'Chặn'}
                                                    </button>
                                                )
                                            })()}
                                            {(() => {
                                                const contactId = selectedContact.participantId || selectedContact._id
                                                const isFriend = friends.some(f => f._id === contactId)
                                                const sentRequest = sentRequests.find(r => {
                                                    const toId = r.toUserId?._id || r.toUserId
                                                    return toId === contactId
                                                })
                                                const incomingRequest = friendRequests.find(r => {
                                                    const fromId = r.fromUserId?._id || r.fromUserId
                                                    return fromId === contactId
                                                })

                                                if (isFriend) {
                                                    return (
                                                        <button className="btn-unfriend" onClick={() => handleUnfriend(contactId)}>
                                                            Hủy kết bạn
                                                        </button>
                                                    )
                                                } else if (sentRequest) {
                                                    return (
                                                        <button className="btn-warning" disabled>
                                                            Đã gửi
                                                        </button>
                                                    )
                                                } else if (incomingRequest) {
                                                    return (
                                                        <button className="btn" onClick={() => handleUnfriend(contactId)}>
                                                            Cách từ chối
                                                        </button>
                                                    )
                                                } else {
                                                    return (
                                                        <button className="btn" onClick={() => handleSendRequest(contactId)}>
                                                            Kết bạn
                                                        </button>
                                                    )
                                                }
                                            })()}
                                        </div>
                                    </div>
                                    <div className="info-body">
                                        <div className="info-section">
                                            <h4>Ảnh/Video</h4>
                                            {mediaList.length > 0 ? (
                                                <div className="media-grid">
                                                    {mediaList.map(media => (
                                                        <div
                                                            key={media.id}
                                                            className="media-item"
                                                            onClick={() => openMediaModal(media.url, media.type)}
                                                            title={media.type === 'video' ? 'Nhấn để xem video' : 'Nhấn để xem ảnh'}
                                                        >
                                                            {media.type === 'image' ? (
                                                                <img src={media.url} alt="thumbnail" />
                                                            ) : (
                                                                <div className="video-thumbnail">
                                                                    <video src={media.url} />
                                                                    <div className="play-icon">▶</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="no-content">Chưa có ảnh/video</p>
                                            )}
                                        </div>
                                        <div className="info-section">
                                            <h4>File</h4>
                                            {fileList.length > 0 ? (
                                                <div className="file-list">
                                                    {fileList.map(file => (
                                                        <div key={file.id} className="file-item">
                                                            <span className="file-name" title={file.name}>{file.name}</span>
                                                            <button
                                                                className="file-download-btn"
                                                                onClick={() => downloadFile(file.url, file.name)}
                                                                title="Tải về"
                                                            >
                                                                ⬇
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="no-content">Chưa có file</p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="welcome">
                    <h1>CHÀO MỪNG ĐẾN VỚI ZTING</h1>
                    <p>Giao tiếp không khoảng cách, kết nối không giới hạn</p>
                </div>
            )}
        </div>
    )
}

export default ChatView
