import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/axios'
import { toast } from 'sonner'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim()) {
      return setError('Username and password are required.')
    }
    setLoading(true)
    try {
      const res = await api.post('/auth/login', {
        username: username.trim().toLowerCase(),
        password,
      })
      const role = res.data.user.role
      login({ username: res.data.user.username, role })
      toast.success('Welcome back!')
      navigate(role === 'technician' ? '/tickets' : '/')
    } catch (err) {
      const errorMsg = err?.response?.data?.error || 'Login failed. Please try again.'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-panel-brand">
        <div className="login-panel-brand-inner">
          <h1 className="login-brand-title">
            CODE <span style={{ color: '#93C5FD' }}>&amp;</span> LOCKS
          </h1>
          <p className="login-brand-tagline">Phone repair — Tambo, Pamplona, Camarines Sur</p>
        </div>
      </div>

      <div className="login-panel-form">
        <div className="login-form-box">
          <h2 className="login-form-title">Staff sign in</h2>
          <p className="login-form-sub">Admin and technician accounts only</p>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); if (error) setError('') }}
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); if (error) setError('') }}
                autoComplete="current-password"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
