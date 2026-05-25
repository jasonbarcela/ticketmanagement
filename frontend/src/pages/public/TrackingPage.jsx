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

const PHOTO_STAGES = ['Before', 'During', 'After']

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

function filterPublicLogNotes(notes) {
  if (!notes) return ''
  return notes
    .replace(/\s*via\s+(editor|system|api|backend)\s*/gi, ' ')
    .replace(/\bticket_id\b/gi, 'ticket')
    .replace(/\s+/g, ' ')
    .trim()
}

function logDisplayLabel(changeType) {
  if (changeType === 'Tech Note') return 'Additional Findings'
  if (changeType === 'Photo Added') return 'Repair Documentation'
  if (changeType === 'Checklist Update') return 'Repair Progress'
  if (changeType === 'Customer Update') return 'Update'
  return 'Status Update'
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
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              color: log.change_type === 'Tech Note' ? '#7C3AED' : 'var(--gray-500)',
              display: 'block', marginBottom: 4,
            }}>
              {logDisplayLabel(log.change_type)}
            </span>
            <p className="track-timeline-note">{filterPublicLogNotes(log.notes)}</p>
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

const php = (v) => `₱${parseFloat(v || 0).toFixed(2)}`

function TicketResult({ ticket, logs, partsData, problemItems, repairSteps, photos, onReset }) {
  const device = [ticket.device_brand, ticket.device_type].filter(Boolean).join(' — ')
  const isHome = ticket.service_type === 'Home Service'
  const partsVisible = partsData?.visible === true
  const parts = partsData?.parts || []
  const repairNotes = (ticket.repair_notes || '').trim()
  const confirmedIssues = problemItems.filter(i => i.is_checked).length
  const hasPhotos = photos.length > 0
  const photoStages = PHOTO_STAGES.filter(s => photos.some(p => p.photo_stage === s))

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
          {device && (
            <p style={{ fontSize: 14, color: 'var(--gray-600)', marginTop: 8 }}>{device} · {ticket.service_type}</p>
          )}
          <PublicStepper currentStatus={ticket.status} serviceType={ticket.service_type} />
        </div>
      </section>

      {problemItems.length > 0 && (
        <section className="card">
          <div className="card-header"><h2>What You Reported</h2></div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 12 }}>
              {confirmedIssues} of {problemItems.length} issue{problemItems.length !== 1 ? 's' : ''} confirmed on your device
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {problemItems.map((item, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 0', borderBottom: '1px solid var(--gray-100)', fontSize: 14,
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1.2 }}>{item.is_checked ? '✅' : '⏳'}</span>
                  <div>
                    <strong>{item.label}</strong>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                      {item.is_checked ? 'Confirmed by our technician' : 'Pending confirmation'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="hint" style={{ marginTop: 12, fontSize: 12 }}>
              These are the issues you described when you submitted your device for repair.
            </p>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-header"><h2>🔍 Diagnostics &amp; Findings</h2></div>
        <div className="card-body">
          {ticket.diagnostic_notes ? (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 4 }}>
                Diagnostic Notes
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{ticket.diagnostic_notes}</p>
            </div>
          ) : null}
          {repairNotes ? (
            <div style={{ marginBottom: ticket.additional_findings ? 16 : 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 4 }}>
                Repair Notes
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{repairNotes}</p>
            </div>
          ) : null}
          {ticket.additional_findings ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 4 }}>
                Additional Findings
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{ticket.additional_findings}</p>
            </div>
          ) : null}
          {!ticket.diagnostic_notes && !repairNotes && !ticket.additional_findings && (
            <p style={{ color: 'var(--gray-500)', fontSize: 14, fontStyle: 'italic', margin: 0 }}>
              Diagnostic findings will appear here as your repair progresses.
            </p>
          )}
        </div>
      </section>

      {logs.length > 0 && (
        <section className="card">
          <div className="card-header"><h2>Activity</h2></div>
          <div className="card-body">
            <ActivityTimeline logs={logs} />
          </div>
        </section>
      )}

      <TechnicianBlock ticket={ticket} />

      {repairSteps.length > 0 && (
        <section className="card">
          <div className="card-header"><h2>How We Repair Your Device</h2></div>
          <div className="card-body">
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
              {repairSteps.map((item, i) => (
                <li key={i} style={{ marginBottom: 8 }}>{item.label}</li>
              ))}
            </ol>
            <p className="hint" style={{ marginTop: 12, fontSize: 12 }}>
              Standard steps our technicians follow during your repair.
            </p>
          </div>
        </section>
      )}

      {partsVisible && (
        <section className="card">
          <div className="card-header"><h2>Parts Used in Your Repair</h2></div>
          <div className="card-body">
            {parts.length === 0 ? (
              <p style={{ color: 'var(--gray-500)', fontSize: 14, fontStyle: 'italic' }}>
                No parts have been recorded yet for this repair.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
                    <th style={{ textAlign: 'left', padding: 8 }}>Part</th>
                    <th style={{ padding: 8 }}>Qty</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Price</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((p, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: 8 }}>
                        {p.part_name}
                        {p.customer_provided && (
                          <span style={{
                            marginLeft: 8, fontSize: 10, fontWeight: 700,
                            background: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: 4,
                          }}>
                            Your Part
                          </span>
                        )}
                      </td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{p.quantity}</td>
                      <td style={{ padding: 8, textAlign: 'right' }}>
                        {p.customer_provided ? '—' : php(p.unit_price)}
                      </td>
                      <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>
                        {p.customer_provided ? '—' : php(p.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="hint" style={{ marginTop: 12, fontSize: 12 }}>
              Parts are charged at retail price and included in your total bill.
            </p>
          </div>
        </section>
      )}

      {hasPhotos && (
        <section className="card">
          <div className="card-header"><h2>Repair Documentation</h2></div>
          <div className="card-body">
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${photoStages.length}, 1fr)`,
              gap: 16,
            }}>
              {photoStages.map(stage => (
                <div key={stage}>
                  <h3 style={{ fontSize: 13, marginBottom: 8, color: 'var(--gray-600)' }}>{stage}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {photos.filter(p => p.photo_stage === stage).map(p => (
                      <img
                        key={p.photo_id}
                        src={p.file_url}
                        alt={p.caption || stage}
                        style={{
                          width: '100%', height: 90, objectFit: 'cover', borderRadius: 6,
                          cursor: 'pointer', border: '1px solid var(--gray-200)',
                        }}
                        onClick={() => window.open(p.file_url, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="hint" style={{ marginTop: 12, fontSize: 12 }}>
              Photos are taken by the technician to document the repair process.
            </p>
          </div>
        </section>
      )}

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
  const [partsData, setPartsData] = useState({ visible: false, parts: [] })
  const [problemItems, setProblemItems] = useState([])
  const [repairSteps, setRepairSteps] = useState([])
  const [photos, setPhotos] = useState([])
  const [trackNumber, setTrackNumber] = useState('')

  const reset = () => {
    setTicket(null)
    setLogs([])
    setPartsData({ visible: false, parts: [] })
    setProblemItems([])
    setRepairSteps([])
    setPhotos([])
    setTrackNumber('')
    setError('')
    setTicketQuery('')
    setContactQuery('')
  }

  const fetchExtras = async (ticketNumber) => {
    const num = ticketNumber.trim().toUpperCase()
    const [partsRes, checklistRes, photosRes] = await Promise.all([
      api.get(`/tickets/track/parts/${num}`).then(r => r.data).catch(() => ({ visible: false, parts: [] })),
      api.get(`/tickets/track/checklist/${num}`).then(r => r.data).catch(() => ({ items: [] })),
      api.get(`/tickets/track/photos/${num}`).then(r => r.data).catch(() => ({ photos: [] })),
    ])
    setPartsData(partsRes)
    const allItems = checklistRes.items || []
    setProblemItems(
      checklistRes.problems?.length
        ? checklistRes.problems
        : allItems.filter(i => i.checklist_type === 'Problem')
    )
    setRepairSteps(
      checklistRes.repair_steps?.length
        ? checklistRes.repair_steps
        : allItems.filter(i => !i.checklist_type || i.checklist_type === 'Repair')
    )
    setPhotos(photosRes.photos || [])
  }

  const refreshTicket = async (ticketNumber) => {
    const num = (ticketNumber || trackNumber).trim().toUpperCase()
    if (!num) return
    try {
      const res = await api.get(`/tickets/track/${num}`)
      setTicket(res.data.ticket)
      setLogs(res.data.logs || [])
      await fetchExtras(num)
    } catch (_) {}
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
      const t = res.data.ticket
      setTicket(t)
      setLogs(res.data.logs || [])
      const num = t.ticket_number
      setTrackNumber(num)
      await fetchExtras(num)
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

  useEffect(() => {
    if (!ticket?.ticket_number) return undefined
    const timer = setInterval(() => refreshTicket(ticket.ticket_number), 20000)
    return () => clearInterval(timer)
  }, [ticket?.ticket_number])

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

      {ticket && (
        <TicketResult
          ticket={ticket}
          logs={logs}
          partsData={partsData}
          problemItems={problemItems}
          repairSteps={repairSteps}
          photos={photos}
          onReset={reset}
        />
      )}

      {!ticket && (
        <p className="track-footer-link">
          No ticket yet? <Link to="/book-online">Book a repair online</Link>
        </p>
      )}
    </PublicShell>
  )
}