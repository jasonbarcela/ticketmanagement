// ============================================================
// pages/bookings/BookingPage.jsx — Repair Intake Request Form
//
// Staff-assisted simplified ticket intake (no tech assignment,
// no diagnostic notes, no part allocation at intake stage).
// On submit: creates a ticket via POST /api/bookings and
// displays the generated CL-YEAR-SEQUENCE number to the customer.
//
// Status split (enforced server-side):
//   Walk-In      → status = 'Confirmed'
//   Home Service → status = 'Pending Downpayment'
// ============================================================
import { useState }        from 'react'
import DeviceFields        from '../../components/forms/DeviceFields'
import ServiceTypeSelector from '../../components/forms/ServiceTypeSelector'
import Alert               from '../../components/ui/Alert'
import { bookingService }  from '../../services/bookingService'

const BLANK = {
  customer_name: '', contact_number: '',
  device_type: '', device_brand: '', imei: '', passcode: '',
  problem_desc: '', service_type: 'Walk-In',
  address: '', preferred_schedule: '',
}

// ── Success Receipt ───────────────────────────────────────────
function SuccessReceipt({ result, onNew }) {
  const isPendingDP = result.status === 'Pending Downpayment'

  return (
    <div style={{ maxWidth: 540, margin: '48px auto', textAlign: 'center' }}>
      <div className="card">
        <div className="card-body" style={{ padding: '40px 32px' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
          <h2 style={{ color: 'var(--navy)', marginBottom: 8 }}>Request Submitted!</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>
            Your repair request has been received. Keep your ticket number safe.
          </p>

          {/* Ticket Number */}
          <div style={{
            background: 'var(--light-blue)', border: '2px solid var(--blue)',
            borderRadius: 12, padding: '20px 24px', marginBottom: 20,
          }}>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4, fontWeight: 600 }}>
              YOUR TICKET NUMBER
            </div>
            <div style={{
              fontSize: 32, fontWeight: 900, color: 'var(--navy)',
              letterSpacing: 2, fontFamily: 'monospace',
            }}>
              {result.ticket_number || '—'}
            </div>
          </div>

          {/* Status Badge */}
          <div style={{
            display: 'inline-block', padding: '8px 16px', borderRadius: 8, marginBottom: 24,
            background: isPendingDP ? '#FEF3C7' : '#D1FAE5',
            color:      isPendingDP ? '#92400E'  : '#065F46',
            fontWeight: 700, fontSize: 14,
          }}>
            Status: {result.status}
          </div>

          {/* Context message */}
          {isPendingDP ? (
            <Alert type="info" style={{ marginBottom: 20, textAlign: 'left' }}>
              <strong>Home Service request submitted.</strong> Our staff will contact you
              to confirm the downpayment before scheduling the technician visit.
            </Alert>
          ) : (
            <Alert type="success" style={{ marginBottom: 20, textAlign: 'left' }}>
              <strong>Walk-In confirmed!</strong> Please proceed to the counter and
              present this ticket number to our staff.
            </Alert>
          )}

          <button className="btn btn-primary" onClick={onNew} style={{ marginTop: 8 }}>
            + Submit Another Request
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Form ─────────────────────────────────────────────────
export default function BookingPage() {
  const [form,       setForm]       = useState(BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
  const [result,     setResult]     = useState(null)

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')

    // Client-side validation
    if (!form.customer_name.trim()) return setError('Customer name is required.')
    if (!form.device_type)          return setError('Device type is required.')
    if (!form.problem_desc.trim())  return setError('Problem description is required.')
    if (form.service_type === 'Home Service' && !form.address.trim())
      return setError('Home address is required for Home Service requests.')

    setSubmitting(true)
    try {
      const res = await bookingService.submitIntake(form)

      // Guard: ticket_number must come back from the server
      if (!res?.ticket_number) {
        setError('Submission succeeded but no ticket number was returned. Please contact staff.')
        return
      }

      setResult(res)
    } catch (err) {
      setError(err?.response?.data?.error || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <SuccessReceipt
        result={result}
        onNew={() => { setResult(null); setForm(BLANK) }}
      />
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>📋 New Repair Request</h1>
          <p className="page-subtitle">
            Submit a new repair intake for a customer. Both Walk-In and Home Service accepted.
          </p>
        </div>
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
                  type="text" placeholder="e.g. Juan dela Cruz"
                  value={form.customer_name}
                  onChange={e => set('customer_name', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Contact Number</label>
                <input
                  type="text" placeholder="e.g. 09171234567"
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
              <p className="hint" style={{ marginTop: 8 }}>
                <strong>Walk-In</strong> — Bring device to our shop. Status goes directly to <em>Confirmed</em>.
                <br />
                <strong>Home Service</strong> — Technician dispatched to your address. Requires downpayment confirmation first.
              </p>
            </div>

            {form.service_type === 'Home Service' && (
              <div className="form-grid" style={{ marginTop: 16 }}>
                <div className="form-group full">
                  <label>Service Address <span className="req">*</span></label>
                  <textarea
                    rows={2} placeholder="Complete address for technician visit"
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Preferred Schedule</label>
                  <input
                    type="text" placeholder="e.g. Weekdays, morning preferred"
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
          <div className="card-header"><h2>📱 Device Details</h2></div>
          <div className="card-body">
            <DeviceFields form={form} onChange={set} />
          </div>
        </div>

        {/* ── Submit ────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit" className="btn btn-primary"
            disabled={submitting}
            style={{ minWidth: 180, padding: '12px 24px' }}
          >
            {submitting ? '⏳ Submitting...' : '📋 Submit Repair Request'}
          </button>
        </div>

      </form>
    </>
  )
}