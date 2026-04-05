import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

const API = import.meta.env.VITE_API_URL || ''

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sf_user')) } catch { return null }
  })

  const _saveSession = (token, userData) => {
    localStorage.setItem('sf_token', token)
    localStorage.setItem('sf_user', JSON.stringify(userData))
    setUser(userData)
  }

  const _authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('sf_token') || ''}`,
  })

  const login = async (email, password) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Login failed')
    _saveSession(data.access_token, data.user)
  }

  const logout = () => {
    localStorage.removeItem('sf_token')
    localStorage.removeItem('sf_user')
    setUser(null)
  }

  // Admin helpers
  const adminListUsers = async () => {
    const res = await fetch(`${API}/api/admin/users`, { headers: _authHeaders() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Failed to fetch users')
    return data
  }

  const adminAddUser = async (email, password, displayName) => {
    const res = await fetch(`${API}/api/admin/users`, {
      method: 'POST',
      headers: _authHeaders(),
      body: JSON.stringify({ email, password, display_name: displayName || null }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || 'Failed to add user')
    return data
  }

  const adminDeleteUser = async (userId) => {
    const res = await fetch(`${API}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: _authHeaders(),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.detail || 'Failed to delete user')
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, adminListUsers, adminAddUser, adminDeleteUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
