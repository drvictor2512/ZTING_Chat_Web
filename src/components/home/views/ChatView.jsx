import React, { useEffect, useMemo, useRef, useState } from 'react'
import EmojiPicker from 'emoji-picker-react'
import {
    MdGroup,
    MdMenu,
    MdLink,
    MdEdit,
    MdEmojiEmotions,
    MdAttachFile,
    MdVideoLibrary,
    MdCallEnd,
    MdVideocam,
    MdVideocamOff,
    MdMic,
    MdMicOff,
    MdFullscreen,
    MdFullscreenExit,
    MdSend,
    MdMoreVert,
    MdReply,
    MdForward,
    MdClose
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
    pendingFiles,
    isUploadingFile,
    setPendingFiles,
    setUploadProgress,
    fileInputRef2,
    videoInputRef,
    uploadProgress,
    showEmojiPicker,
    setShowEmojiPicker,
    handleFileChange,
    handleVideoFileChange,
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
    handleToggleMessageReaction,
    handleToggleMessagePin,
    hasMyReaction,
    messageMenuOpen,
    setMessageMenuOpen,
    isBlockedUser,
    getDirectParticipantId,
    blockedUsers,
    handleReplyMessage,
    handleForwardMessage,
    replyingTo,
    setReplyingTo,
    showForwardPopup,
    setShowForwardPopup,
    setMessageToForward,
    isDirectChatBlocked,
    directChatBlockedReason,
    isDirectBlockedByMe,
    isDirectBlockedByPeer,
    incomingCall,
    activeCall,
    localCallStream,
    remoteCallStreams,
    onStartDirectCall,
    onStartGroupCall,
    onAcceptIncomingCall,
    onRejectIncomingCall,
    onEndActiveCall,
    onToggleCallAudio,
    onToggleCallVideo,
    callAudioEnabled,
    callVideoEnabled,
    getUserDisplayNameById
}) => {
    const BASIC_REACTIONS = ['👍', '❤️', '😂', '😮', '😢']
    const [pinMenuOpen, setPinMenuOpen] = useState(false)
    const [pinListOpen, setPinListOpen] = useState(false)
    const [isCallMaximized, setIsCallMaximized] = useState(false)
    const [isCallFullscreen, setIsCallFullscreen] = useState(false)
    const [callDurationSeconds, setCallDurationSeconds] = useState(0)
    const [reactHoverMessageId, setReactHoverMessageId] = useState(null)
    const reactionHideTimerRef = useRef(null)
    const messageRefs = useRef(new Map())
    const callPanelRef = useRef(null)

    const handleReactionHoverEnter = (messageId) => {
        if (reactionHideTimerRef.current) {
            clearTimeout(reactionHideTimerRef.current)
            reactionHideTimerRef.current = null
        }
        setReactHoverMessageId(messageId)
    }

    const handleReactionHoverLeave = (messageId) => {
        if (reactionHideTimerRef.current) {
            clearTimeout(reactionHideTimerRef.current)
        }
        reactionHideTimerRef.current = setTimeout(() => {
            setReactHoverMessageId((prev) => (prev === messageId ? null : prev))
            reactionHideTimerRef.current = null
        }, 180)
    }

    const getMyReactionEmoji = (msg) => {
        const myId = String(user?._id || '')
        if (!myId) return ''
        const reactions = Array.isArray(msg?.reactions) ? msg.reactions : []
        const mine = reactions.find((reaction) => String(reaction?.userId?._id || reaction?.userId) === myId)
        return String(mine?.emoji || '')
    }

    const summarizeReactions = (msg) => {
        const reactions = Array.isArray(msg?.reactions) ? msg.reactions : []
        if (!reactions.length) return ''

        const grouped = new Map()
        reactions.forEach((reaction) => {
            const emoji = String(reaction?.emoji || '').trim()
            if (!emoji) return
            grouped.set(emoji, (grouped.get(emoji) || 0) + 1)
        })

        if (!grouped.size) return ''
        return Array.from(grouped.entries())
            .map(([emoji, count]) => `${emoji} ${count}`)
            .join('   ')
    }

    const pinnedMessages = useMemo(() => {
        const pinned = (messages || []).filter((msg) => Boolean(msg?.pinnedAt))
        return [...pinned].sort((a, b) =>
            new Date(b.pinnedAt || 0).getTime() - new Date(a.pinnedAt || 0).getTime()
        )
    }, [messages])

    const primaryPinnedMessage = pinnedMessages[0] || null
    const pinnedCount = pinnedMessages.length

    useEffect(() => {
        setPinMenuOpen(false)
        setPinListOpen(false)
    }, [selectedContact?._id])

    useEffect(() => {
        if (!activeCall) {
            setIsCallMaximized(false)
            setIsCallFullscreen(false)
            setCallDurationSeconds(0)
        }
    }, [activeCall])

    useEffect(() => {
        const updateFullscreenState = () => {
            const isFullscreen = document.fullscreenElement === callPanelRef.current
            setIsCallFullscreen(isFullscreen)
        }

        document.addEventListener('fullscreenchange', updateFullscreenState)
        return () => {
            document.removeEventListener('fullscreenchange', updateFullscreenState)
        }
    }, [])

    useEffect(() => {
        if (!activeCall || activeCall.status === 'calling') {
            setCallDurationSeconds(0)
            return
        }

        const startedAt = Number(activeCall?.startedAt || Date.now())
        const tick = () => {
            const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
            setCallDurationSeconds(elapsed)
        }

        tick()
        const timerId = window.setInterval(tick, 1000)

        return () => {
            window.clearInterval(timerId)
        }
    }, [activeCall])

    useEffect(() => {
        if (activeCall) return
        if (document.fullscreenElement === callPanelRef.current) {
            document.exitFullscreen().catch(() => { })
        }
    }, [activeCall])

    const formatCallDuration = (seconds = 0) => {
        const total = Math.max(0, Number(seconds) || 0)
        const hh = Math.floor(total / 3600)
        const mm = Math.floor((total % 3600) / 60)
        const ss = total % 60
        if (hh > 0) {
            return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
        }
        return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    }

    const handleToggleCallFullscreen = async () => {
        const panelNode = callPanelRef.current
        if (!panelNode) return

        try {
            if (document.fullscreenElement === panelNode) {
                await document.exitFullscreen()
                setIsCallFullscreen(false)
                return
            }

            await panelNode.requestFullscreen()
            setIsCallFullscreen(true)
        } catch {
            // Fallback về layout maximize nếu browser từ chối fullscreen API.
            setIsCallMaximized((prev) => !prev)
        }
    }

    const getPinnedPreview = (msg) => {
        if (!msg) return ''
        const text = String(msg.content || '').trim()
        if (text) return text

        const fileUrls = getMessageFileUrls(msg)
        if (!fileUrls.length) return 'Tin nhắn đính kèm'
        if (fileUrls.every((url, index) => getAttachmentKind(msg, url, index) === 'image')) return '[Ảnh]'
        if (fileUrls.every((url, index) => getAttachmentKind(msg, url, index) === 'video')) return '[Video]'
        return '[File]'
    }

    const scrollToPinnedMessage = (messageId) => {
        if (!messageId) return
        const node = messageRefs.current.get(String(messageId))
        if (!node) return
        node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    const composerDisabled = Boolean(
        isUploadingFile || (selectedContact?.type === 'DIRECT' && isDirectChatBlocked)
    )

    // Extract media and files from messages
    const getMessageFileUrls = (msg) => {
        const direct = Array.isArray(msg?.fileUrls) ? msg.fileUrls : []
        const legacy = msg?.fileUrl ? [msg.fileUrl] : []
        return [...direct, ...legacy]
            .map((item) => String(item || '').trim())
            .filter(Boolean)
            .filter((url, index, arr) => arr.indexOf(url) === index)
    }

    const getAttachmentKind = (msg, url, index) => {
        const hintedKinds = Array.isArray(msg?.fileKinds) ? msg.fileKinds : []
        const hinted = String(hintedKinds[index] || '').toLowerCase()

        if (hinted === 'image' || hinted === 'video' || hinted === 'file') {
            return hinted
        }
        if (isImageUrl(url) || isGifUrl(url)) return 'image'
        if (isVideoUrl(url)) return 'video'
        return 'file'
    }

    const getMediaAndFiles = () => {
        const mediaList = []
        const fileList = []

        messages.forEach(msg => {
            if (msg.isRecalled) return

            const fileUrls = getMessageFileUrls(msg)

            // Check file urls first
            fileUrls.forEach((fileUrl, idx) => {
                const attachmentKind = getAttachmentKind(msg, fileUrl, idx)

                if (attachmentKind === 'image') {
                    mediaList.push({
                        id: `${msg._id}-${idx}`,
                        url: fileUrl,
                        type: 'image',
                        timestamp: msg.createdAt
                    })
                } else if (attachmentKind === 'video') {
                    mediaList.push({
                        id: `${msg._id}-${idx}`,
                        url: fileUrl,
                        type: 'video',
                        timestamp: msg.createdAt
                    })
                } else {
                    fileList.push({
                        id: `${msg._id}-${idx}`,
                        url: fileUrl,
                        name: basenameFromUrl(fileUrl),
                        timestamp: msg.createdAt
                    })
                }
            })

            // Check content for media
            if (msg.content) {
                const normalizedContent = String(msg.content).trim()
                const isAttachmentPlaceholder = /^(\[(Ảnh|Video|File)\])/i.test(normalizedContent)
                const isDuplicatedAttachmentUrl = fileUrls.includes(normalizedContent)

                if (!normalizedContent || isAttachmentPlaceholder || isDuplicatedAttachmentUrl) {
                    return
                }

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

    const hasMessageAttachments = (msg) => getMessageFileUrls(msg).length > 0

    const activeCallModeLabel = activeCall?.callMode === 'audio' ? 'Cuộc gọi thoại' : 'Cuộc gọi video'
    const incomingCallModeLabel = incomingCall?.callMode === 'audio' ? 'Cuộc gọi thoại đến' : 'Cuộc gọi video đến'
    const callParticipantCount = 1 + (remoteCallStreams?.length || 0)
    const hasLocalVideoTrack = Boolean(localCallStream?.getVideoTracks?.()?.length)

    const parseCallLog = (content) => {
        const text = String(content || '').trim()
        if (!text.startsWith('__CALL__:')) return null

        try {
            const payload = JSON.parse(text.slice('__CALL__:'.length))
            const isAudio = String(payload?.callType || 'video') === 'audio'
            const title = isAudio ? 'Cuộc gọi thoại' : 'Cuộc gọi video'
            const type = String(payload?.type || '').toLowerCase()
            const direction = String(payload?.direction || '').toLowerCase()
            const duration = Number(payload?.duration || 0)

            let subtitle = 'Cuộc gọi kết thúc'
            if (type === 'rejected') subtitle = direction === 'outgoing' ? 'Bạn đã gọi nhưng bị từ chối' : 'Cuộc gọi bị từ chối'
            else if (type === 'missed') subtitle = 'Cuộc gọi nhỡ'
            else if (type === 'cancelled') subtitle = direction === 'outgoing' ? 'Bạn đã huỷ' : 'Người gọi đã huỷ'
            else if (type === 'answered') subtitle = duration > 0 ? `Đã gọi ${duration} giây` : 'Cuộc gọi kết thúc'

            return { title, subtitle }
        } catch {
            return { title: 'Cuộc gọi video', subtitle: 'Cuộc gọi kết thúc' }
        }
    }

    const renderMessageAttachments = (msg) => {
        if (msg?.isRecalled) return null
        const fileUrls = getMessageFileUrls(msg)
        if (!fileUrls.length) return null
        const uploadPercent = Number(msg?.uploadProgress || 0)
        const showUploadOverlay = Boolean(msg?.isUploading)

        const imageUrls = []
        const videoUrls = []
        const docUrls = []

        fileUrls.forEach((url, index) => {
            const attachmentKind = getAttachmentKind(msg, url, index)
            if (attachmentKind === 'image') {
                imageUrls.push(url)
                return
            }
            if (attachmentKind === 'video') {
                videoUrls.push(url)
                return
            }
            docUrls.push(url)
        })

        return (
            <div className="message-attachments-wrap">
                {imageUrls.length > 1 ? (
                    <div className="message-media-row">
                        {imageUrls.map((url, index) => (
                            <div key={`${msg._id}-img-${index}`} className="message-image-wrap">
                                <img
                                    src={url}
                                    alt="attachment"
                                    className="message-image message-image-multi"
                                    onClick={() => openMediaModal(url, 'image')}
                                />
                                {showUploadOverlay && (
                                    <div className="message-upload-overlay">
                                        <div className="message-upload-ring" style={{ '--upload-progress': `${uploadPercent}%` }}>
                                            <span>{uploadPercent}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : imageUrls.map((url, index) => (
                    <div key={`${msg._id}-img-${index}`} className="message-image-wrap">
                        <img
                            src={url}
                            alt="attachment"
                            className="message-image"
                            onClick={() => openMediaModal(url, 'image')}
                        />
                        {showUploadOverlay && (
                            <div className="message-upload-overlay">
                                <div className="message-upload-ring" style={{ '--upload-progress': `${uploadPercent}%` }}>
                                    <span>{uploadPercent}%</span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {videoUrls.map((url, index) => (
                    <div
                        key={`${msg._id}-video-${index}`}
                        className="message-video-preview"
                        style={{ position: 'relative', maxWidth: '300px', borderRadius: '8px', cursor: 'pointer', overflow: 'hidden' }}
                        onClick={() => openMediaModal(url, 'video')}
                    >
                        <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted preload="metadata" />
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 26, color: '#fff', fontWeight: 700 }}>▶</span>
                        </div>
                    </div>
                ))}

                {docUrls.map((url, index) => (
                    <div className="message-file-card" key={`${msg._id}-file-${index}`}>
                        <div className="message-file-main">
                            <span className="message-file-icon">📎</span>
                            <span className="message-file">{basenameFromUrl(url)}</span>
                        </div>
                        <button className="message-file-download" onClick={() => downloadFile(url, basenameFromUrl(url))} title="Tải về">⬇ Tải về</button>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="main-area chat-view">
            {incomingCall ? (
                <div className="call-zalo-overlay">
                    <div className="call-zalo-incoming">
                        <div className="call-zalo-avatar-ring">
                            <div className="call-zalo-avatar-core">
                                {(incomingCall?.fromUserName || 'U').charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <h3>{incomingCall.fromUserName || 'Người dùng'}</h3>
                        <p>{incomingCallModeLabel}</p>
                        <div className="call-zalo-ringing-text">
                            <span className="dot" />
                            Đang đổ chuông
                        </div>
                        <div className="call-zalo-actions">
                            <button type="button" className="call-zalo-btn accept" onClick={onAcceptIncomingCall}>
                                <MdVideocam />
                                Nhận
                            </button>
                            <button type="button" className="call-zalo-btn reject" onClick={onRejectIncomingCall}>
                                <MdCallEnd />
                                Từ chối
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

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
                            <div className="chat-header-actions">
                                {selectedContact?.type === 'DIRECT' ? (
                                    <>
                                        <button
                                            type="button"
                                            className="chat-call-btn zalo-video"
                                            title="Gọi video"
                                            onClick={onStartDirectCall}
                                            disabled={Boolean(activeCall)}
                                        >
                                            <MdVideocam />
                                        </button>
                                    </>
                                ) : null}
                                {selectedContact?.type === 'GROUP' ? (
                                    <>
                                        <button
                                            type="button"
                                            className="chat-call-btn zalo-video"
                                            title="Gọi video nhóm"
                                            onClick={onStartGroupCall}
                                            disabled={Boolean(activeCall)}
                                        >
                                            <MdVideocam />
                                        </button>
                                    </>
                                ) : null}
                                <MdMenu className="info-toggle" onClick={() => setShowInfoPanel(v => !v)} title="Chi tiet" />
                            </div>
                        </div>

                        {primaryPinnedMessage ? (
                            <div className="chat-pinned-bar">
                                <button
                                    className="chat-pinned-main chat-pinned-jump"
                                    onClick={() => scrollToPinnedMessage(primaryPinnedMessage._id)}
                                >
                                    <span className="chat-pinned-icon">📌</span>
                                    <span className="chat-pinned-text" title={getPinnedPreview(primaryPinnedMessage)}>
                                        {getPinnedPreview(primaryPinnedMessage)}
                                    </span>
                                </button>
                                <div className="chat-pinned-actions">
                                    {pinnedCount > 1 ? (
                                        <button
                                            className="chat-pinned-count-btn"
                                            title="Xem danh sách ghim"
                                            onClick={() => setPinListOpen((prev) => !prev)}
                                        >
                                            +{pinnedCount - 1} ghim
                                        </button>
                                    ) : null}
                                    <button
                                        className="chat-pinned-menu-btn"
                                        title="Tùy chọn ghim"
                                        onClick={() => setPinMenuOpen((prev) => !prev)}
                                    >
                                        <MdMoreVert size={18} />
                                    </button>
                                    {pinMenuOpen ? (
                                        <div className="chat-pinned-menu-dropdown">
                                            <button
                                                className="message-menu-item"
                                                onClick={() => {
                                                    handleToggleMessagePin(primaryPinnedMessage)
                                                    setPinMenuOpen(false)
                                                }}
                                            >
                                                Bỏ ghim
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}

                        {pinListOpen && pinnedMessages.length > 0 ? (
                            <div className="chat-pinned-list-panel">
                                <div className="chat-pinned-list-header">
                                    Danh sách ghim ({pinnedCount})
                                </div>
                                <div className="chat-pinned-list-body">
                                    {pinnedMessages.map((msg) => (
                                        <div className="chat-pinned-list-item" key={msg._id}>
                                            <button
                                                className="chat-pinned-list-jump"
                                                title={getPinnedPreview(msg)}
                                                onClick={() => scrollToPinnedMessage(msg._id)}
                                            >
                                                <span className="chat-pinned-list-title">Tin nhắn</span>
                                                <span className="chat-pinned-list-preview">{getPinnedPreview(msg)}</span>
                                            </button>
                                            <button
                                                className="chat-pinned-list-unpin"
                                                onClick={() => handleToggleMessagePin(msg)}
                                            >
                                                Bỏ ghim
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}

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
                                                    {group.messages.map((msg, messageIdx) => {
                                                        const myReactionEmoji = getMyReactionEmoji(msg)
                                                        const hasAttachmentStyle = hasMessageAttachments(msg) ||
                                                            isGifUrl(msg.content) ||
                                                            isImageUrl(msg.content) ||
                                                            isVideoUrl(msg.content) ||
                                                            isDocumentUrl(msg.content)
                                                        const callLogData = parseCallLog(msg?.content)

                                                        return (
                                                            <div
                                                                key={msg._id || msg.id || `msg-${groupIdx}-${messageIdx}`}
                                                                className={`message-item ${hasAttachmentStyle ? 'media-message' : ''}`}
                                                                ref={(node) => {
                                                                    const id = String(msg._id || msg.id || '')
                                                                    if (!id) return
                                                                    if (node) messageRefs.current.set(id, node)
                                                                    else messageRefs.current.delete(id)
                                                                }}
                                                            >
                                                                {msg.isRecalled ? (
                                                                    <span className="message-content recalled">
                                                                        <em>Tin nhắn đã được thu hồi</em>
                                                                    </span>
                                                                ) : (
                                                                    <span className="message-content">
                                                                        {/* Reply preview */}
                                                                        {msg.replyTo && (
                                                                            <div className="message-reply-preview">
                                                                                <div className="reply-preview-bar"></div>
                                                                                <div className="reply-preview-content">
                                                                                    <span className="reply-preview-name">
                                                                                        {(() => {
                                                                                            const replySender = msg.replyTo.senderId
                                                                                            if (typeof replySender === 'object' && replySender?.name) {
                                                                                                return replySender.name
                                                                                            }
                                                                                            if (typeof replySender === 'object' && replySender?._id) {
                                                                                                const senderId = String(replySender._id)
                                                                                                const foundParticipant = selectedContact?.participants?.find(p => {
                                                                                                    const pId = p._id || p.userId?._id
                                                                                                    return String(pId) === senderId
                                                                                                })
                                                                                                if (foundParticipant) {
                                                                                                    return foundParticipant.name || foundParticipant.userId?.name || 'Người dùng'
                                                                                                }
                                                                                            }
                                                                                            if (typeof replySender === 'string') {
                                                                                                const foundParticipant = selectedContact?.participants?.find(p => {
                                                                                                    const pId = p._id || p.userId?._id
                                                                                                    return String(pId) === replySender
                                                                                                })
                                                                                                if (foundParticipant) {
                                                                                                    return foundParticipant.name || foundParticipant.userId?.name || 'Người dùng'
                                                                                                }
                                                                                            }
                                                                                            return 'Người dùng'
                                                                                        })()}
                                                                                    </span>
                                                                                    <span className="reply-preview-text">
                                                                                        {msg.replyTo.content?.length > 50 
                                                                                            ? msg.replyTo.content.substring(0, 50) + '...' 
                                                                                            : msg.replyTo.content || '[Tin nhắn đã bị xóa]'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {/* Forwarded indicator */}
                                                                        {msg.isForwarded && (
                                                                            <div className="message-forwarded-indicator">
                                                                                <MdForward size={12} />
                                                                                <span>Đã chuyển tiếp từ {msg.forwardedFrom?.originalSenderId?.name || 'tin nhắn khác'}</span>
                                                                            </div>
                                                                        )}
                                                                        {hasMessageAttachments(msg) ? renderMessageAttachments(msg) : null}
                                                                        {hasMessageAttachments(msg) && msg.content && !/^(\[(Ảnh|Video|File)\])/i.test(String(msg.content).trim()) ? (
                                                                            <div style={{ marginTop: hasMessageAttachments(msg) ? 6 : 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
                                                                        ) : null}
                                                                        {!hasMessageAttachments(msg) && isGifUrl(msg.content) ? (
                                                                            <img src={msg.content} alt="gif" className="message-image" style={{ cursor: 'zoom-in', maxWidth: '300px', borderRadius: '8px' }} onClick={() => openMediaModal(msg.content, 'image')} />
                                                                        ) : !hasMessageAttachments(msg) && isImageUrl(msg.content) ? (
                                                                            <img src={msg.content} alt="image" className="message-image" style={{ cursor: 'zoom-in', maxWidth: '300px', borderRadius: '8px' }} onClick={() => openMediaModal(msg.content, 'image')} />
                                                                        ) : !hasMessageAttachments(msg) && isVideoUrl(msg.content) ? (
                                                                            <div className="message-video-preview" style={{ position: 'relative', maxWidth: '300px', borderRadius: '8px', cursor: 'pointer', overflow: 'hidden' }} onClick={() => openMediaModal(msg.content, 'video')}>
                                                                                <video src={msg.content} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted preload="metadata" />
                                                                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                    <span style={{ fontSize: 26, color: '#fff', fontWeight: 700 }}>▶</span>
                                                                                </div>
                                                                            </div>
                                                                        ) : !hasMessageAttachments(msg) && isDocumentUrl(msg.content) ? (
                                                                            <div className="message-file-card">
                                                                                <div className="message-file-main">
                                                                                    <span className="message-file-icon">📎</span>
                                                                                    <span className="message-file">{basenameFromUrl(msg.content)}</span>
                                                                                </div>
                                                                                <button className="message-file-download" onClick={() => downloadFile(msg.content, basenameFromUrl(msg.content))} title="Tải về">⬇ Tải về</button>
                                                                            </div>
                                                                        ) : !hasMessageAttachments(msg) && callLogData ? (
                                                                            <div style={{ minWidth: 220 }}>
                                                                                <div style={{ fontWeight: 700 }}>{callLogData.title}</div>
                                                                                <div style={{ opacity: 0.85, marginTop: 2 }}>{callLogData.subtitle}</div>
                                                                            </div>
                                                                        ) : (
                                                                            !hasMessageAttachments(msg) ? <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</span> : null
                                                                        )}
                                                                    </span>
                                                                )}
                                                                <div className="message-footer">
                                                                    {msg.createdAt && (
                                                                        <span className="message-time">{formatTime(msg.createdAt)}</span>
                                                                    )}
                                                                    {msg.pinnedAt && (
                                                                        <span className="message-time" style={{ marginLeft: 6 }}>📌</span>
                                                                    )}
                                                                    {!msg.isRecalled && (
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
                                                                                            handleToggleMessagePin(msg)
                                                                                            setMessageMenuOpen(null)
                                                                                        }}
                                                                                    >
                                                                                        {msg.pinnedAt ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
                                                                                    </button>
                                                                                    {group.isMine ? (
                                                                                        <button
                                                                                            className="message-menu-item"
                                                                                            onClick={() => {
                                                                                                handleRecallMessage(msg._id, msg.conversationId)
                                                                                                setMessageMenuOpen(null)
                                                                                            }}
                                                                                        >
                                                                                            Thu hồi tin nhắn
                                                                                        </button>
                                                                                    ) : null}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Reply and Forward buttons */}
                                                                    {!msg.isRecalled && (
                                                                        <div className="message-action-buttons">
                                                                            <button
                                                                                className="message-action-btn"
                                                                                title="Trả lời"
                                                                                onClick={() => handleReplyMessage && handleReplyMessage(msg)}
                                                                            >
                                                                                <MdReply size={16} />
                                                                            </button>
                                                                            <button
                                                                                className="message-action-btn"
                                                                                title="Chuyển tiếp"
                                                                                onClick={() => {
                                                                                    if (setMessageToForward) setMessageToForward(msg)
                                                                                    if (setShowForwardPopup) setShowForwardPopup(true)
                                                                                }}
                                                                            >
                                                                                <MdForward size={16} />
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    {!msg.isRecalled ? (
                                                                        <div
                                                                            className="message-reaction-actions"
                                                                            onMouseEnter={() => handleReactionHoverEnter(msg._id)}
                                                                            onMouseLeave={() => handleReactionHoverLeave(msg._id)}
                                                                        >
                                                                            <button
                                                                                className={`message-react-icon ${hasMyReaction(msg) ? 'active' : ''}`}
                                                                                title="Thả cảm xúc"
                                                                                onClick={() => setReactHoverMessageId((prev) => (prev === msg._id ? null : msg._id))}
                                                                            >
                                                                                👍
                                                                            </button>

                                                                            {reactHoverMessageId === msg._id ? (
                                                                                <div
                                                                                    className="message-react-picker"
                                                                                    onMouseEnter={() => handleReactionHoverEnter(msg._id)}
                                                                                    onMouseLeave={() => handleReactionHoverLeave(msg._id)}
                                                                                >
                                                                                    {BASIC_REACTIONS.map((emoji) => (
                                                                                        <button
                                                                                            key={`${msg._id}-${emoji}`}
                                                                                            className={`message-react-emoji ${myReactionEmoji === emoji ? 'active' : ''}`}
                                                                                            onClick={() => {
                                                                                                handleToggleMessageReaction(msg, emoji, { remove: false })
                                                                                                setReactHoverMessageId(null)
                                                                                            }}
                                                                                        >
                                                                                            {emoji}
                                                                                        </button>
                                                                                    ))}
                                                                                    {myReactionEmoji ? (
                                                                                        <button
                                                                                            className="message-react-emoji message-react-remove"
                                                                                            title="Bỏ cảm xúc"
                                                                                            onClick={() => {
                                                                                                handleToggleMessageReaction(msg, '', { remove: true })
                                                                                                setReactHoverMessageId(null)
                                                                                            }}
                                                                                        >
                                                                                            ✕
                                                                                        </button>
                                                                                    ) : null}
                                                                                </div>
                                                                            ) : null}
                                                                        </div>
                                                                    ) : null}
                                                                </div>

                                                                {summarizeReactions(msg) ? (
                                                                    <div style={{ marginTop: 4 }}>
                                                                        <span className="message-time" style={{ fontSize: 11, color: '#4b5563' }}>
                                                                            {summarizeReactions(msg)}
                                                                        </span>
                                                                    </div>
                                                                ) : null}
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
                            {/* Reply preview */}
                            {replyingTo && (
                                <div className="chat-reply-preview">
                                    <div className="reply-preview-left">
                                        <MdReply size={18} color="#1d4ed8" />
                                        <div className="reply-preview-info">
                                            <span className="reply-preview-label">Đang trả lời <strong>{(() => {
                                                const replySender = replyingTo.senderId
                                                if (typeof replySender === 'object' && replySender?.name) {
                                                    return replySender.name
                                                }
                                                if (typeof replySender === 'object' && replySender?._id) {
                                                    const senderId = String(replySender._id)
                                                    const foundParticipant = selectedContact?.participants?.find(p => {
                                                        const pId = p._id || p.userId?._id
                                                        return String(pId) === senderId
                                                    })
                                                    if (foundParticipant) {
                                                        return foundParticipant.name || foundParticipant.userId?.name || 'tin nhắn'
                                                    }
                                                }
                                                if (typeof replySender === 'string') {
                                                    const foundParticipant = selectedContact?.participants?.find(p => {
                                                        const pId = p._id || p.userId?._id
                                                        return String(pId) === replySender
                                                    })
                                                    if (foundParticipant) {
                                                        return foundParticipant.name || foundParticipant.userId?.name || 'tin nhắn'
                                                    }
                                                }
                                                return 'tin nhắn'
                                            })()}</strong></span>
                                            <span className="reply-preview-text">
                                                {replyingTo.content?.length > 60 
                                                    ? replyingTo.content.substring(0, 60) + '...' 
                                                    : replyingTo.content || '[Tin nhắn]'}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        className="reply-preview-cancel"
                                        onClick={() => setReplyingTo && setReplyingTo(null)}
                                        title="Hủy trả lời"
                                    >
                                        <MdClose size={18} />
                                    </button>
                                </div>
                            )}
                            {selectedContact?.type === 'DIRECT' && isDirectChatBlocked ? (
                                <div className="chat-input-blocked-notice">
                                    {directChatBlockedReason || 'Bạn không thể gửi tin nhắn trong cuộc trò chuyện này.'}
                                </div>
                            ) : null}

                            {pendingFiles.length > 0 && (
                                <div className="chat-file-preview">
                                    <div className="chat-file-preview-list">
                                        {pendingFiles.map((file, idx) => (
                                            <div className="chat-file-preview-chip" key={`${file.name}-${idx}`}>
                                                <span className="chat-file-preview-name">{file.name}</span>
                                                <button
                                                    disabled={composerDisabled}
                                                    onClick={() => {
                                                        setPendingFiles(prev => prev.filter((_, i) => i !== idx))
                                                        setUploadProgress(0)
                                                    }}
                                                    className="chat-file-preview-remove"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
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
                                        disabled={composerDisabled}
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    >
                                        <MdEmojiEmotions />
                                    </button>
                                    <input
                                        ref={fileInputRef2}
                                        type="file"
                                        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                                        multiple
                                        style={{ display: 'none' }}
                                        disabled={composerDisabled}
                                        onChange={handleFileChange}
                                    />
                                    <button className="icon-btn attach-btn" disabled={composerDisabled} onClick={() => fileInputRef2.current?.click()} title="Đính kèm">
                                        <MdAttachFile />
                                    </button>
                                    <button className="icon-btn video-btn" disabled={composerDisabled} onClick={() => videoInputRef.current?.click()} title="Gửi video">
                                        <MdVideoLibrary />
                                    </button>
                                    <input
                                        ref={videoInputRef}
                                        type="file"
                                        accept="video/*"
                                        multiple
                                        style={{ display: 'none' }}
                                        disabled={composerDisabled}
                                        onChange={handleVideoFileChange}
                                    />
                                </div>

                                <input
                                    className="chat-text-input"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    placeholder={composerDisabled ? 'Không thể nhắn tin trong cuộc trò chuyện này' : 'Nhập tin nhắn...'}
                                    disabled={composerDisabled}
                                    onKeyDown={async e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            if (composerDisabled) return
                                            if (!newMessage.trim() && pendingFiles.length === 0) return
                                            await handleSendMessage()
                                        }
                                    }}
                                />

                                <button className="chat-send-button" onClick={handleSendMessage} disabled={composerDisabled}>
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
                                                const disableBlockButton = Boolean(isDirectBlockedByPeer) && !Boolean(isDirectBlockedByMe)
                                                return (
                                                    <button
                                                        className="btn-block"
                                                        onClick={toggleBlock}
                                                        disabled={disableBlockButton}
                                                        title={disableBlockButton ? 'Bạn đã bị chặn bởi người này' : ''}
                                                    >
                                                        {disableBlockButton ? 'Đã bị chặn' : (blocked ? 'Bỏ chặn' : 'Chặn')}
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

            {activeCall ? (
                <div ref={callPanelRef} className={`call-zalo-panel ${isCallMaximized ? 'maximized' : ''} ${isCallFullscreen ? 'fullscreen-mode' : ''}`}>
                    <div className="call-zalo-header">
                        <div>
                            <strong className="call-zalo-title">
                                {activeCall.type === 'GROUP'
                                    ? `${activeCallModeLabel} nhóm: ${activeCall.conversationName || 'Nhóm'}`
                                    : `${activeCallModeLabel}: ${activeCall.peerName || 'Người dùng'}`}
                            </strong>
                            <p className="call-zalo-subtitle">
                                {activeCall.status === 'calling'
                                    ? 'Đang đổ chuông...'
                                    : `Đã kết nối ${remoteCallStreams?.length || 0} người`}
                            </p>
                            <p className="call-zalo-subtitle">Thời lượng: {formatCallDuration(callDurationSeconds)}</p>
                            {activeCall.callMode === 'video' && !hasLocalVideoTrack ? (
                                <p className="call-zalo-subtitle" style={{ color: '#b91c1c' }}>
                                    Camera chưa sẵn sàng. Kiểm tra quyền truy cập camera rồi gọi lại.
                                </p>
                            ) : null}
                        </div>
                        <div className="call-zalo-controls">
                            <button
                                type="button"
                                className="call-zalo-control-btn muted"
                                onClick={handleToggleCallFullscreen}
                                title={(isCallFullscreen || isCallMaximized) ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
                            >
                                {(isCallFullscreen || isCallMaximized) ? <MdFullscreenExit /> : <MdFullscreen />}
                            </button>
                            <button
                                type="button"
                                className={`call-zalo-control-btn ${callAudioEnabled ? 'active' : 'muted'}`}
                                onClick={onToggleCallAudio}
                                title={callAudioEnabled ? 'Tắt micro' : 'Bật micro'}
                            >
                                {callAudioEnabled ? <MdMic /> : <MdMicOff />}
                            </button>
                            <button
                                type="button"
                                className={`call-zalo-control-btn ${callVideoEnabled ? 'active' : 'muted'}`}
                                onClick={onToggleCallVideo}
                                disabled={activeCall.callMode === 'audio'}
                                title={callVideoEnabled ? 'Tắt camera' : 'Bật camera'}
                            >
                                {callVideoEnabled ? <MdVideocam /> : <MdVideocamOff />}
                            </button>
                            <button type="button" className="call-zalo-control-btn end" onClick={() => onEndActiveCall('ended')}>
                                <MdCallEnd />
                            </button>
                        </div>
                    </div>

                    <div
                        className={`call-zalo-grid ${activeCall.callMode === 'audio' ? 'audio' : 'video'} ${callParticipantCount === 2 ? 'duo' : ''}`}
                    >
                        <div className="call-zalo-tile local">
                            {activeCall.callMode === 'video' ? (
                                <video
                                    autoPlay
                                    playsInline
                                    muted
                                    ref={(node) => {
                                        if (!node || !localCallStream) return
                                        if (node.srcObject !== localCallStream) node.srcObject = localCallStream
                                    }}
                                />
                            ) : (
                                <div className="call-zalo-avatar-only">B</div>
                            )}
                            <span>Bạn</span>
                        </div>

                        {(remoteCallStreams || []).map(({ userId, stream }) => (
                            <div className="call-zalo-tile" key={String(userId)}>
                                {activeCall.callMode === 'video' ? (
                                    <video
                                        autoPlay
                                        playsInline
                                        ref={(node) => {
                                            if (!node || !stream) return
                                            if (node.srcObject !== stream) node.srcObject = stream
                                        }}
                                    />
                                ) : (
                                    <div className="call-zalo-avatar-only">{(getUserDisplayNameById ? getUserDisplayNameById(userId) : 'T').charAt(0).toUpperCase()}</div>
                                )}
                                <span>{getUserDisplayNameById ? getUserDisplayNameById(userId) : 'Thành viên'}</span>
                            </div>
                        ))}
                    </div>

                    {/* Audio call vẫn cần phần tử audio để phát tiếng remote stream. */}
                    {activeCall.callMode === 'audio' ? (
                        <div style={{ display: 'none' }}>
                            {(remoteCallStreams || []).map(({ userId, stream }) => (
                                <audio
                                    key={`audio-${String(userId)}`}
                                    autoPlay
                                    playsInline
                                    ref={(node) => {
                                        if (!node || !stream) return
                                        if (node.srcObject !== stream) node.srcObject = stream
                                        node.play?.().catch(() => { })
                                    }}
                                />
                            ))}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    )
}

export default ChatView
