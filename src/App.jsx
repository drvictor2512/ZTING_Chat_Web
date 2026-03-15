import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
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
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#161616',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)'
          },
          success: {
            style: {
              border: '1px solid rgba(34, 197, 94, 0.35)'
            }
          },
          error: {
            style: {
              border: '1px solid rgba(239, 68, 68, 0.35)'
            }
          }
        }}
      />
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
