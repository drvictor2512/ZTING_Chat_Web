import React, { useRef, useEffect } from 'react'
import { MdSend, MdAttachFile, MdRefresh } from 'react-icons/md'

const AI_BOT_ID = '000000000000000000000001'
const AI_BOT_NAME = 'ZTING AI'
const AI_BOT_AVATAR = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Google_Gemini_logo.svg/120px-Google_Gemini_logo.svg.png'
const AI_STREAM_ID = '__ai_streaming__'

const AIView = ({
  messages,
  setMessages,
  aiTyping,
  onSendMessage,
  onClearChat,
  pendingFile,
  setPendingFile,
  newMessage,
  setNewMessage,
  fileInputRef,
  formatTime,
  isUploadingFile
}) => {
  const messagesEndRef = useRef(null)
  const messageInputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setPendingFile(file)
    }
  }

  const handleSend = () => {
    if (aiTyping || isUploadingFile) return
    if (!newMessage.trim() && !pendingFile) return
    
    onSendMessage({
      content: newMessage.trim() || undefined,
      file: pendingFile
    })
    
    setNewMessage('')
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !aiTyping && !isUploadingFile) {
      e.preventDefault()
      handleSend()
    }
  }

  const showWelcome = messages.length === 0 || (messages.length === 1 && messages[0]._isWelcome)

  return (
    <div className="main-area ai-view">
      <div className="chat-wrapper">
        <div className="chat-container">
          {/* Header */}
          <div className="chat-header ai-header">
            <div className="chat-header-left">
              <div className="chat-avatar-wrapper">
                <img src={AI_BOT_AVATAR} alt={AI_BOT_NAME} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div className="chat-header-info">
                <h3 className="chat-name">{AI_BOT_NAME}</h3>
                <p className="chat-status">Trợ lý AI • Hỗ trợ học tập & cuộc sống</p>
              </div>
            </div>
            <button 
              className="btn-refresh"
              onClick={onClearChat}
              disabled={aiTyping || showWelcome}
              title="Làm mới cuộc trò chuyện"
            >
              <MdRefresh size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {showWelcome ? (
              <div className="ai-welcome-container">
                <div className="ai-welcome-avatar">
                  <img src={AI_BOT_AVATAR} alt="ZTING AI" />
                </div>
                <div className="ai-welcome-content">
                  <h2>Xin chào! 👋</h2>
                  <p>Tôi là <strong>{AI_BOT_NAME}</strong> — trợ lý AI được tích hợp trong ứng dụng chat này.</p>
                  <div className="ai-welcome-features">
                    <h4>Tôi có thể giúp bạn:</h4>
                    <ul>
                      <li>📚 <strong>Hỗ trợ học tập</strong> — giải thích khái niệm, tóm tắt tài liệu, hướng dẫn bài tập</li>
                      <li>💬 <strong>Tư vấn cuộc sống</strong> — lời khuyên tích cực</li>
                      <li>🖼️ <strong>Phân tích ảnh & file</strong> — nhận dạng nội dung, trích xuất thông tin</li>
                    </ul>
                  </div>
                  <p className="ai-welcome-footer">Hãy bắt đầu bằng cách nhập tin nhắn hoặc tải lên tệp bên dưới! 😊</p>
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isAI = String(msg.senderId?._id) === AI_BOT_ID
                const isStreaming = msg._streaming || msg._id === AI_STREAM_ID
                
                return (
                  <div key={msg._id || idx} className={`message-group-ai ${isAI ? 'ai-message' : 'user-message'}`}>
                    <div className="msg-avatar-ai">
                      {isAI ? (
                        <img src={AI_BOT_AVATAR} alt="AI" />
                      ) : (
                        <span>{(msg.senderId?.name || 'U').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="msg-content-ai">
                      <div className={`message-bubble ${isAI ? 'ai-bubble' : 'user-bubble'} ${isStreaming ? 'streaming' : ''}`}>
                        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {msg.content}
                          {isStreaming && <span className="ai-streaming-cursor" />}
                        </span>
                      </div>
                      {msg.createdAt && (
                        <span className="message-time-ai">
                          {formatTime(msg.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {aiTyping && (
              <div className="message-group-ai ai-message">
                <div className="msg-avatar-ai">
                  <img src={AI_BOT_AVATAR} alt="AI" />
                </div>
                <div className="msg-content-ai">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="chat-input ai-input">
            {pendingFile && (
              <div className="chat-file-preview-ai">
                <div className="file-preview-item">
                  <span>{pendingFile.name}</span>
                  <button onClick={() => setPendingFile(null)} title="Xóa">✕</button>
                </div>
              </div>
            )}

            <div className="input-group-ai">
              <input
                ref={messageInputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Hỏi ZTING AI..."
                disabled={aiTyping || isUploadingFile}
                className="message-input-ai"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={aiTyping || isUploadingFile}
                title="Tải lên tệp"
                className="input-btn-ai"
              >
                <MdAttachFile size={20} />
              </button>

              <button
                onClick={handleSend}
                disabled={aiTyping || isUploadingFile || (!newMessage.trim() && !pendingFile)}
                title="Gửi"
                className="input-btn-ai send-btn"
              >
                <MdSend size={20} />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIView
