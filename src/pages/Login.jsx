import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import authService from '../services/authService'
import '../styles/auth.css'

const Login = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: ''
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
      if (!formData.email || !formData.password) {
        setError('Vui lòng điền đầy đủ thông tin')
        setLoading(false)
        return
      }

      const response = await authService.login(formData.email, formData.password)
      if (response.token) {
        window.dispatchEvent(new Event('authChanged'))
        navigate('/home')
      } else {
        setError(response.message || 'Đăng nhập thất bại')
      }
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : err.message || 'Đăng nhập thất bại'

      const isUnverifiedAccount =
        /chưa được xác thực/i.test(errorMsg) ||
        /xác thực otp/i.test(errorMsg)

      if (isUnverifiedAccount && formData.email) {
        try {
          await authService.sendOTP(formData.email)
          navigate('/register', {
            state: {
              verifyOnly: true,
              presetEmail: formData.email,
              otpResent: true
            }
          })
          return
        } catch {
          navigate('/register', {
            state: {
              verifyOnly: true,
              presetEmail: formData.email,
              otpResent: false
            }
          })
          return
        }
      }

      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <h1 className="auth-title">ZTING</h1>
      <div className="auth-box">
        
        <div className="auth-tabs">
          <button className="tab-btn active">Đăng nhập</button>
          <Link to="/register" className="tab-btn">Đăng ký</Link>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
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

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : 'ĐĂNG NHẬP'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/forgot-password" className="forgot-link">Quên mật khẩu?</Link>
        </div>
      </div>
    </div>
  )
}

export default Login
