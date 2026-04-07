import React from 'react'
import { MdLogout } from 'react-icons/md'

const SettingsView = ({ onOpenChangePassword, onOpenCloseAccount, onLogout }) => {
    return (
        <div className="main-area settings-view">
            <div className="settings-container">
                <h2>Cài đặt</h2>
                <div className="settings-sections">
                    <div className="settings-section">
                        <h3>Bảo mật</h3>
                        <div className="settings-item">
                            <button className="btn-danger" onClick={onOpenChangePassword}>Đổi mật khẩu</button>
                        </div>
                        <div className="settings-item">
                            <button className="btn-danger" onClick={onOpenCloseAccount}>Đóng tài khoản</button>
                        </div>
                    </div>

                    <div className="settings-section">
                        <h3>Khác</h3>
                        <div className="settings-item">
                            <button className="btn-logout" onClick={onLogout}>
                                <MdLogout /> Đăng xuất
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SettingsView
