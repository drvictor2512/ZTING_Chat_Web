const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
]

const parseIceServersFromEnv = () => {
  const raw = import.meta.env.VITE_WEBRTC_ICE_SERVERS
  if (!raw) return DEFAULT_ICE_SERVERS

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch (err) {
    console.warn('[call] Invalid VITE_WEBRTC_ICE_SERVERS JSON, fallback to default.', err)
  }

  return DEFAULT_ICE_SERVERS
}

const normalizeId = (value) => {
  if (!value) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value !== 'object') return ''
  if (value?._id) return normalizeId(value._id)
  if (value?.id) return normalizeId(value.id)
  if (value?.$oid) return normalizeId(value.$oid)
  return ''
}

class CallService {
  constructor() {
    this.socket = null
    this.localStream = null
    this.peerConnections = new Map()
    this.remoteStreams = new Map()
    this.pendingIce = new Map()
    this.callbacks = {
      onLocalStreamChanged: () => { },
      onRemoteStreamsChanged: () => { },
      onError: () => { },
      onWarning: () => { },
      onPeerDisconnected: () => { }
    }
    this.iceServers = parseIceServersFromEnv()
  }

  setSocket(socket) {
    this.socket = socket
  }

  setCallbacks(callbacks = {}) {
    this.callbacks = {
      ...this.callbacks,
      ...callbacks
    }
  }

  getLocalStream() {
    return this.localStream
  }

  getRemoteStreams() {
    return Array.from(this.remoteStreams.entries()).map(([userId, stream]) => ({ userId, stream }))
  }

  notifyLocalStream() {
    this.callbacks.onLocalStreamChanged(this.localStream)
  }

  notifyRemoteStreams() {
    this.callbacks.onRemoteStreamsChanged(this.getRemoteStreams())
  }

