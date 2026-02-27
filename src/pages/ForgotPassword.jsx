import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import authService from '../services/authService'
import '../styles/auth.css'

const ForgotPassword = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // Step 1: Email, Step 2: OTP + New Password
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!formData.email) {
        setError('Vui lòng nhập email')
        setLoading(false)
        return
      }

      // Validate email format
      const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/
      if (!emailRegex.test(formData.email)) {
        setError('Email không hợp lệ')
        setLoading(false)
        return
      }

      // Send reset password OTP
      const response = await authService.sendForgotPasswordOTP(formData.email)
      
      if (response.message) {
        setStep(2)
      } else {
        setError(response.message || 'Gửi mã OTP thất bại')
      }
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : err.message || 'Gửi mã OTP thất bại'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate form
      if (!formData.otp || !formData.newPassword) {
        setError('Vui lòng điền đầy đủ thông tin')
        setLoading(false)
        return
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setError('Mật khẩu không trùng khớp')
        setLoading(false)
        return
      }

      if (formData.newPassword.length < 8) {
        setError('Mật khẩu phải có ít nhất 8 ký tự')
        setLoading(false)
        return
      }

      // Call reset password API
      const response = await authService.resetPassword(
        formData.email,
        formData.otp,
        formData.newPassword
      )

      if (response.message) {
        // Redirect to login
        navigate('/login')
      } else {
        setError(response.message || 'Đổi mật khẩu thất bại')
      }
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : err.message || 'Đổi mật khẩu thất bại'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box forgot-password-box">
        <Link to="/login" className="back-link">← Quay lại</Link>
        
        <h2 className="forgot-title">Quên mật khẩu</h2>

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="auth-form">
            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading}
            >
              {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <input
                type="text"
                name="otp"
                placeholder="OTP"
                value={formData.otp}
                onChange={handleChange}
                className="form-input"
              />
              <small className="form-hint">Nhập mã OTP được gửi đến email của bạn</small>
            </div>

            <div className="form-group">
              <input
                type="password"
                name="newPassword"
                placeholder="New password"
                value={formData.newPassword}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button 
              type="submit" 
              className="submit-btn"
              disabled={loading}
            >
              {loading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
            </button>

            <button 
              type="button"
              className="back-btn"
              onClick={() => setStep(1)}
            >
              ← Quay lại
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword
