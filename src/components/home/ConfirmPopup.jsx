import React from 'react'

const ConfirmPopup = ({ popup, onClose }) => {
  if (!popup?.open) return null

  return (
    <div className="profile-modal" onClick={() => onClose(false)}>
      <div className="confirm-popup" onClick={(e) => e.stopPropagation()}>
        <h3>{popup.title}</h3>
        <p>{popup.message}</p>
        <div className="confirm-popup-actions">
          <button
            type="button"
            className="confirm-btn-secondary"
            onClick={() => onClose(false)}
          >
            {popup.cancelText}
          </button>
          <button
            type="button"
            className={`confirm-btn-primary ${popup.danger ? 'danger' : ''}`}
            onClick={() => onClose(true)}
          >
            {popup.confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmPopup