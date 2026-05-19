// ============================================================
// pages/tickets/EditTicket.jsx
// ============================================================
import { useState, useEffect }    from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ticketService }          from '../../services/ticketService'
import { inventoryService }       from '../../services/inventoryService'
import DeviceFields               from '../../components/forms/DeviceFields'
import ServiceTypeSelector        from '../../components/forms/ServiceTypeSelector'
import ProgressStepper            from '../../components/status/ProgressStepper'
import Alert                      from '../../components/ui/Alert'
import Spinner                    from '../../components/ui/Spinner'
import api                        from '../../lib/axios'

const STATUSES = ['Pending', 'Diagnostic', 'In Progress', 'Ready for Pickup', 'Completed']

// ---------------------------------------------------------------------------
// Helpers
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
    if (n.includes('received'))                          return 'Device Received'
    if (n.includes('back') || n.includes('correction') || n.includes('reverted'))
                                                         return 'Status Correction'
    if (n.includes('ready for pickup') || n.includes('completed'))
                                                         return 'Repair Progress'
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
// Component
// ---------------------------------------------------------------------------

export default function EditTicket() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [form,      setForm]      = useState(null)
  const [inventory, setInventory] = useState([])
  const [logs,      setLogs]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')

  useEffect(() => {
    Promise.all([
      ticketService.getOne(id),
      inventoryService.getAll(),
      api.get(`/tickets/${id}/logs`).then(r => r.data).catch(() => []),
    ]).then(([ticket, inv, logData]) => {
      setForm({
        customer_name:       ticket.customer_name || '',
        contact_number:      ticket.contact_number || '',
        customer_email:      ticket.customer_email || '',
        customer_address:    ticket.customer_address || '',
        customer_id:         ticket.customer_id || '',
        device_id:           ticket.device_id || '',
        device_type:         ticket.device_type || '',
        device_brand:        ticket.device_brand || '',
        imei:                ticket.imei || '',
        passcode:            ticket.passcode || '',
        problem_desc:        ticket.problem_desc || '',
        service_type:        ticket.service_type || 'Walk-In',
        address:             ticket.address || '',
        preferred_schedule:  ticket.preferred_schedule || '',
        diagnostic_notes:    ticket.diagnostic_notes || '',
        repair_notes:        ticket.repair_notes || '',
        additional_findings: ticket.additional_findings || '',
        assigned_tech:       ticket.assigned_tech || '',
        estimated_cost:      ticket.estimated_cost || '',
        status:              ticket.status || 'Pending',
        payment_status:      ticket.payment_status || 'Unpaid',
        completed_date:      ticket.completed_date || '',
        ticket_number:       ticket.ticket_number,
      })
      setInventory(inv)
      setLogs(logData)
    }).catch(err => {
      setError(err?.response?.data?.error || 'Failed to load ticket.')
    }).finally(() => setLoading(false))
  }, [id])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!form.customer_name.trim()) return setError('Customer name is required.')
    if (!form.problem_desc.trim())  return setError('Problem description is required.')
    if (form.service_type === 'On-Site' && !form.address.trim())
      return setError('Address is required for On-Site tickets.')

    setSaving(true)
    try {
      await ticketService.update(id, {
        ...form,
        estimated_cost: parseFloat(form.estimated_cost) || 0,
        completed_date: form.status === 'Completed'
          ? (form.completed_date || new Date().toISOString().slice(0, 10))
          : null,
      })
      setSuccess('Ticket updated successfully.')
      setTimeout(() => navigate(`/tickets/view/${id}`), 1200)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to update ticket.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />
  if (!form)   return <Alert type="error">{error || 'Ticket not found.'}</Alert>

  return (
    <>
      <div className="page-header">
        <div>
          <h1>✏️ Edit Ticket — {form.ticket_number}</h1>
          <p className="page-subtitle">Modify ticket details, status, and billing.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(`/tickets/view/${id}`)}>
          ← Back to View
        </button>
      </div>

      {error   && <Alert type="error"   style={{ marginBottom: 16 }}>{error}</Alert>}
      {success && <Alert type="success" style={{ marginBottom: 16 }}>{success}</Alert>}

      {/* Progress Stepper */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: '20px 24px' }}>
          <ProgressStepper currentStatus={form.status} />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Customer */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>👤 Customer Information</h2></div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name <span className="req">*</span></label>
                <input type="text" value={form.customer_name}
                  onChange={e => set('customer_name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Contact Number</label>
                <input type="text" value={form.contact_number}
                  onChange={e => set('contact_number', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.customer_email}
                  onChange={e => set('customer_email', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input type="text" value={form.customer_address}
                  onChange={e => set('customer_address', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Service Type */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>📋 Service Type</h2></div>
          <div className="card-body">
            <div className="form-group">
              <label>Service Type</label>
              <ServiceTypeSelector value={form.service_type}
                onChange={v => set('service_type', v)} />
            </div>
            {form.service_type === 'On-Site' && (
              <div className="form-grid" style={{ marginTop: 16 }}>
                <div className="form-group full">
                  <label>Service Address <span className="req">*</span></label>
                  <textarea rows={2} value={form.address}
                    onChange={e => set('address', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Preferred Schedule</label>
                  <input type="text" value={form.preferred_schedule}
                    onChange={e => set('preferred_schedule', e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Device */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>📱 Device Details</h2></div>
          <div className="card-body">
            <DeviceFields form={form} onChange={set} />
          </div>
        </div>

        {/* Technician */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>🔧 Technician Workspace</h2></div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Assigned Technician</label>
                <input type="text" value={form.assigned_tech}
                  onChange={e => set('assigned_tech', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Estimated Cost (₱)</label>
                <input type="number" min="0" step="0.01" value={form.estimated_cost}
                  onChange={e => set('estimated_cost', e.target.value)} />
              </div>
              <div className="form-group full">
                <label>Diagnostic Notes</label>
                <textarea rows={3} value={form.diagnostic_notes}
                  onChange={e => set('diagnostic_notes', e.target.value)} />
              </div>
              <div className="form-group full">
                <label>Repair Notes</label>
                <textarea rows={3} value={form.repair_notes}
                  onChange={e => set('repair_notes', e.target.value)} />
              </div>
              <div className="form-group full">
                <label>Additional Findings</label>
                <textarea rows={2} value={form.additional_findings}
                  onChange={e => set('additional_findings', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Status & Billing */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>⚙️ Status &amp; Billing</h2></div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Ticket Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <p className="hint">You can set any status — including going back to correct mistakes.</p>
              </div>
              <div className="form-group">
                <label>Payment Status</label>
                <select value={form.payment_status} onChange={e => set('payment_status', e.target.value)}>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
              {form.status === 'Completed' && (
                <div className="form-group">
                  <label>Date Completed</label>
                  <input type="date" value={form.completed_date}
                    onChange={e => set('completed_date', e.target.value)} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginBottom: 32 }}>
          <button type="button" className="btn btn-secondary"
            onClick={() => navigate(`/tickets/view/${id}`)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '⏳ Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </form>

      {/* Repair Timeline (formerly Activity Log) */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div className="card-header">
          <h2>📋 Repair Timeline</h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {logs.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--gray-400)', fontStyle: 'italic' }}>
              No activity recorded yet.
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {logs.map((log, i) => {
                const label   = friendlyLabel(log.change_type, log.notes)
                const style   = entryStyle(label)
                const byWhom  = formatChangedBy(log.changed_by)
                const notes   = cleanNotes(log.notes)

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
    </>
  )
}