import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import authService from '../services/authService'
import '../styles/home.css'

const Home = () => {
  const navigate = useNavigate()
  const user = authService.getCurrentUser()

  useEffect(() => {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      navigate('/login')
    }
  }, [navigate])

  const handleLogout = async () => {
    await authService.logout()
    navigate('/login')
  }

  return (
    <div className="home-container">
      <div className="home-content">
        <h1>Welcome to ZTING</h1>
        <p>Chat application | Real-time messaging</p>
        
        {user && (
          <div className="user-info">
            <h2>Hello, {user.name || user.email}</h2>
            <p>Email: {user.email}</p>
            {user.dateOfBirth && <p>Date of Birth: {new Date(user.dateOfBirth).toLocaleDateString()}</p>}
            {user.gender && <p>Gender: {user.gender}</p>}
          </div>
        )}

        <button onClick={handleLogout} className="logout-btn">
          Đăng xuất
        </button>
      </div>
    </div>
  )
}

export default Home
