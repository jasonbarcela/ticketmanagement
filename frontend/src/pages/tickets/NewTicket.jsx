// ============================================================
// pages/tickets/NewTicket.jsx — Staff-Side Ticket Creation Form
//
// Full field set: customer, device, diagnostic, part allocation.
// Split-routing: service_type drives initial status (backend).
// On success, navigates to the Tickets list with a flash message.
// ============================================================
import { useState, useEffect }   from 'react'
import { useNavigate }           from 'react-router-dom'
import { ticketService }         from '../../services/ticketService'
import { inventoryService }      from '../../services/inventoryService'
import DeviceFields              from '../../components/forms/DeviceFields'
import ServiceTypeSelector       from '../../components/forms/ServiceTypeSelector'
import Alert                     from '../../components/ui/Alert'

const BLANK = {
  customer_name: '', contact_number: '',
  device_type: '', device_brand: '', imei: '', passcode: '',
  problem_desc: '', service_type: 'Walk-In', address: '',
  preferred_schedule: '', diagnostic_notes: '', assigned_tech: '',
  estimated_cost: '', part_id: '', part_code: '', payment_status: 'Unpaid',
}

export default function NewTicket() {
  const navigate = useNavigate()
  const [form,      setForm]      = useState(BLANK)
  const [inventory, setInventory] = useState([])
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    inventoryService.getAll().then(setInventory).catch(() => {})
  }, [])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const handlePartSelect = e => {
    const partId = e.target.value
    const part   = inventory.find(p => String(p.part_id) === String(partId))
    setForm(f => ({
      ...f,
      part_id:   partId,
      part_code: part?.part_code || '',
    }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!form.customer_name.trim()) return setError('Customer name is required.')
    if (!form.problem_desc.trim())  return setError('Problem description is required.')
    if (form.service_type === 'Home Service' && !form.address.trim())
      return setError('Address is required for Home Service.')

    setSaving(true)
    try {
      const payload = {
        ...form,
        estimated_cost: parseFloat(form.estimated_cost) || 0,
        part_id:        form.part_id ? parseInt(form.part_id) : null,
      }
      const res = await ticketService.create(payload)
      navigate('/tickets', {
        state: { flash: `Ticket ${res.ticket_number} created — Status: ${res.status}` },
      })
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create ticket.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1> New Repair Ticket</h1>
          <p className="page-subtitle">Create a staff-assisted repair intake for an in-person customer.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/tickets')}>
          ← Back to Tickets
        </button>
      </div>

      {error && <Alert type="error" style={{ marginBottom: 16 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>
        {/* ── Customer ──────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>👤 Customer Information</h2></div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name <span className="req">*</span></label>
                <input
                  type="text" 
                  value={form.customer_name}
                  onChange={e => set('customer_name', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Contact Number</label>
                <input
                  type="text" 
                  value={form.contact_number}
                  onChange={e => set('contact_number', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Service Type ──────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>📋 Service Type</h2></div>
          <div className="card-body">
            <div className="form-group">
              <label>Service Type <span className="req">*</span></label>
              <ServiceTypeSelector
                value={form.service_type}
                onChange={v => set('service_type', v)}
              />
              <p className="hint">
                All new repairs start at <strong>Pending</strong> in the repair queue.
              </p>
            </div>
            {form.service_type === 'Home Service' && (
              <div className="form-grid">
                <div className="form-group full">
                  <label>Service Address <span className="req">*</span></label>
                  <textarea
                    rows={2} placeholder="Complete home address for technician dispatch"
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Preferred Schedule</label>
                  <input
                    type="text" placeholder="e.g. Weekday mornings, weekends"
                    value={form.preferred_schedule}
                    onChange={e => set('preferred_schedule', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Device ────────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2> Device Details</h2></div>
          <div className="card-body">
            <DeviceFields form={form} onChange={set} />
          </div>
        </div>

        {/* ── Technician Workspace ──────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>🔧 Technician Workspace</h2></div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group full">
                <label>Diagnostic Notes</label>
                <textarea
                  rows={3} placeholder="Initial technician assessment (optional at creation)"
                  value={form.diagnostic_notes}
                  onChange={e => set('diagnostic_notes', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Assigned Technician</label>
                <input
                  type="text" placeholder="e.g. Mark Reyes"
                  value={form.assigned_tech}
                  onChange={e => set('assigned_tech', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Estimated Cost (₱)</label>
                <input
                  type="number" placeholder="0.00" min="0" step="0.01"
                  value={form.estimated_cost}
                  onChange={e => set('estimated_cost', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Part Allocation ───────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>📦 Part Allocation</h2></div>
          <div className="card-body">
            <div className="form-group">
              <label>Link Spare Part (optional)</label>
              <select value={form.part_id} onChange={handlePartSelect}>
                <option value="">— No part allocated —</option>
                {inventory.map(p => (
                  <option key={p.part_id} value={p.part_id} disabled={p.quantity === 0}>
                    {p.part_code} | {p.part_name} — Qty: {p.quantity} @ ₱{parseFloat(p.cost_price).toFixed(2)}
                    {p.quantity === 0 ? ' [OUT OF STOCK]' : ''}
                  </option>
                ))}
              </select>
              <p className="hint">
                When the ticket is marked <strong>Completed</strong>, the linked part's stock
                is automatically decremented by 1 via a database transaction.
              </p>
            </div>

            {form.part_code && (
              <div style={{ marginTop: 8, padding: '10px 14px', background: '#FEF3C7', borderRadius: 8, border: '1px solid #F59E0B' }}>
                <strong>🔧 Allocated:</strong> {form.part_code} — {inventory.find(p => p.part_code === form.part_code)?.part_name}
              </div>
            )}
          </div>
        </div>

        {/* ── Billing ───────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>💰 Billing</h2></div>
          <div className="card-body">
            <div className="form-group" style={{ maxWidth: 220 }}>
              <label>Payment Status</label>
              <select value={form.payment_status} onChange={e => set('payment_status', e.target.value)}>
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Actions ───────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/tickets')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '⏳ Creating...' : '✅ Create Ticket'}
          </button>
        </div>
      </form>
    </>
  )
}
