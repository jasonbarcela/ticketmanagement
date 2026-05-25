// ============================================================
// pages/tickets/ViewTicket.jsx
// ============================================================
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ticketService } from '../../services/ticketService'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/axios'
import { paymentService } from '../../services/paymentService'
import ProgressStepper from '../../components/status/ProgressStepper'
import StatusBadge from '../../components/status/StatusBadge'
import PaymentBadge from '../../components/status/PaymentBadge'
import Spinner from '../../components/ui/Spinner'
import Alert from '../../components/ui/Alert'
import ReceiptModal from '../../components/modals/ReceiptModal'
import { formatServiceDate, formatPreferredTime } from '../../lib/formatSchedule'

// ---------------------------------------------------------------------------
// Helpers (shared logic — consider moving to a utils file)
// ---------------------------------------------------------------------------

/**
 * Parses changed_by which may be a raw JSON string like
 * {"username":"admin","role":"admin"} or a plain name like "Mark".
 * Returns a human-readable label.
 */
function formatChangedBy(raw) {
  if (!raw) return 'Staff'
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (parsed && parsed.role && parsed.username) {
      const role = parsed.role.toLowerCase()
      const name = parsed.username
      if (role === 'admin') return 'Admin'
      if (role === 'technician' || role === 'tech')
        return `Technician ${name.charAt(0).toUpperCase() + name.slice(1)}`
      return name.charAt(0).toUpperCase() + name.slice(1)
    }
  } catch (_) {
    // not JSON — use as-is
  }
  return String(raw)
}

/**
 * Strips developer-ish phrases such as "via editor", "via system", etc.
 */
function cleanNotes(notes) {
  if (!notes) return ''
  return notes
    .replace(/\s*via\s+(editor|system|api|backend)\s*/gi, ' ')
    .trim()
}

/**
 * Maps raw change_type values to friendly human labels.
 * Uses the notes content for smarter labelling when possible.
 */
function friendlyLabel(changeType, notes) {
  const n = (notes || '').toLowerCase()
  if (changeType === 'Status Change') {
    if (n.includes('received'))                                              return 'Device Received'
    if (n.includes('back') || n.includes('correction') || n.includes('reverted'))
                                                                             return 'Status Correction'
    if (n.includes('ready for pickup') || n.includes('completed'))          return 'Repair Progress'
    return 'Repair Progress'
  }
  if (changeType === 'Tech Note')  return 'Diagnosis Update'
  if (changeType === 'Info Update' || changeType === 'Update') return 'Info Update'
  return changeType || 'Update'
}

/**
 * Returns icon + color config per friendly label.
 */
