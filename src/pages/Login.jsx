import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import authService from '../services/authService'
import '../styles/auth.css'

const Login = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // Step 1: Email/Password, Step 2: OTP
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    otp: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (step === 1) {
        // Step 1: Login without OTP to trigger OTP requirement
        if (!formData.email || !formData.password) {
          setError('Vui lòng điền đầy đủ thông tin')
          setLoading(false)
          return
        }

        try {
          const response = await authService.login(formData.email, formData.password)
          // If successful without OTP, redirect to home
          if (response.token) {
            navigate('/home')
          }
        } catch (err) {
          const errorMsg = typeof err === 'string' ? err : err.message || ''
          // Check if OTP is required
          if (errorMsg.includes('OTP') || err.otpRequired) {
            setStep(2) // Move to OTP step
          } else {
            setError(errorMsg || 'Đăng nhập thất bại')
          }
        }
      } else {
        // Step 2: Login with OTP
        if (!formData.otp) {
          setError('Vui lòng nhập mã OTP')
          setLoading(false)
          return
        }

        const response = await authService.login(formData.email, formData.password, formData.otp)
        
        if (response.token) {
          navigate('/home')
        } else {
          setError(response.message || 'Đăng nhập thất bại')
        }
      }
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : err.message || 'Đăng nhập thất bại'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1 className="auth-title">ZTING</h1>
        
        <div className="auth-tabs">
          <button className="tab-btn active">Đăng nhập</button>
          <Link to="/register" className="tab-btn">Đăng ký</Link>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {step === 1 ? (
            <>
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

              <div className="form-group">
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </>
          ) : (
            <>
              <div className="step-info">Nhập mã OTP được gửi đến email của bạn</div>
              <div className="form-group">
                <input
                  type="text"
                  name="otp"
                  placeholder="OTP"
                  value={formData.otp}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>
            </>
          )}

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : (step === 1 ? 'ĐĂNG NHẬP' : 'XÁC NHẬN')}
          </button>

          {step === 2 && (
            <button 
              type="button"
              className="back-btn"
              onClick={() => {
                setStep(1)
                setError('')
              }}
            >
              ← Quay lại
            </button>
          )}
        </form>

        <div className="auth-footer">
          <Link to="/forgot-password" className="forgot-link">Quên mật khẩu?</Link>
        </div>
      </div>
    </div>
  )
}

export default Login
