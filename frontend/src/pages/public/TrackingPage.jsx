// ============================================================
// pages/public/TrackingPage.jsx — Public Repair Status Tracker
//
// Fully PUBLIC route (/track). No login required.
//
// Customers enter their ticket number to look up:
//   • Ticket details (device, service type, date filed)
//   • Current repair status + 4-step progress stepper
//   • Payment status
//   • Assigned technician (name only, no internal notes)
//   • Estimated cost (shown once assigned)
//
// Sensitive fields (IMEI, passcode, diagnostic_notes) are
// excluded at the backend controller level.
//
// The ?q= query param allows deep-linking from the booking
// success receipt (e.g. /track?q=CL-2026-00042).
// ============================================================
import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../lib/axios'

// ── Re-usable step config (mirrors ProgressStepper.jsx) ──────
const STEPS = [
  { key: 'Pending Downpayment', icon: '💳', label: 'Pending Downpayment' },
  { key: 'Confirmed',           icon: '✅', label: 'Confirmed'            },
  { key: 'In Progress',         icon: '🔧', label: 'In Progress'          },
  { key: 'Completed',           icon: '🏁', label: 'Completed'            },
]

const STATUS_STYLES = {
  'Pending Downpayment': { bg: '#FEF3C7', color: '#92400E', border: '#F59E0B' },
  'Confirmed':           { bg: '#DBEAFE', color: '#1E40AF', border: '#3B82F6' },
  'In Progress':         { bg: '#EDE9FE', color: '#5B21B6', border: '#8B5CF6' },
  'Completed':           { bg: '#D1FAE5', color: '#065F46', border: '#10B981' },
}

const PAYMENT_STYLES = {
  'Unpaid': { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' },
  'Paid':   { bg: '#D1FAE5', color: '#065F46', border: '#A7F3D0' },
}

// ── Shared public chrome ──────────────────────────────────────
function PublicShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-100)' }}>
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
          <Link to="/book-online" style={{ color: '#94A3B8', textDecoration: 'none' }}>
            📋 Book a Repair
          </Link>
          <Link to="/track" style={{ color: '#93C5FD', textDecoration: 'none' }}>
            🔍 Track Ticket
          </Link>
          <Link to="/login" style={{ color: '#94A3B8', textDecoration: 'none' }}>
            Staff Login
          </Link>
        </div>
      </header>
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '36px 24px 60px' }}>
        {children}
      </main>
    </div>
  )
}

// ── Inline progress stepper ───────────────────────────────────
function PublicStepper({ currentStatus }) {
  const currentIdx = STEPS.findIndex(s => s.key === currentStatus)
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      justifyContent: 'center', padding: '12px 0 4px', gap: 0,
    }}>
      {STEPS.map((step, i) => {
        const done     = i < currentIdx
        const current  = i === currentIdx
        const dotBg    = done ? 'var(--blue)' : current ? 'var(--navy)' : 'var(--gray-200)'
        const dotColor = (done || current) ? '#fff' : 'var(--gray-400)'
        const labelColor = (done || current) ? 'var(--navy)' : 'var(--gray-400)'
        const lineColor  = done ? 'var(--blue)' : 'var(--gray-200)'

        return (
          <div key={step.key} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            flex: 1, position: 'relative', minWidth: 72,
          }}>
            {i < STEPS.length - 1 && (
              <div style={{
                position: 'absolute', top: 18, left: '50%',
                width: '100%', height: 2, background: lineColor, zIndex: 0,
              }} />
            )}
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: dotBg,
              border: current ? '2px solid var(--blue)' : '2px solid transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: done ? 14 : 16, fontWeight: 800, color: dotColor,
              position: 'relative', zIndex: 1,
              boxShadow: current ? '0 0 0 4px rgba(37,99,235,0.18)' : 'none',
              transition: 'all 0.2s',
            }}>
              {done ? '✓' : step.icon}
            </div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: labelColor,
              marginTop: 8, textAlign: 'center', lineHeight: 1.3, maxWidth: 80,
            }}>
              {step.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Status message per step ───────────────────────────────────
function StatusMessage({ status, serviceType }) {
  const messages = {
    'Pending Downpayment': {
      icon: '💳',
      text: 'Your home service request is pending downpayment confirmation. Our staff will contact you shortly.',
      bg: '#FEF3C7', color: '#92400E',
    },
    'Confirmed': {
      icon: serviceType === 'Home Service' ? '📞' : '🏪',
      text: serviceType === 'Home Service'
        ? 'Downpayment confirmed. Our team will be in touch to schedule your technician visit.'
        : 'Your walk-in is confirmed. Please present your ticket number to staff at the counter.',
      bg: '#DBEAFE', color: '#1E40AF',
    },
    'In Progress': {
      icon: '🔧',
      text: 'Your device is currently being diagnosed and repaired by our technician.',
      bg: '#EDE9FE', color: '#5B21B6',
    },
    'Completed': {
      icon: '🎉',
      text: 'Your repair is complete! You may claim your device at the shop.',
      bg: '#D1FAE5', color: '#065F46',
    },
  }
  const m = messages[status] || { icon: 'ℹ️', text: 'Status unknown.', bg: '#F1F5F9', color: '#475569' }
  return (
    <div style={{
      background: m.bg, color: m.color, padding: '12px 16px', borderRadius: 8,
      fontSize: 13.5, fontWeight: 600, display: 'flex', gap: 10,
      alignItems: 'flex-start', marginTop: 20,
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{m.icon}</span>
      <span>{m.text}</span>
    </div>
  )
}

// ── Detail row helper ─────────────────────────────────────────
function DetailRow({ label, value, mono }) {
  if (!value) return null
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '10px 0', borderBottom: '1px solid var(--gray-100)',
      gap: 16, alignItems: 'flex-start',
    }}>
      <span style={{
        fontSize: 12, fontWeight: 700, color: 'var(--gray-500)',
        textTransform: 'uppercase', letterSpacing: 0.4, flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 13.5, fontWeight: 600, color: 'var(--navy)',
        textAlign: 'right', fontFamily: mono ? 'monospace' : 'inherit',
      }}>
        {value}
      </span>
    </div>
  )
}

// ── Ticket result card ────────────────────────────────────────
function TicketCard({ ticket, onReset }) {
  const statusStyle  = STATUS_STYLES[ticket.status]  || { bg: '#E5E7EB', color: '#374151', border: '#9CA3AF' }
  const paymentStyle = PAYMENT_STYLES[ticket.payment_status] || PAYMENT_STYLES['Unpaid']

  const fmt = dateStr => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: '24px 28px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 4,
          }}>
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--gray-400)',
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
              }}>
                Ticket Number
              </div>
              <div style={{
                fontSize: 28, fontWeight: 900, fontFamily: 'monospace',
                color: 'var(--navy)', letterSpacing: 2,
              }}>
                {ticket.ticket_number}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: statusStyle.bg, color: statusStyle.color,
                border: `1px solid ${statusStyle.border}`, whiteSpace: 'nowrap',
              }}>
                {ticket.status}
              </span>
              <span style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: paymentStyle.bg, color: paymentStyle.color,
                border: `1px solid ${paymentStyle.border}`, whiteSpace: 'nowrap',
              }}>
                {ticket.payment_status}
              </span>
            </div>
          </div>

          <PublicStepper currentStatus={ticket.status} />
          <StatusMessage status={ticket.status} serviceType={ticket.service_type} />
        </div>
      </div>

      {/* Details */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h2>📋 Repair Details</h2></div>
        <div className="card-body">
          <DetailRow label="Customer"     value={ticket.customer_name} />
          <DetailRow label="Contact"      value={ticket.contact_number} />
          <DetailRow label="Device"       value={[ticket.device_brand, ticket.device_type].filter(Boolean).join(' — ')} />
          <DetailRow label="Issue"        value={ticket.problem_desc} />
          <DetailRow label="Service Type" value={ticket.service_type} />
          <DetailRow label="Date Filed"   value={fmt(ticket.received_date)} />
          {ticket.completed_date && (
            <DetailRow label="Date Completed" value={fmt(ticket.completed_date)} />
          )}
          {ticket.assigned_tech && (
            <DetailRow label="Technician" value={ticket.assigned_tech} />
          )}
          {parseFloat(ticket.estimated_cost) > 0 && (
            <DetailRow
              label="Estimated Cost"
              value={`₱${parseFloat(ticket.estimated_cost).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
            />
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={onReset}>
          🔍 Track Another Ticket
        </button>
        <Link to="/book-online" className="btn btn-primary">
          📋 Book a New Repair
        </Link>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function TrackingPage() {
  const [searchParams]        = useSearchParams()
  const [query,   setQuery]   = useState(searchParams.get('q') || '')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [ticket,  setTicket]  = useState(null)

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setQuery(q)
      doLookup(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doLookup = async (ticketNum) => {
    const val = (ticketNum || query).trim().toUpperCase()
    if (!val) return setError('Please enter your ticket number.')

    setError('')
    setTicket(null)
    setLoading(true)
    try {
      const res = await api.get(`/tickets/track/${val}`)
      setTicket(res.data.ticket)
    } catch (err) {
      const msg = err?.response?.data?.error
      setError(msg || 'No ticket found. Please check your ticket number and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = e => {
    e.preventDefault()
    doLookup(query)
  }

  const handleReset = () => {
    setTicket(null)
    setError('')
    setQuery('')
  }

  return (
    <PublicShell>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.7rem', marginBottom: 6 }}>🔍 Track Your Repair</h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
          Enter your ticket number to check the status of your device repair.
        </p>
      </div>

      {!ticket && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body" style={{ padding: '28px 32px' }}>
            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Ticket Number</label>
                <input
                  type="text"
                  placeholder="e.g. CL-2026-00042"
                  value={query}
                  onChange={e => setQuery(e.target.value.toUpperCase())}
                  style={{
                    fontSize: 18, fontFamily: 'monospace',
                    fontWeight: 700, letterSpacing: 2, textAlign: 'center',
                  }}
                  autoFocus
                  maxLength={15}
                />
                {/* ↓ Mentions both formats so old CL- customers aren't lost */}
                <p className="hint" style={{ textAlign: 'center', marginTop: 8 }}>
                  New tickets: <strong>CL-YYYY-XXXXX</strong> (e.g. CL-2026-00042) ·
                  Older tickets: <strong>CL-YEAR-SEQUENCE</strong> (e.g. CL-2026-00042)
                </p>
              </div>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: 16 }}>
                  <div>⚠️ {error}</div>
                </div>
              )}

              <button
                type="submit" className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '13px', fontSize: 15 }}
              >
                {loading ? '⏳ Looking up…' : '🔍 Check Status'}
              </button>
            </form>
          </div>
        </div>
      )}

      {ticket && <TicketCard ticket={ticket} onReset={handleReset} />}

      {!ticket && (
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--gray-500)', marginTop: 24 }}>
          Don't have a ticket yet?{' '}
          <Link to="/book-online" style={{ color: 'var(--blue)', fontWeight: 700 }}>
            Book a repair online →
          </Link>
        </p>
      )}
    </PublicShell>
  )
}