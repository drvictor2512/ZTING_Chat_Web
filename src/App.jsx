import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Home from './pages/Home'
import authService from './services/authService'

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated())

  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(authService.isAuthenticated())
    }

    window.addEventListener('authChanged', handleAuthChange)
    return () => {
      window.removeEventListener('authChanged', handleAuthChange)
    }
  }, [])

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Nếu đã đăng nhập, vào thẳng /home; nếu chưa thì vào /login */}
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? '/home' : '/login'} replace />}
        />

        {/* Không cho vào trang login khi đã đăng nhập */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/home" replace /> : <Login />}
        />

        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Bảo vệ trang home: nếu chưa đăng nhập thì đẩy về login */}
        <Route
          path="/home"
          element={isAuthenticated ? <Home /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </Router>
  )
}

export default App
