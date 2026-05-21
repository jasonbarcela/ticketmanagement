// pages/public/TrackingPage.jsx — Public repair status tracker
import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../lib/axios'
import StatusBadge from '../../components/status/StatusBadge'
import { STEPPER_STATUSES } from '../../constants/ticketStatus'
import { HOME_SERVICE_STEPPER } from '../../constants/homeService'
import { formatServiceDate, formatPreferredTime } from '../../lib/formatSchedule'

const WALKIN_ICONS = {
  Pending: '✓',
  Diagnosing: '✓',
  Repairing: '✓',
  'Ready for Pickup': '✓',
  Completed: '✓',
}

const HOME_ICONS = {
  Pending: '✓',
  Approved: '✓',
  'On The Way': '✓',
  Completed: '✓',
}

function PublicShell({ children }) {
  return (
    <div className="track-page">
      <header className="track-header">
        <Link to="/home" className="track-brand">
          <span>🔧</span>
          <span>CODE <span className="accent">&amp;</span> LOCKS</span>
        </Link>
        <nav className="track-nav">
          <Link to="/home">Home</Link>
          <Link to="/book-online">Book Repair</Link>
          <Link to="/track" className="active">Repair Tracking</Link>
        </nav>
      </header>
      <main className="track-main">{children}</main>
    </div>
  )
}

function PublicStepper({ currentStatus, serviceType = 'Walk-In' }) {
  const isHome = serviceType === 'Home Service'
  const pipeline = isHome ? HOME_SERVICE_STEPPER : STEPPER_STATUSES
  const icons = isHome ? HOME_ICONS : WALKIN_ICONS
  const status = (currentStatus && String(currentStatus).trim()) || 'Pending'
  const idx = pipeline.indexOf(status)
  const activeIdx = idx >= 0 ? idx : 0

  return (
    <div className="track-stepper" role="list" aria-label="Repair progress">
      {pipeline.map((step, i) => {
        const done = i < activeIdx
        const current = i === activeIdx
        return (
          <div
            key={step}
            className={`track-step ${done ? 'done' : ''} ${current ? 'current' : ''}`}
            role="listitem"
          >
            {i < pipeline.length - 1 && <span className="track-step-line" aria-hidden />}
            <span className="track-step-dot">{done ? '✓' : icons[step]}</span>
            <span className="track-step-label">{step}</span>
          </div>
        )
      })}
    </div>
  )
}

