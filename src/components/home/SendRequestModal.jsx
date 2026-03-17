import React from 'react'
import { MdClose } from 'react-icons/md'

const SendRequestModal = ({ open, selectedUser, requestMessage, onMessageChange, onClose, onConfirm }) => {
  if (!open || !selectedUser) return null

  return (
    <div className="profile-modal" onClick={onClose}>
      <div className="add-friend-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <h3>Gửi lời mời kết bạn</h3>
          <button className="close-btn" onClick={onClose}><MdClose /></button>
        </div>
        <div className="add-friend-body">
          <p style={{ marginBottom: 8 }}>Gửi lời mời đến <strong>{selectedUser.name}</strong></p>
          <textarea
            className="add-friend-input"
            style={{ resize: 'none', height: 80, width: '100%', boxSizing: 'border-box' }}
            value={requestMessage}
            onChange={(e) => onMessageChange(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-cancel" style={{ flex: 1 }} onClick={onClose}>Hủy</button>
            <button className="fr-btn-accept" style={{ flex: 1 }} onClick={onConfirm}>Gửi</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SendRequestModal
