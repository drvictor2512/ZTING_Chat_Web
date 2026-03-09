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