function ActivityTimeline({ logs = [] }) {
  if (!logs.length) {
    return (
      <p className="track-empty-logs">
        Updates will appear here as your repair progresses.
      </p>
    )
  }

  return (
    <ul className="track-timeline">
      {[...logs].reverse().map((log, i) => (
        <li key={`${log.logged_at}-${i}`}>
          <span className="track-timeline-dot" />
          <div>
            <p className="track-timeline-note">{log.notes}</p>
            <time>
              {new Date(log.logged_at).toLocaleString('en-PH', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </time>
          </div>
        </li>
      ))}
    </ul>
  )
}

function TechnicianBlock({ ticket }) {
  if (ticket.service_type !== 'Home Service') return null

  const assignedDate = ticket.tech_assigned_date
    ? formatServiceDate(String(ticket.tech_assigned_date).slice(0, 10))
    : '—'

  return (
    <section className="card">
      <div className="card-header"><h2>Technician</h2></div>
      <div className="card-body hs-tech-card-body">
        <div className="hs-tech-stat">
          <span className="hs-tech-stat-label">Name</span>
          <span className="hs-tech-stat-value">{ticket.assigned_tech?.trim() || 'Not assigned yet'}</span>
        </div>
        <div className="hs-tech-stat">
          <span className="hs-tech-stat-label">Contact</span>
          <span className="hs-tech-stat-value">{ticket.tech_contact?.trim() || '—'}</span>
        </div>
        <div className="hs-tech-stat">
          <span className="hs-tech-stat-label">Assigned date</span>
          <span className="hs-tech-stat-value">{assignedDate}</span>
        </div>
      </div>
    </section>
  )
}

function TicketResult({ ticket, logs, onReset }) {
  const device = [ticket.device_brand, ticket.device_type].filter(Boolean).join(' — ')
  const isHome = ticket.service_type === 'Home Service'

  return (
    <div className="track-result">
      <section className="card track-hero">
        <div className="card-body">
          <p className="track-label">Ticket</p>
          <h2 className="track-ticket-num">{ticket.ticket_number}</h2>
          <div className="track-badges">
            <StatusBadge status={ticket.status} />
            <span className="track-payment-badge">{ticket.payment_status || 'Unpaid'}</span>
          </div>
          <PublicStepper currentStatus={ticket.status} serviceType={ticket.service_type} />
        </div>
      </section>

      <section className="card">
        <div className="card-header"><h2>Device</h2></div>
        <div className="card-body track-details">
          <div className="track-detail-row">
            <span>Device</span>
            <strong>{device || '—'}</strong>
          </div>
          <div className="track-detail-row">
            <span>Service type</span>
            <strong>{ticket.service_type}</strong>
          </div>
          {ticket.problem_desc && (
            <div className="track-detail-row">
              <span>Issue</span>
              <strong>{ticket.problem_desc}</strong>
            </div>
          )}
          {isHome && ticket.service_date && (
            <div className="track-detail-row">
              <span>Scheduled date</span>
              <strong>{formatServiceDate(String(ticket.service_date).slice(0, 10))}</strong>
            </div>
          )}
          {isHome && ticket.preferred_time && (
            <div className="track-detail-row">
              <span>Preferred time</span>
              <strong>{formatPreferredTime(String(ticket.preferred_time).slice(0, 5))}</strong>
            </div>
          )}
        </div>
      </section>

      <TechnicianBlock ticket={ticket} />

      <section className="card">
        <div className="card-header"><h2>Activity</h2></div>
        <div className="card-body">
          <ActivityTimeline logs={logs} />
        </div>
      </section>

      <div className="track-actions">
        <button type="button" className="btn btn-secondary" onClick={onReset}>
          Track another
        </button>
        <Link to="/book-online" className="btn btn-primary">Book a repair</Link>
      </div>
    </div>
  )
}

export default function TrackingPage() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState('ticket')
  const [ticketQuery, setTicketQuery] = useState(searchParams.get('q') || '')
  const [contactQuery, setContactQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ticket, setTicket] = useState(null)
  const [logs, setLogs] = useState([])

  const reset = () => {
    setTicket(null)
    setLogs([])
    setError('')
    setTicketQuery('')
    setContactQuery('')
  }

  const doLookup = async (opts = {}) => {
    const lookupMode = opts.mode ?? mode
    const ticketVal = (opts.ticket ?? ticketQuery).trim().toUpperCase()
    const contactVal = (opts.contact ?? contactQuery).trim()

    if (lookupMode === 'ticket' && !ticketVal) {
      return setError('Please enter your ticket number.')
    }
    if (lookupMode === 'contact' && contactVal.replace(/\D/g, '').length < 7) {
      return setError('Please enter a valid contact number.')
    }

    setError('')
    setTicket(null)
    setLogs([])
    setLoading(true)
    try {
      const params = lookupMode === 'ticket'
        ? { ticket: ticketVal }
        : { contact: contactVal }
      const res = await api.get('/tickets/track/lookup', { params })
      setTicket(res.data.ticket)
      setLogs(res.data.logs || [])
    } catch (err) {
      setError(err?.response?.data?.error || 'No matching repair found.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setMode('ticket')
      setTicketQuery(q)
      doLookup({ ticket: q, mode: 'ticket' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = e => {
    e.preventDefault()
    doLookup()
  }

  return (
    <PublicShell>
      <div className="track-intro">
        <h1>Track your repair</h1>
        <p>Use your ticket number or the contact number on file.</p>
      </div>

      {!ticket && (
        <section className="card track-search-card">
          <div className="card-body">
            <div className="track-mode-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'ticket'}
                className={mode === 'ticket' ? 'active' : ''}
                onClick={() => { setMode('ticket'); setError('') }}
              >
                Ticket number
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'contact'}
                className={mode === 'contact' ? 'active' : ''}
                onClick={() => { setMode('contact'); setError('') }}
              >
                Contact number
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {mode === 'ticket' ? (
                <>
                  <label htmlFor="ticket-num" className="track-label">Ticket number</label>
                  <input
                    id="ticket-num"
                    type="text"
                    placeholder="CL-2026-00003"
                    value={ticketQuery}
                    onChange={e => setTicketQuery(e.target.value.toUpperCase())}
                    className="track-input"
                    autoFocus
                    maxLength={15}
                  />
                </>
              ) : (
                <>
                  <label htmlFor="contact-num" className="track-label">Contact number</label>
                  <input
                    id="contact-num"
                    type="tel"
                    placeholder="09XX XXX XXXX"
                    value={contactQuery}
                    onChange={e => setContactQuery(e.target.value)}
                    className="track-input"
                    autoFocus
                  />
                </>
              )}
              {error && <div className="alert alert-error track-alert">{error}</div>}
              <button type="submit" className="btn btn-primary track-submit" disabled={loading}>
                {loading ? 'Looking up…' : 'Check status'}
              </button>
            </form>
          </div>
        </section>
      )}

      {ticket && <TicketResult ticket={ticket} logs={logs} onReset={reset} />}

      {!ticket && (
        <p className="track-footer-link">
          No ticket yet? <Link to="/book-online">Book a repair online</Link>
        </p>
      )}
    </PublicShell>
  )
}
