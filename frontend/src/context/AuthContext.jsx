// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

const AuthContext = createContext(null)
const STORAGE_KEY = 'cal_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setUser(JSON.parse(raw))
      }
    } catch (err) {
      console.error('Failed to parse session:', err)
      localStorage.removeItem(STORAGE_KEY)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback((userData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  // Memoize value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    isLoggedIn: !!user,
    isAdmin: user?.role === 'admin',
    loading,
    login,
    logout,
  }), [user, loading, login, logout])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}