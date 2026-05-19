// ============================================================
// pages/public/PublicBookingPage.jsx — Customer Repair Intake
//
// Fully PUBLIC route (/book-online). No login required.
// Customers fill in their device info and submit a repair request.
// On success, shows the generated CL-YEAR-SEQUENCE ticket number and
// a link to the Public Repair Tracking Page.
//
// Uses a plain axios call (no X-User header) since this page
// is customer-facing and the backend endpoint is auth-free.
//
// Split-routing rule (enforced server-side):
//   Walk-In      → status = 'Confirmed'
//   Home Service → status = 'Pending Downpayment'
// ============================================================
import { useState }        from 'react'
import { Link }            from 'react-router-dom'
import axios               from 'axios'
import DeviceFields        from '../../components/forms/DeviceFields'
import ServiceTypeSelector from '../../components/forms/ServiceTypeSelector'

const BLANK = {
  customer_name: '', contact_number: '',
  device_type: '', device_brand: '', imei: '', passcode: '',
  problem_desc: '', service_type: 'Walk-In',
  address: '', preferred_schedule: '',
}

// ── Shared page chrome (brand bar + footer) ───────────────────
function PublicShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-100)' }}>
      {/* Top bar */}
      <header style={{
        background: 'var(--navy)',
        padding: '0 32px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🔧</span>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: 0.5 }}>
            CODE <span style={{ color: '#60A5FA' }}>&amp;</span> LOCKS
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, fontWeight: 600 }}>
          <Link to="/book-online" style={{ color: '#93C5FD', textDecoration: 'none' }}>
            📋 Book a Repair
          </Link>
          <Link to="/track" style={{ color: '#94A3B8', textDecoration: 'none' }}>
            🔍 Track Ticket
          </Link>
          <Link to="/login" style={{ color: '#94A3B8', textDecoration: 'none' }}>
            Staff Login
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main style={{ maxWidth: 780, margin: '0 auto', padding: '36px 24px 60px' }}>
        {children}
      </main>
    </div>
  )
}

// ── Success receipt shown after submission ────────────────────
function SuccessReceipt({ result, onNew }) {
  return (
    <div style={{ maxWidth: 540, margin: '0 auto', textAlign: 'center' }}>
      <div className="card">
        <div className="card-body" style={{ padding: '40px 32px' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
          <h2 style={{ color: 'var(--navy)', marginBottom: 8 }}>Request Submitted!</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>
            Your repair request has been received. Save your ticket number — you'll need it to track your repair status.
          </p>

          {/* Ticket number display */}
          <div style={{
            background: 'var(--light-blue)',
            border: '2px solid var(--blue)',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Your Ticket Number
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--navy)', letterSpacing: 3, fontFamily: 'monospace' }}>
              {result.ticket_number}
            </div>
          </div>

          {/* Status badge */}
          <div style={{
            display: 'inline-block',
            padding: '8px 20px',
            borderRadius: 8,
            background: result.status === 'Pending Downpayment' ? '#FEF3C7' : '#D1FAE5',
            color:      result.status === 'Pending Downpayment' ? '#92400E'  : '#065F46',
            fontWeight: 700,
            fontSize: 13,
            marginBottom: 24,
            border: `1px solid ${result.status === 'Pending Downpayment' ? '#F59E0B' : '#10B981'}`,
          }}>
            Status: {result.status}
          </div>

          {/* Contextual instructions */}
          {result.status === 'Pending Downpayment' && (
            <div className="alert alert-info" style={{ marginBottom: 20, textAlign: 'left' }}>
              <div>
                <strong>Home Service request received.</strong> Our staff will contact you
                shortly to confirm the downpayment before scheduling your technician visit.
              </div>
            </div>
          )}
          {result.status === 'Confirmed' && (
            <div className="alert alert-success" style={{ marginBottom: 20, textAlign: 'left' }}>
              <div>
                <strong>Walk-In confirmed!</strong> Please proceed to the shop counter
                and present your ticket number to our staff.
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <Link
              to={`/track?q=${result.ticket_number}`}
              className="btn btn-primary"
            >
              🔍 Track This Ticket
            </Link>
            <button className="btn btn-secondary" onClick={onNew}>
              + Submit Another
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────
export default function PublicBookingPage() {
  const [form,       setForm]       = useState(BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
  const [result,     setResult]     = useState(null)

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')

    // Client-side guards
    if (!form.customer_name.trim())  return setError('Full name is required.')
    if (!form.contact_number.trim()) return setError('Contact number is required.')
    if (!form.device_type)           return setError('Device type is required.')
    if (!form.problem_desc.trim())   return setError('Problem description is required.')
    if (form.service_type === 'Home Service' && !form.address.trim())
      return setError('Service address is required for Home Service requests.')

    setSubmitting(true)
    try {
      // Plain axios — no X-User header (public endpoint)
      const res = await axios.post('/api/bookings', form, {
        headers: { 'Content-Type': 'application/json' },
      })
      setResult(res.data)
    } catch (err) {
      setError(err?.response?.data?.error || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <PublicShell>
        <SuccessReceipt result={result} onNew={() => { setResult(null); setForm(BLANK) }} />
      </PublicShell>
    )
  }

  return (
    <PublicShell>
      {/* Page header */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.7rem', marginBottom: 6 }}>📋 Book a Repair</h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
          Fill in the form below to submit your device for repair. Walk-in and home service are both available.
        </p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          <div>⚠️ {error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── Customer ──────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>👤 Your Information</h2></div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Juan dela Cruz"
                  value={form.customer_name}
                  onChange={e => set('customer_name', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Contact Number <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. 09171234567"
                  value={form.contact_number}
                  onChange={e => set('contact_number', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Service Type ──────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>🏠 Service Type</h2></div>
          <div className="card-body">
            <div className="form-group">
              <ServiceTypeSelector value={form.service_type} onChange={v => set('service_type', v)} />
              <p className="hint" style={{ marginTop: 10 }}>
                <strong>Walk-In</strong> — Bring your device to our shop. Status goes directly to <em>Confirmed</em>.<br />
                <strong>Home Service</strong> — A technician visits your location. Requires downpayment confirmation first.
              </p>
            </div>

            {form.service_type === 'Home Service' && (
              <div className="form-grid" style={{ marginTop: 16 }}>
                <div className="form-group full">
                  <label>Service Address <span className="req">*</span></label>
                  <textarea
                    rows={2}
                    placeholder="Complete address for the technician visit"
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Preferred Schedule</label>
                  <input
                    type="text"
                    placeholder="e.g. Weekdays, morning preferred"
                    value={form.preferred_schedule}
                    onChange={e => set('preferred_schedule', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Device ────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h2>📱 Device Details</h2></div>
          <div className="card-body">
            <DeviceFields form={form} onChange={set} />
          </div>
        </div>

        {/* ── Submit ────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ minWidth: 200, padding: '13px 28px', fontSize: 15 }}
          >
            {submitting ? '⏳ Submitting…' : '📋 Submit Repair Request'}
          </button>
        </div>
      </form>
    </PublicShell>
  )
}
