// ============================================================
// pages/public/LoginPage.jsx — System Authentication Gate
//
// Auth-free page (no X-User header attached).
// On success, stores the session in AuthContext (→ localStorage)
// and navigates to the Dashboard.
// ============================================================
import { useState }            from 'react'
import { useNavigate }         from 'react-router-dom'
import { useAuth }             from '../../context/AuthContext'
import api                     from '../../lib/axios'

export default function LoginPage() {
  const { login }    = useAuth()
  const navigate     = useNavigate()
  const [username,   setUsername] = useState('')
  const [password,   setPassword] = useState('')
  const [loading,    setLoading]  = useState(false)
  const [error,      setError]    = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password.trim()) {
      return setError('Both username and password are required.')
    }
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { username: username.trim().toLowerCase(), password })
      login({ username: res.data.user.username, role: res.data.user.role })
      navigate('/')
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.wrapper}>

      {/* ── LEFT PANEL ─────────────────────────────────────── */}
      <div style={styles.leftPanel}>
        <div style={styles.overlay} />
        <div style={styles.leftContent}>
          <h1 style={styles.brandName}>
            CODE <span style={styles.amp}>&amp;</span> LOCKS
          </h1>
          <p style={styles.tagline}>"When it's broken, We fix it!"</p>


        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────── */}
      <div style={styles.rightPanel}>
        <div style={styles.formBox}>

          {/* Header */}
          <div style={styles.formHeader}>
            <div style={styles.iconWrap}>🔧</div>
            <h2 style={styles.formTitle}>Welcome Back!</h2>
            <p style={styles.formSubtitle}>Sign in to your staff account to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>⚠️ {error}</div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Username</label>
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={e => { setUsername(e.target.value); if (error) setError('') }}
                style={styles.input}
                autoFocus
                autoComplete="username"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => { setPassword(e.target.value); if (error) setError('') }}
                style={styles.input}
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.loginBtn,
                opacity: loading ? 0.7 : 1,
                cursor:  loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '⏳ Signing in...' : '🔐 Sign In'}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}

const styles = {
  /* Layout */
  wrapper:      { display: 'flex', minHeight: '100vh', fontFamily: "'Space Grotesk', sans-serif", background: '#F1F5F9', flexWrap: 'wrap' },

  /* Left panel */
  leftPanel:    { flex: 1, minWidth: 280, position: 'relative', backgroundImage: "url('https://images.unsplash.com/photo-1581092921461-eab62e97a780?q=80&w=1600&auto=format&fit=crop')", backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 50px', overflow: 'hidden' },
  overlay:      { position: 'absolute', inset: 0, background: 'linear-gradient(rgba(15,23,42,0.78), rgba(30,58,138,0.82))', zIndex: 1 },
  leftContent:  { position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 500 },
  brandName:    { fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 800, color: '#FFFFFF', letterSpacing: 3, margin: '0 0 14px', lineHeight: 1.1 },
  amp:          { color: '#93C5FD' },
  tagline:      { fontSize: 18, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', marginBottom: 40 },

  /* Right panel */
  rightPanel:   { width: 'clamp(300px, 40%, 500px)', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 30px' },
  formBox:      { width: '100%', maxWidth: 400, background: '#FFFFFF', borderRadius: 20, padding: '42px 38px', boxShadow: '0 10px 35px rgba(0,0,0,0.08)' },

  /* Form header */
  formHeader:   { textAlign: 'center', marginBottom: 28 },
  iconWrap:     { fontSize: 40, marginBottom: 10, filter: 'drop-shadow(0 4px 12px rgba(59,130,246,0.35))' },
  formTitle:    { fontSize: 26, fontWeight: 700, color: '#1E3A8A', margin: '0 0 6px' },
  formSubtitle: { fontSize: 13, color: '#64748B', margin: 0 },

  /* Error */
  errorBox:     { background: '#FEE2E2', color: '#991B1B', borderLeft: '4px solid #EF4444', padding: '12px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 20 },

  /* Inputs */
  formGroup:    { marginBottom: 18 },
  label:        { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 },
  input:        { width: '100%', padding: '13px 14px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", color: '#1F2937', background: '#FFFFFF', outline: 'none', boxSizing: 'border-box' },
  loginBtn:     { width: '100%', padding: '13px', background: 'linear-gradient(135deg, #1E3A8A, #2563EB)', color: '#FFFFFF', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", marginTop: 8 },

}