  createPeerConnection(peerUserId, candidateEmitter) {
    const peerId = normalizeId(peerUserId)
    if (!peerId) return null

    if (this.peerConnections.has(peerId)) {
      return this.peerConnections.get(peerId)
    }

    const pc = new RTCPeerConnection({ iceServers: this.iceServers })

    pc.onicecandidate = (event) => {
      if (!event.candidate) return
      if (typeof candidateEmitter === 'function') {
        candidateEmitter(peerId, event.candidate)
      }
    }

    pc.ontrack = (event) => {
      const stream = event.streams?.[0]
      if (!stream) return
      this.remoteStreams.set(peerId, stream)
      this.notifyRemoteStreams()
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      if (state === 'failed' || state === 'closed' || state === 'disconnected') {
        this.closePeer(peerId)
        this.callbacks.onPeerDisconnected(peerId)
      }
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream))
    }

    this.peerConnections.set(peerId, pc)
    return pc
  }

  async ensureLocalStream({ callMode = 'video' } = {}) {
    const normalizedMode = callMode === 'audio' ? 'audio' : 'video'

    if (this.localStream) {
      const hasVideoTrack = this.localStream.getVideoTracks().length > 0
      if (normalizedMode === 'audio' || hasVideoTrack) return this.localStream

      // Stream hiện tại là audio-only nhưng cuộc gọi mới cần video.
      this.stopLocalStream()
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      const err = new Error('Trình duyệt không hỗ trợ getUserMedia')
      this.callbacks.onError(err.message)
      throw err
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: normalizedMode === 'video'
      })
      this.notifyLocalStream()
      return this.localStream
    } catch (err) {
      const errorName = String(err?.name || '')
      const isCameraBusy = errorName === 'NotReadableError' || errorName === 'TrackStartError'

      if (errorName === 'NotAllowedError') {
        this.callbacks.onError('Bạn đã chặn quyền camera/microphone. Hãy cấp quyền rồi thử lại.')
      } else if (isCameraBusy) {
        if (normalizedMode === 'video') {
          this.callbacks.onError('Camera đang được ứng dụng khác sử dụng. Hãy tắt app/tab khác rồi gọi lại video call.')
        } else {
          this.callbacks.onError('Microphone đang được ứng dụng khác sử dụng. Hãy thử lại cuộc gọi thoại.')
        }
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        this.callbacks.onError('Không tìm thấy camera hoặc microphone trên thiết bị.')
      } else {
        this.callbacks.onError(err?.message || 'Không thể truy cập camera/microphone')
      }

      throw err
    }
  }

  async flushPendingCandidates(peerUserId) {
    const peerId = normalizeId(peerUserId)
    if (!peerId) return

    const pc = this.peerConnections.get(peerId)
    if (!pc || !pc.remoteDescription) return

    const queued = this.pendingIce.get(peerId) || []
    if (!queued.length) return

    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.warn('[call] addIceCandidate failed from queue:', err)
      }
    }

    this.pendingIce.delete(peerId)
  }

  queueCandidate(peerUserId, candidate) {
    const peerId = normalizeId(peerUserId)
    if (!peerId || !candidate) return

    const queued = this.pendingIce.get(peerId) || []
    queued.push(candidate)
    this.pendingIce.set(peerId, queued)
  }

  async addIceCandidate(peerUserId, candidate) {
    const peerId = normalizeId(peerUserId)
    if (!peerId || !candidate) return

    const pc = this.peerConnections.get(peerId)
    if (!pc || !pc.remoteDescription) {
      this.queueCandidate(peerId, candidate)
      return
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (err) {
      console.warn('[call] addIceCandidate failed:', err)
    }
  }

  async startDirectCall({ targetUserId, callId, conversationId = null, metadata = null, callMode = 'video' }) {
    const targetId = normalizeId(targetUserId)
    if (!this.socket || !targetId || !callId) return null

    await this.ensureLocalStream({ callMode })

    const pc = this.createPeerConnection(targetId, (peerId, candidate) => {
      this.socket.emit('call:ice-candidate', {
        targetUserId: peerId,
        callId,
        candidate
      })
    })

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    this.socket.emit('call:invite', {
      targetUserId: targetId,
      callId,
      conversationId,
      offer,
      metadata
    })

    return offer
  }

  async acceptDirectCall({ fromUserId, callId, offer, callMode = 'video' }) {
    const fromId = normalizeId(fromUserId)
    if (!this.socket || !fromId || !callId || !offer) return null

    await this.ensureLocalStream({ callMode })

    const pc = this.createPeerConnection(fromId, (peerId, candidate) => {
      this.socket.emit('call:ice-candidate', {
        targetUserId: peerId,
        callId,
        candidate
      })
    })

    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    await this.flushPendingCandidates(fromId)

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    this.socket.emit('call:answer', {
      targetUserId: fromId,
      callId,
      answer
    })

    return answer
  }

  async applyDirectAnswer({ fromUserId, answer }) {
    const fromId = normalizeId(fromUserId)
    if (!fromId || !answer) return

    const pc = this.peerConnections.get(fromId)
    if (!pc) return

    await pc.setRemoteDescription(new RTCSessionDescription(answer))
    await this.flushPendingCandidates(fromId)
  }

  rejectDirectCall({ targetUserId, callId, reason = 'rejected' }) {
    const targetId = normalizeId(targetUserId)
    if (!this.socket || !targetId || !callId) return

    this.socket.emit('call:reject', {
      targetUserId: targetId,
      callId,
      reason
    })
  }

  endDirectCall({ targetUserId, callId, reason = 'ended' }) {
    const targetId = normalizeId(targetUserId)
    if (this.socket && targetId && callId) {
      this.socket.emit('call:end', {
        targetUserId: targetId,
        callId,
        reason
      })
    }
    this.closePeer(targetId)
  }

  async startGroupCall({ conversationId, callId, metadata = null, callMode = 'video' }) {
    if (!this.socket || !conversationId || !callId) return

    await this.ensureLocalStream({ callMode })
    this.socket.emit('group-call:start', {
      conversationId,
      callId,
      metadata
    })

    this.socket.emit('group-call:join', {
      conversationId,
      callId
    })
  }

  async joinGroupCall({ conversationId, callId, callMode = 'video' }) {
    if (!this.socket || !conversationId || !callId) return

    await this.ensureLocalStream({ callMode })
    this.socket.emit('group-call:join', {
      conversationId,
      callId
    })
  }

  async createGroupOfferToUser({ conversationId, callId, targetUserId }) {
    const targetId = normalizeId(targetUserId)
    if (!this.socket || !conversationId || !callId || !targetId) return

    await this.ensureLocalStream()

    const pc = this.createPeerConnection(targetId, (peerId, candidate) => {
      this.socket.emit('group-call:ice-candidate', {
        conversationId,
        callId,
        targetUserId: peerId,
        candidate
      })
    })

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    this.socket.emit('group-call:offer', {
      conversationId,
      callId,
      targetUserId: targetId,
      offer
    })
  }

  async handleGroupOffer({ conversationId, callId, fromUserId, offer }) {
    const fromId = normalizeId(fromUserId)
    if (!this.socket || !conversationId || !callId || !fromId || !offer) return

    await this.ensureLocalStream()

    const pc = this.createPeerConnection(fromId, (peerId, candidate) => {
      this.socket.emit('group-call:ice-candidate', {
        conversationId,
        callId,
        targetUserId: peerId,
        candidate
      })
    })

    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    await this.flushPendingCandidates(fromId)

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    this.socket.emit('group-call:answer', {
      conversationId,
      callId,
      targetUserId: fromId,
      answer
    })
  }

  async handleGroupAnswer({ fromUserId, answer }) {
    const fromId = normalizeId(fromUserId)
    if (!fromId || !answer) return

    const pc = this.peerConnections.get(fromId)
    if (!pc) return

    await pc.setRemoteDescription(new RTCSessionDescription(answer))
    await this.flushPendingCandidates(fromId)
  }

  leaveGroupCall({ conversationId, callId, reason = 'left' }) {
    if (this.socket && conversationId && callId) {
      this.socket.emit('group-call:leave', {
        conversationId,
        callId,
        reason
      })
    }
    this.closeAllPeers()
  }

  endGroupCall({ conversationId, callId, reason = 'ended' }) {
    if (this.socket && conversationId && callId) {
      this.socket.emit('group-call:end', {
        conversationId,
        callId,
        reason
      })
    }
    this.closeAllPeers()
  }

  toggleAudio(enabled) {
    if (!this.localStream) return
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled
    })
  }

  toggleVideo(enabled) {
    if (!this.localStream) return
    this.localStream.getVideoTracks().forEach((track) => {
      track.enabled = enabled
    })
  }

  closePeer(peerUserId) {
    const peerId = normalizeId(peerUserId)
    if (!peerId) return

    const pc = this.peerConnections.get(peerId)
    if (pc) {
      pc.onicecandidate = null
      pc.ontrack = null
      pc.onconnectionstatechange = null
      pc.close()
    }

    this.peerConnections.delete(peerId)
    this.pendingIce.delete(peerId)

    if (this.remoteStreams.has(peerId)) {
      this.remoteStreams.delete(peerId)
      this.notifyRemoteStreams()
    }
  }

  closeAllPeers() {
    Array.from(this.peerConnections.keys()).forEach((peerId) => this.closePeer(peerId))
  }

  stopLocalStream() {
    if (!this.localStream) return
    this.localStream.getTracks().forEach((track) => track.stop())
    this.localStream = null
    this.notifyLocalStream()
  }

  resetMedia() {
    this.closeAllPeers()
    this.stopLocalStream()
    this.remoteStreams.clear()
    this.pendingIce.clear()
    this.notifyRemoteStreams()
  }
}

const callService = new CallService()

export default callService
