import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import authService from '../services/authService'
import '../styles/auth.css'

const Register = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // 1 = fill info, 2 = enter OTP
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    gender: '',
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

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (step === 1) {
        // Validate form
        if (!formData.email || !formData.name || !formData.password || !formData.dateOfBirth || !formData.gender) {
          setError('Vui lòng điền đầy đủ thông tin')
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

        if (formData.password !== formData.confirmPassword) {
          setError('Mật khẩu không trùng khớp')
          setLoading(false)
          return
        }

        if (formData.password.length < 8) {
          setError('Mật khẩu phải có ít nhất 8 ký tự')
          setLoading(false)
          return
        }

        // Map gender to correct format (Nam/Nữ instead of male/female)
        const genderMap = {
          'male': 'Nam',
          'female': 'Nữ',
          'other': 'Khác'
        }

        // Call register API
        const response = await authService.register({
          email: formData.email,
          name: formData.name,
          password: formData.password,
          dateOfBirth: formData.dateOfBirth,
          gender: genderMap[formData.gender] || formData.gender
        })

        if (response.message) {
          // backend will send the OTP email automatically
          setStep(2)
        } else {
          setError(response.message || 'Đăng ký thất bại')
        }
      } else {
        // step 2 -> verify OTP
        if (!formData.otp) {
          setError('Vui lòng nhập mã OTP')
          setLoading(false)
          return
        }
        const verifyRes = await authService.verifyOTP(formData.email, formData.otp)
        if (verifyRes.message) {
          navigate('/login')
        } else {
          setError(verifyRes.message || 'Xác thực thất bại')
        }
      }
    } catch (err) {
      const errorMsg = typeof err === 'string' ? err : err.message || 'Đăng ký thất bại'
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
          <Link to="/login" className="tab-btn">Đăng nhập</Link>
          <button className="tab-btn active">Đăng ký</button>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          {step === 1 ? (
            <>
              <div className="form-group">
                <input
                  type="text"
                  name="name"
                  placeholder="Họ tên"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

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

              <div className="form-group">
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <input
                  type="date"
                  name="dateOfBirth"
                  placeholder="Ngày sinh"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="form-input"
                >
                  <option value="">Giới tính</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              {error && <div className="error-message">{error}</div>}

              <button 
                type="submit" 
                className="submit-btn"
                disabled={loading}
              >
                {loading ? 'Đang đăng ký...' : 'ĐĂNG KÝ'}
              </button>
            </>
          ) : (
            <>
              <div className="step-info">Nhập mã OTP đã được gửi đến email của bạn</div>
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

              {error && <div className="error-message">{error}</div>}

              <button 
                type="submit" 
                className="submit-btn"
                disabled={loading}
              >
                {loading ? 'Đang xác thực...' : 'XÁC NHẬN'}
              </button>

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
            </>
          )}
        </form>

        <div className="auth-footer">
          <p>Đã có tài khoản? <Link to="/login" className="link">Đăng nhập ngay</Link></p>
        </div>
      </div>
    </div>
  )
}

export default Register
