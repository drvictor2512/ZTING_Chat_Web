export function isImageUrl(str) {
    if (!str) return false
    try {
        const u = new URL(str)
        const path = u.pathname || ''
        if (/\.(jpeg|jpg|gif|png|webp|svg)$/i.test(path)) return true
        if (str.includes('giphy.com') || str.includes('media.giphy') || str.includes('media.tenor')) return true
    } catch (e) {
        return false
    }
    return false
}

export function isVideoUrl(str) {
    if (!str) return false
    try {
        const u = new URL(str)
        const path = u.pathname || ''
        if (/\.(mp4|webm|ogg|mov|m4v)$/i.test(path)) return true
    } catch (e) {
        return false
    }
    return false
}

export function isGifUrl(str) {
    if (!str) return false
    try {
        const u = new URL(str)
        const path = u.pathname || ''
        if (/\.gif$/i.test(path)) return true
        if (str.includes('giphy.com') || str.includes('media.giphy') || str.includes('media.tenor')) return true
    } catch (e) {
        return false
    }
    return false
}

export function isDocumentUrl(str) {
    if (!str) return false
    try {
        const u = new URL(str)
        const path = u.pathname || ''
        if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip)$/i.test(path)) return true
    } catch (e) {
        return false
    }
    return false
}

export function basenameFromUrl(str) {
    try {
        const u = new URL(str)
        const p = u.pathname || ''
        const parts = p.split('/')
        return decodeURIComponent(parts.pop() || parts.pop() || '')
    } catch (e) {
        return str
    }
}

export function buildLastMessagePreview(lastMessage, { isPendingConversation = false, isConversation = true, fallbackEmail = '' } = {}) {
    if (!lastMessage) {
        if (isPendingConversation) return 'Pending - Chưa có tin nhắn'
        if (!isConversation) return fallbackEmail || ''
        return 'Không có tin nhắn'
    }

    if (lastMessage?.isRecalled) return 'Tin nhắn đã được thu hồi'

    const content = String(lastMessage?.content || '').trim()
    if (content) {
        const matched = content.match(/^\[File\]\s*(.+)$/i)
        if (matched?.[1]) return `[File] ${matched[1].trim()}`
        if (/^\[Ảnh\]$/i.test(content)) return '[Ảnh]'
        if (/^\[Video\]$/i.test(content)) return '[Video]'
        return content
    }

    const fileUrl = String(lastMessage?.fileUrl || '').trim()
    if (fileUrl) {
        if (isImageUrl(fileUrl) || isGifUrl(fileUrl)) return '[Ảnh]'
        if (isVideoUrl(fileUrl)) return '[Video]'
        return `[File] ${basenameFromUrl(fileUrl) || 'file'}`
    }

    if (isPendingConversation) return 'Pending - Chưa có tin nhắn'
    if (!isConversation) return fallbackEmail || ''
    return 'Không có tin nhắn'
}

export async function downloadFile(url, filename) {
    try {
        const res = await fetch(url, { mode: 'cors' })
        const blob = await res.blob()
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename || 'download'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(blobUrl)
    } catch (e) {
        window.open(url, '_blank')
    }
}