function entryStyle(label) {
  switch (label) {
    case 'Device Received':   return { icon: '🔵', bg: '#EFF6FF', color: '#1D4ED8' }
    case 'Diagnosis Update':  return { icon: '🛠', bg: '#F5F3FF', color: '#7C3AED' }
    case 'Repair Progress':   return { icon: '🟡', bg: '#FFFBEB', color: '#B45309' }
    case 'Status Correction': return { icon: '🔴', bg: '#FFF5F5', color: '#C53030' }
    case 'Info Update':       return { icon: '👤', bg: '#F0FDF4', color: '#065F46' }
    default:                  return { icon: '📝', bg: '#F9FAFB', color: '#374151' }
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Row({ label, value, mono }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid var(--gray-100)' }}>
      <div style={{ width: 180, flexShrink: 0, fontWeight: 600, fontSize: 12, color: 'var(--gray-500)' }}>{label}</div>
      <div style={{ flex: 1, fontSize: 14, color: 'var(--navy)', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
    </div>
  )
}

function TechnicianInfoCard({ ticket }) {
  const assignedDisplay = ticket.tech_assigned_date
    ? formatServiceDate(String(ticket.tech_assigned_date).slice(0, 10))
    : '—'

  return (
    <div className="card hs-tech-card">
      <div className="card-header"><h2>Technician</h2></div>
      <div className="card-body">
        <div className="hs-tech-stat">
          <div className="hs-tech-stat-label">Technician Name</div>
          <div className="hs-tech-stat-value">{ticket.assigned_tech?.trim() || 'Not assigned yet'}</div>
        </div>
        <div className="hs-tech-stat">
          <div className="hs-tech-stat-label">Contact Number</div>
          <div className="hs-tech-stat-value">{ticket.tech_contact?.trim() || '—'}</div>
        </div>
        <div className="hs-tech-stat">
          <div className="hs-tech-stat-label">Assigned Date</div>
          <div className="hs-tech-stat-value">{assignedDisplay}</div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ViewTicket() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [ticket,    setTicket]    = useState(null)
  const [parts,     setParts]     = useState([])
  const [billing,   setBilling]   = useState(null)
  const [logs,      setLogs]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [showReceipt, setShowReceipt] = useState(false)
  const [flash,     setFlash]     = useState(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('Cash')
  const [paySaving, setPaySaving] = useState(false)
  const isAdmin = user?.role === 'admin'

  const refreshBillingData = async () => {
    const [ticketData, billingRes] = await Promise.all([
      ticketService.getOne(id),
      paymentService.getSummary(id).catch(() => null),
    ])
    setTicket(ticketData)
    if (billingRes) setBilling(billingRes)
    return { ticketData, billingRes }
  }

  const handleRecordPayment = async e => {
    e.preventDefault()
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) return setFlash({ msg: 'Enter a valid payment amount.', type: 'error' })
    setPaySaving(true)
    try {
      const res = await paymentService.recordPayment({
        ticket_id: parseInt(id, 10),
        amount_paid: amount,
        payment_method: payMethod,
      })
      if (res.payment_status) {
        setBilling(prev => ({
          ...(prev || {}),
          payment_status: res.payment_status,
          remaining_balance: res.remaining_balance,
          total_paid: res.total_paid,
          grand_total: res.grand_total,
          labor_cost: res.labor_cost,
          parts_cost: res.parts_cost,
        }))
        setTicket(prev => prev ? { ...prev, payment_status: res.payment_status } : prev)
      }
      await refreshBillingData()
      setPayAmount('')
      setFlash({ msg: `Payment of ₱${amount.toFixed(2)} recorded. Status: ${res.payment_status}.`, type: 'success' })
    } catch (err) {
      setFlash({ msg: err?.response?.data?.error || 'Payment failed.', type: 'error' })
    } finally {
      setPaySaving(false)
    }
  }

  const loadLogs = async () => {
    try {
      const logData = await api.get(`/tickets/${id}/logs`).then(r => r.data).catch(() => [])
      setLogs(logData)
    } catch (_) {}
  }

  const loadData = async () => {
    try {
      const [ticketData, logData] = await Promise.all([
        ticketService.getOne(id),
        api.get(`/tickets/${id}/logs`).then(r => r.data).catch(() => []),
      ])
      setTicket(ticketData)
      setLogs(logData)
      api.get(`/inventory/ticket/${id}`).then(r => setParts(r.data || [])).catch(() => {})
      await refreshBillingData()
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load ticket.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    loadData()
  }, [id])

  useEffect(() => {
    const billingTimer = setInterval(refreshBillingData, 30000)
    return () => clearInterval(billingTimer)
  }, [id])

  useEffect(() => {
    const logTimer = setInterval(loadLogs, 15000)
    return () => clearInterval(logTimer)
  }, [id])

  if (loading) return <Spinner />
  if (error)   return <Alert type="error">{error}</Alert>
  if (!ticket) return <Alert type="error">Ticket not found.</Alert>

  const isHomeService = ticket.service_type === 'Home Service'
  const serviceDateLabel = ticket.service_date
    ? formatServiceDate(String(ticket.service_date).slice(0, 10))
    : null
  const preferredTimeLabel = ticket.preferred_time
    ? formatPreferredTime(String(ticket.preferred_time).slice(0, 5))
    : null

  return (
    <>
      {showReceipt && (
        <ReceiptModal ticketId={ticket.ticket_id} onClose={() => setShowReceipt(false)} />
      )}

      {/* Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h1 style={{ margin: 0 }}>{ticket.ticket_number}</h1>
            <StatusBadge status={ticket.status} />
            <PaymentBadge status={billing ? billing.payment_status : ticket.payment_status} />
          </div>
          <p className="page-subtitle">
            Received: {ticket.received_date} · Mode: {ticket.service_type}
            {ticket.completed_date ? ` · Completed: ${ticket.completed_date}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={() => setShowReceipt(true)}>
            🖨️ Print Ticket
          </button>
          <Link to={`/tickets/edit/${id}`} className="btn btn-primary">✏️ Edit Ticket</Link>
          <button className="btn btn-secondary" onClick={() => navigate('/tickets')}>← Back</button>
        </div>
      </div>

      {flash && <Alert type={flash.type} style={{ marginBottom: 16 }}>{flash.msg}</Alert>}

      {/* Progress (read-only — edit ticket to change status) */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: '20px 24px' }}>
          <ProgressStepper currentStatus={ticket.status} serviceType={ticket.service_type} />
        </div>
      </div>

      <div className="ticket-detail-grid">
        {/* Customer */}
        <div className="card">
          <div className="card-header"><h2>Customer</h2></div>
          <div className="card-body">
            <Row label="Name"     value={ticket.customer_name} />
            <Row label="Contact"  value={ticket.contact_number} />
            <Row label="Email"    value={ticket.customer_email} />
            {!isHomeService && (
              <Row label="Address" value={ticket.address || ticket.customer_address} />
            )}
          </div>
        </div>

        {isHomeService && (
          <div className="card">
            <div className="card-header"><h2>Service Address &amp; Schedule</h2></div>
            <div className="card-body">
              <Row label="Address" value={ticket.address || ticket.customer_address} />
              <Row label="Assigned Date" value={serviceDateLabel} />
              <Row label="Preferred Time" value={preferredTimeLabel} />
            </div>
          </div>
        )}

        {/* Device */}
        <div className="card">
          <div className="card-header"><h2>Device</h2></div>
          <div className="card-body">
            <Row label="Type"    value={ticket.device_type} />
            <Row label="Brand"   value={ticket.device_brand} />
            <Row label="IMEI"    value={ticket.imei} mono />
            <Row label="Passcode"value={ticket.passcode} mono />
            <Row label="Problem" value={ticket.problem_desc} />
          </div>
        </div>

        {isHomeService && <TechnicianInfoCard ticket={ticket} />}

        {/* Diagnostics */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header"><h2>🔧 Diagnostics &amp; Parts</h2></div>
          <div className="card-body">
            {!isHomeService && (
              <Row label="Assigned Tech" value={ticket.assigned_tech || 'Unassigned'} />
            )}
            <Row label="Diagnostic Notes"    value={ticket.diagnostic_notes || '—'} />
            <Row label="Repair Notes"        value={ticket.repair_notes || '—'} />
            <Row label="Additional Findings" value={ticket.additional_findings || '—'} />

            {parts.length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--gray-200)' }}>
                <h3 style={{ fontSize: 13, marginBottom: 10, color: 'var(--gray-600)' }}>Parts Used</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
                      <th style={{ padding: 8, textAlign: 'left' }}>Code</th>
                      <th style={{ padding: 8, textAlign: 'left' }}>Part Name</th>
                      <th style={{ padding: 8 }}>Qty</th>
                      <th style={{ padding: 8, textAlign: 'right' }}>Unit Price</th>
                      <th style={{ padding: 8, textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                        <td style={{ padding: 8, fontFamily: 'monospace' }}>{p.part_code}</td>
                        <td style={{ padding: 8 }}>{p.part_name}</td>
                        <td style={{ padding: 8, textAlign: 'center' }}>{p.quantity}</td>
                        <td style={{ padding: 8, textAlign: 'right' }}>₱{parseFloat(p.unit_price).toFixed(2)}</td>
                        <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>₱{(p.quantity * p.unit_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Billing — admin only */}
        {isAdmin && (
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <div className="card-header"><h2>💰 Billing Summary</h2></div>
            <div className="card-body">
              {billing ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div style={{ padding: 12, background: 'var(--gray-50)', borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>LABOR FEE</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>₱{parseFloat(billing.labor_cost).toFixed(2)}</div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--gray-50)', borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>PARTS TOTAL</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>₱{parseFloat(billing.parts_cost).toFixed(2)}</div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--navy)', borderRadius: 6, color: '#fff' }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>GRAND TOTAL</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>₱{parseFloat(billing.grand_total).toFixed(2)}</div>
                  </div>
                  <div style={{ padding: 12, background: 'var(--gray-50)', borderRadius: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>AMOUNT PAID</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'green' }}>₱{parseFloat(billing.total_paid).toFixed(2)}</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 6, gridColumn: 'span 2', border: billing.remaining_balance > 0 ? '1px solid #feb2b2' : '1px solid #c6f6d5', background: billing.remaining_balance > 0 ? '#fff5f5' : '#f5fff5' }}>
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>BALANCE DUE</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: billing.remaining_balance > 0 ? '#c53030' : 'green' }}>
                      {billing.remaining_balance > 0 ? `₱${parseFloat(billing.remaining_balance).toFixed(2)}` : '✓ Fully Paid'}
                    </div>
                  </div>
                </div>
              ) : (
                <Row label="Estimated Cost" value={`₱${parseFloat(ticket.estimated_cost || 0).toFixed(2)}`} />
              )}
              <PaymentBadge status={billing ? billing.payment_status : ticket.payment_status} />

              {billing && billing.remaining_balance > 0 && (
                <form onSubmit={handleRecordPayment} style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--gray-200)' }}>
                  <h3 style={{ fontSize: 14, marginBottom: 12 }}>Record Payment</h3>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0, minWidth: 120 }}>
                      <label>Amount (₱)</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                        placeholder={billing.remaining_balance.toFixed(2)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0, minWidth: 140 }}>
                      <label>Method</label>
                      <select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                        <option value="Cash">Cash</option>
                        <option value="GCash">GCash</option>
                        <option value="PayMaya">PayMaya</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={paySaving}>
                      {paySaving ? 'Recording…' : 'Record Payment'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Repair Timeline (formerly Activity Log) */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Repair Activity</h2>
            <button type="button" className="btn btn-secondary btn-sm" onClick={loadLogs}>
              🔄 Refresh
            </button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {logs.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                No activity recorded yet.
              </div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                {logs.map((log, i) => {
                  const label  = friendlyLabel(log.change_type, log.notes)
                  const style  = entryStyle(label)
                  const byWhom = formatChangedBy(log.changed_by)
                  const notes  = cleanNotes(log.notes)

                  return (
                    <div key={log.log_id} style={{
                      display: 'flex', gap: 16, padding: '14px 20px',
                      borderBottom: i < logs.length - 1 ? '1px solid var(--gray-100)' : 'none',
                      alignItems: 'flex-start',
                    }}>
                      {/* Icon */}
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                        background: style.bg,
                      }}>
                        {style.icon}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: 0.5, color: style.color,
                          }}>
                            {label}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                            {new Date(log.logged_at).toLocaleString('en-PH', {
                              month: 'short', day: 'numeric', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {notes && (
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.5 }}>
                            {notes}
                          </p>
                        )}
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--gray-400)' }}>
                          by <strong>{byWhom}</strong>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}