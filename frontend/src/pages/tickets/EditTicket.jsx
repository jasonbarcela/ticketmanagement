// ============================================================
// pages/tickets/EditTicket.jsx
// Updated: Parts management section with inventory deduction.
// Admin/Tech can add parts to a ticket; inventory is reduced.
// ============================================================
import { useState, useEffect }    from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { TICKET_STATUSES } from '../../constants/ticketStatus'
import {
  HOME_SERVICE_STATUSES,
  canAssignHomeServiceTech,
  normalizeHomeServiceStatus,
} from '../../constants/homeService'
import { ticketService }          from '../../services/ticketService'
import { inventoryService }       from '../../services/inventoryService'
import DeviceFields               from '../../components/forms/DeviceFields'
import ServiceTypeSelector        from '../../components/forms/ServiceTypeSelector'
import ProgressStepper            from '../../components/status/ProgressStepper'
import HomeServiceScheduleFields  from '../../components/forms/HomeServiceScheduleFields'
import Alert                      from '../../components/ui/Alert'
import Spinner                    from '../../components/ui/Spinner'
import api                        from '../../lib/axios'


// ── Log helpers (same as before) ─────────────────────────────
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
  } catch (_) {}
  return String(raw)
}
function cleanNotes(notes) {
  if (!notes) return ''
  return notes.replace(/\s*via\s+(editor|system|api|backend)\s*/gi, ' ').trim()
}
function friendlyLabel(changeType, notes) {
  const n = (notes || '').toLowerCase()
  if (changeType === 'Status Change') {
    if (n.includes('booking approved')) return 'Booking Approved'
    if (n.includes('technician assigned')) return 'Technician Assigned'
    if (n.includes('home service completed')) return 'Home Service Completed'
    if (n.includes('on the way')) return 'Status Updated'
    if (n.includes('home service request submitted')) return 'Request Submitted'
    if (n.includes('received')) return 'Device Received'
    if (n.includes('back') || n.includes('correction') || n.includes('reverted')) return 'Status Correction'
    if (n.includes('ready for pickup') || n.includes('completed')) return 'Repair Progress'
    return 'Status Updated'
  }
  if (changeType === 'Tech Note')  return 'Diagnosis Update'
  if (changeType === 'Info Update' || changeType === 'Update') return 'Info Update'
  return changeType || 'Update'
}
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

// ── Parts Manager Sub-Component ───────────────────────────────
function PartsManager({ ticketId, inventory }) {
  const [ticketParts,  setTicketParts]  = useState([])
  const [selectedPart, setSelectedPart] = useState('')
  const [qty,          setQty]          = useState(1)
  const [customerProvided, setCustomerProvided] = useState(false)
  const [adding,       setAdding]       = useState(false)
  const [removing,     setRemoving]     = useState(null)
  const [flash,        setFlash]        = useState(null)

  const loadParts = async () => {
    try {
      const res = await api.get(`/inventory/ticket/${ticketId}`)
      setTicketParts(res.data || [])
    } catch (_) {}
  }

  useEffect(() => { loadParts() }, [ticketId])

  const showFlash = (msg, type = 'success') => {
    setFlash({ msg, type })
    setTimeout(() => setFlash(null), 3000)
  }

  const handleAdd = async () => {
    if (!selectedPart) return showFlash('Please select a part.', 'error')
    if (qty < 1)       return showFlash('Quantity must be at least 1.', 'error')

    const part = inventory.find(p => String(p.part_id) === String(selectedPart))
    if (!part) return showFlash('Part not found.', 'error')
    if (!customerProvided && part.quantity < qty) {
      return showFlash(`Only ${part.quantity} unit(s) available in stock.`, 'error')
    }

    setAdding(true)
    try {
      await api.post('/inventory/ticket/attach', {
        ticket_id: ticketId,
        part_id:   part.part_id,
        quantity:  qty,
        customer_provided: customerProvided,
      })
      showFlash(customerProvided
        ? `✅ ${part.part_name} recorded (customer-provided, no stock deduction).`
        : `✅ ${part.part_name} (×${qty}) added. Inventory reduced by ${qty}.`)
      setSelectedPart('')
      setQty(1)
      await loadParts()
    } catch (err) {
      showFlash(err?.response?.data?.error || 'Failed to add part.', 'error')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (partId, partName) => {
    if (!confirm(`Remove ${partName} from this ticket? Stock will be returned.`)) return
    setRemoving(partId)
    try {
      await api.delete(`/inventory/ticket/${ticketId}/detach/${partId}`)
      showFlash(`🔄 ${partName} removed. Stock returned.`)
      await loadParts()
    } catch (err) {
      showFlash(err?.response?.data?.error || 'Failed to remove part.', 'error')
    } finally {
      setRemoving(null)
    }
  }

  // Parts already attached to this ticket
  const attachedIds = new Set(ticketParts.map(p => p.part_id))
  // Available inventory (not already used OR still in stock)
  const availableParts = inventory.filter(p => p.quantity > 0 || attachedIds.has(p.part_id))

  const partsTotal = ticketParts.reduce((sum, p) => sum + p.quantity * parseFloat(p.unit_price), 0)

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <h2>🔩 Parts Used in This Ticket</h2>
      </div>
      <div className="card-body">

        {flash && (
          <div className={`alert alert-${flash.type}`} style={{ marginBottom: 12 }}>
            {flash.msg}
          </div>
        )}

        {/* ── Add Part Row ── */}
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-end',
          padding: '14px 16px', background: 'var(--gray-50)',
          borderRadius: 8, border: '1px dashed var(--gray-300)',
          marginBottom: 16, flexWrap: 'wrap',
        }}>
          <div className="form-group" style={{ flex: 3, minWidth: 200, margin: 0 }}>
            <label style={{ fontSize: 12 }}>Select Part from Inventory</label>
            <select
              value={selectedPart}
              onChange={e => setSelectedPart(e.target.value)}
              style={{ marginTop: 4 }}
            >
              <option value="">— Choose a part —</option>
              {availableParts.map(p => (
                <option key={p.part_id} value={p.part_id} disabled={p.quantity === 0}>
                  {p.part_code} — {p.part_name} (₱{parseFloat(p.retail_price).toFixed(0)}) · {p.quantity} in stock
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ width: 80, margin: 0 }}>
            <label style={{ fontSize: 12 }}>Qty</label>
            <input
              type="number" min={1} value={qty}
              onChange={e => setQty(parseInt(e.target.value) || 1)}
              style={{ marginTop: 4 }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={customerProvided}
              onChange={e => setCustomerProvided(e.target.checked)}
            />
            Customer part
          </label>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={adding || !selectedPart}
            style={{ whiteSpace: 'nowrap', marginBottom: 0 }}
          >
            {adding ? '⏳ Adding...' : '+ Add Part'}
          </button>
        </div>

        {/* ── Parts Table ── */}
        {ticketParts.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13, fontStyle: 'italic' }}>
            No parts added yet. Use the selector above to attach parts.
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>SKU</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Part Name</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: 60 }}>Qty</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: 110 }}>Unit Price</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: 110 }}>Subtotal</th>
                  <th style={{ padding: '8px 10px', width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {ticketParts.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 12 }}>{p.part_code}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 500 }}>{p.part_name}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>{p.quantity}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>₱{parseFloat(p.unit_price).toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                      ₱{(p.quantity * parseFloat(p.unit_price)).toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemove(p.part_id, p.part_name)}
                        disabled={removing === p.part_id}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#c53030', fontSize: 16, padding: '2px 6px',
                          borderRadius: 4,
                        }}
                        title="Remove part & return to stock"
                      >
                        {removing === p.part_id ? '⏳' : '🗑️'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Parts total */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end',
              padding: '10px 10px 0', marginTop: 8,
              borderTop: '2px solid var(--gray-200)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>
                Parts Total: ₱{partsTotal.toFixed(2)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function EditTicket() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

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
      const isHome = ticket.service_type === 'Home Service'
      const rawStatus = (ticket.status && String(ticket.status).trim()) || 'Pending'
      const status = isHome ? normalizeHomeServiceStatus(rawStatus) : rawStatus
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
        service_date:        ticket.service_date ? String(ticket.service_date).slice(0, 10) : '',
        preferred_time:      ticket.preferred_time ? String(ticket.preferred_time).slice(0, 5) : '',
        diagnostic_notes:    ticket.diagnostic_notes || '',
        repair_notes:        ticket.repair_notes || '',
        additional_findings: ticket.additional_findings || '',
        assigned_tech:       ticket.assigned_tech || '',
        tech_contact:        ticket.tech_contact || '',
        tech_assigned_date:  ticket.tech_assigned_date
          ? String(ticket.tech_assigned_date).slice(0, 10)
          : '',
        estimated_cost:      ticket.estimated_cost || '',
        status,
        payment_status:      ticket.payment_status || 'Unpaid',
        completed_date:      ticket.completed_date
          ? String(ticket.completed_date).slice(0, 10)
          : '',
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
    if (form.service_type === 'Home Service' && !form.address.trim())
      return setError('Address is required for Home Service.')

    setSaving(true)
    try {
      const isHome = form.service_type === 'Home Service'
      const status = isHome
        ? normalizeHomeServiceStatus(form.status)
        : form.status

      const result = await ticketService.update(id, {
        customer_id: form.customer_id,
        customer_name: form.customer_name.trim(),
        contact_number: form.contact_number || '',
        customer_email: form.customer_email || '',
        customer_address: form.customer_address || '',
        device_id: form.device_id,
        device_type: form.device_type,
        device_brand: form.device_brand,
        imei: form.imei || '',
        passcode: form.passcode || '',
        problem_desc: form.problem_desc.trim(),
        service_type: form.service_type,
        address: form.address || '',
        preferred_schedule: form.preferred_schedule || '',
        service_date: form.service_date || null,
        preferred_time: form.preferred_time || null,
        assigned_tech: form.assigned_tech || '',
        tech_contact: form.tech_contact || '',
        tech_assigned_date: form.tech_assigned_date || null,
        diagnostic_notes: form.diagnostic_notes || '',
        repair_notes: form.repair_notes || '',
        additional_findings: form.additional_findings || '',
        estimated_cost: parseFloat(form.estimated_cost) || 0,
        status,
        payment_status: form.payment_status || 'Unpaid',
        completed_date: status === 'Completed'
          ? (form.completed_date || new Date().toISOString().slice(0, 10))
          : null,
      })
      const savedStatus = result?.status || status
      setForm(f => ({ ...f, status: savedStatus }))
      setSuccess(`Ticket updated — status: ${savedStatus}.`)
      setTimeout(() => navigate(`/tickets/view/${id}`), 1200)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to update ticket.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />
  if (!form)   return <Alert type="error">{error || 'Ticket not found.'}</Alert>

  const isHomeService = form.service_type === 'Home Service'
  const statusOptions = isHomeService ? HOME_SERVICE_STATUSES : TICKET_STATUSES
  const techFieldsEnabled = !isHomeService || canAssignHomeServiceTech(form.status)

  return (
    <>
      <div className="page-header">
        <div>
          <h1>✏️ Edit Ticket — {form.ticket_number}</h1>
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
          <ProgressStepper currentStatus={form.status} serviceType={form.service_type} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className={isHomeService ? 'hs-edit-layout' : ''}>

        {/* Customer — admin can edit full profile */}
        {isAdmin && (
        <>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>Customer Information</h2></div>
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

        {isHomeService ? (
          <div className="card">
            <div className="card-header"><h2>Address Information</h2></div>
            <div className="card-body">
              <div className="form-group full">
                <label>Service Address <span className="req">*</span></label>
                <textarea rows={2} value={form.address}
                  onChange={e => set('address', e.target.value)} />
              </div>
              <HomeServiceScheduleFields
                serviceDate={form.service_date}
                preferredTime={form.preferred_time}
                onChange={set}
              />
            </div>
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><h2>Service Type</h2></div>
            <div className="card-body">
              <div className="form-group">
                <label>Service Type</label>
                <ServiceTypeSelector value={form.service_type} onChange={v => set('service_type', v)} />
              </div>
            </div>
          </div>
        )}

        {/* Device */}
        <div className="card" style={{ marginBottom: isHomeService ? 0 : 20 }}>
          <div className="card-header"><h2>{isHomeService ? 'Device Information' : '📱 Device Details'}</h2></div>
          <div className="card-body">
            <DeviceFields form={form} onChange={set} />
          </div>
        </div>
        </>
        )}

        {/* Technician Workspace */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2>{isHomeService ? 'Technician Information' : 'Technician Workspace'}</h2>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>{isHomeService ? 'Technician Name' : 'Assigned Technician'}</label>
                <input type="text" value={form.assigned_tech}
                  disabled={isHomeService && !techFieldsEnabled}
                  onChange={e => set('assigned_tech', e.target.value)} />
              </div>
              {isHomeService && (
                <>
                  <div className="form-group">
                    <label>Contact Number</label>
                    <input type="text" value={form.tech_contact}
                      disabled={!techFieldsEnabled}
                      onChange={e => set('tech_contact', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Assigned Date</label>
                    <input type="date" value={form.tech_assigned_date}
                      disabled={!techFieldsEnabled}
                      onChange={e => set('tech_assigned_date', e.target.value)} />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Service Fee / Labor (₱)</label>
                <input type="number" min="0" step="0.01" value={form.estimated_cost}
                  onChange={e => set('estimated_cost', e.target.value)} />
              </div>
              {!isHomeService && (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>

        {isHomeService && (
          <div className="card">
            <div className="card-header"><h2>Notes / Remarks</h2></div>
            <div className="card-body">
              <div className="form-grid">
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
        )}

        <div className="card" style={{ marginBottom: isHomeService ? 0 : 20 }}>
          <div className="card-header"><h2>{isHomeService ? 'Status Update' : 'Status & Payment'}</h2></div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Ticket Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}>
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {isAdmin && (
              <div className="form-group">
                <label>Payment Status</label>
                <select value={form.payment_status} onChange={e => set('payment_status', e.target.value)}>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
              )}
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

        {/* Save */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginBottom: 20 }}>
          <button type="button" className="btn btn-secondary"
            onClick={() => navigate(`/tickets/view/${id}`)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '⏳ Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </form>

      {/* ── PARTS MANAGER (outside form so its own submit/buttons don't conflict) ── */}
      {!isHomeService && <PartsManager ticketId={id} inventory={inventory} />}

      <div className="card" style={{ marginBottom: 32 }}>
        <div className="card-header"><h2>{isHomeService ? 'Activity Logs' : 'Repair Timeline'}</h2></div>
        <div className="card-body" style={{ padding: 0 }}>
          {logs.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--gray-400)', fontStyle: 'italic' }}>
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
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                      background: style.bg,
                    }}>
                      {style.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: style.color }}>
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
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.5 }}>{notes}</p>
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
