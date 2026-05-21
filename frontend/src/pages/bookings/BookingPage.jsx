// ============================================================
// pages/bookings/BookingPage.jsx — Repair Intake Form
//
// Staff-assisted repair intake.
// Supports Walk-In and Home Service.
// Includes "Customer Provided Parts" option — marks the booking
// so parts stock is NOT deducted when customer brings their own.
// Labor/service fee is tracked separately from parts price.
//
// Status split (enforced server-side):
//   Walk-In      → status = 'Confirmed'
//   Home Service → status = 'Pending Downpayment'
// ============================================================
import { useState }        from 'react'
import DeviceFields        from '../../components/forms/DeviceFields'
import ServiceTypeSelector from '../../components/forms/ServiceTypeSelector'
import HomeServiceScheduleFields from '../../components/forms/HomeServiceScheduleFields'
import Alert               from '../../components/ui/Alert'
import { bookingService }  from '../../services/bookingService'
import ReceiptModal        from '../../components/modals/ReceiptModal'

const BLANK = {
  customer_name: '', contact_number: '', customer_email: '',
  device_type: '', device_brand: '', imei: '', passcode: '',
  problem_desc: '', service_type: 'Walk-In',
  address: '', service_date: '', preferred_time: '',
  downpayment_method: '', downpayment_note: '',
  customer_provided_parts: false,
  service_fee: '',
}

const PAYMENT_METHODS = ['GCash', 'PayMaya', 'Bank Transfer', 'Cash on Arrival']

// ── Success Receipt ───────────────────────────────────────────
function SuccessReceipt({ result, onNew }) {
  const isPendingDP  = result.status === 'Pending'
  const [showTicket, setShowTicket] = useState(false)

  return (
    <div style={{ maxWidth: 540, margin: '48px auto', textAlign: 'center' }}>
      {showTicket && result.ticket_id && (
        <ReceiptModal ticketId={result.ticket_id} onClose={() => setShowTicket(false)} />
      )}
      <div className="card">
        <div className="card-body" style={{ padding: '40px 32px' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
          <h2 style={{ color: 'var(--navy)', marginBottom: 8 }}>Request Submitted!</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>
            Repair request received. Keep the ticket number safe.
          </p>

          <div style={{
            background: 'var(--light-blue)', border: '2px solid var(--blue)',
            borderRadius: 12, padding: '20px 24px', marginBottom: 20,
          }}>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4, fontWeight: 600 }}>
              TICKET NUMBER
            </div>
            <div style={{
              fontSize: 32, fontWeight: 900, color: 'var(--navy)',
              letterSpacing: 2, fontFamily: 'monospace',
            }}>
              {result.ticket_number || '—'}
            </div>
          </div>

          <div style={{
            display: 'inline-block', padding: '8px 16px', borderRadius: 8, marginBottom: 24,
            background: isPendingDP ? '#FEF3C7' : '#D1FAE5',
            color:      isPendingDP ? '#92400E'  : '#065F46',
            fontWeight: 700, fontSize: 14,
          }}>
            Status: {result.status}
          </div>

          {isPendingDP ? (
            <Alert type="info" style={{ marginBottom: 20, textAlign: 'left' }}>
              <strong>Home Service submitted.</strong> Staff will contact the customer
              to confirm downpayment before scheduling.
            </Alert>
          ) : (
            <Alert type="success" style={{ marginBottom: 20, textAlign: 'left' }}>
              <strong>Walk-In confirmed!</strong> Ask the customer to present this
              ticket number at the counter.
            </Alert>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            {result.ticket_id && (
              <button className="btn btn-secondary" onClick={() => setShowTicket(true)}>
                🖨️ Print Ticket
              </button>
            )}
            <button className="btn btn-primary" onClick={onNew}>
              + New Request
            </button>
          </div>
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

    if (!form.customer_name.trim())  return setError('Customer name is required.')
    if (!form.contact_number.trim()) return setError('Contact number is required.')
    if (!form.device_type)           return setError('Device type is required.')
    if (!form.problem_desc.trim())   return setError('Problem description is required.')
    if (form.service_type === 'Home Service' && !form.address.trim())
      return setError('Home address is required for Home Service.')

    setSubmitting(true)
    try {
      const res = await bookingService.submitIntake({
        ...form,
        service_fee: parseFloat(form.service_fee) || 0,
      })
      if (!res?.ticket_number) {
        setError('Submission succeeded but no ticket number returned. Please contact staff.')
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
    return <SuccessReceipt result={result} onNew={() => { setResult(null); setForm(BLANK) }} />
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1> New Repair Request</h1>
          <p className="page-subtitle">
            Submit a repair intake for a customer — Walk-In or Home Service.
          </p>
        </div>
      </div>

      {error && <Alert type="error" style={{ marginBottom: 16 }}>{error}</Alert>}

      <form onSubmit={handleSubmit}>

        {/* ── Customer Info ─────────────────────────────────── */}
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
                <label>Contact Number <span className="req">*</span></label>
                <input                  
                  value={form.contact_number}
                  onChange={e => set('contact_number', e.target.value)}
                />
              </div>
              <div className="form-group full">
                <label>Email Address <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}></span></label>
                <input
                  value={form.customer_email}
                  onChange={e => set('customer_email', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Device Details ────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2> Device Details</h2></div>
          <div className="card-body">
            <DeviceFields form={form} onChange={set} />
          </div>
        </div>

        {/* ── Parts & Fees ──────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>🔧 Parts & Service Fee</h2></div>
          <div className="card-body">

            {/* Customer Provided Parts toggle */}
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: '16px 18px', borderRadius: 10,
              background: form.customer_provided_parts ? '#EFF6FF' : '#F9FAFB',
              border: `2px solid ${form.customer_provided_parts ? 'var(--blue)' : 'var(--gray-200)'}`,
              marginBottom: 20, cursor: 'pointer',
            }}
              onClick={() => set('customer_provided_parts', !form.customer_provided_parts)}
            >
              <input
                type="checkbox"
                checked={form.customer_provided_parts}
                onChange={e => set('customer_provided_parts', e.target.checked)}
                onClick={e => e.stopPropagation()}
                style={{ marginTop: 2, width: 18, height: 18, cursor: 'pointer', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontWeight: 700, color: form.customer_provided_parts ? 'var(--blue)' : 'var(--navy)', fontSize: 14 }}>
                  Customer Provided Parts
                </div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 3 }}>
                  Check this if the customer is bringing their own replacement part.
                  <strong> Shop inventory will NOT be deducted.</strong> Only the service/labor
                  fee will apply.
                </div>
              </div>
            </div>

            {form.customer_provided_parts && (
              <Alert type="info" style={{ marginBottom: 16 }}>
                 <strong>Customer-provided parts mode on.</strong> Parts used during this repair
                will be marked as customer-supplied and will not deduct from shop stock.
                Set the labor/service fee below.
              </Alert>
            )}

            {/* Service / Labor Fee */}
            <div className="form-group" style={{ maxWidth: 240 }}>
              <label>
                {form.customer_provided_parts
                  ? 'Labor / Service Fee (₱)'
                  : 'Quoted Service Fee (₱)'}
                <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}></span>
              </label>
              <input
                type="number" min="0" step="0.01"
                placeholder="0.00"
                value={form.service_fee}
                onChange={e => set('service_fee', e.target.value)}
              />
              <p className="hint" style={{ marginTop: 6 }}>
                {form.customer_provided_parts
                  ? 'This is the labor-only charge. Parts cost borne by the customer.'
                  : 'Parts prices are tracked in inventory. This fee is added separately.'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Service Type ──────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2> Service Type</h2></div>
          <div className="card-body">
            <div className="form-group">
              <label>Service Type <span className="req">*</span></label>
              <ServiceTypeSelector
                value={form.service_type}
                onChange={v => set('service_type', v)}
              />
              <p className="hint" style={{ marginTop: 8 }}>
                <strong>Walk-In</strong> — Customer drops device at the shop. Status → <em>Confirmed</em>.<br />
                <strong>Home Service</strong> — Technician goes to the customer. Requires downpayment first.
              </p>
            </div>

            {form.service_type === 'Home Service' && (
              <>
                <div className="form-grid" style={{ marginTop: 16 }}>
                  <div className="form-group full">
                    <label>Service Address <span className="req">*</span></label>
                    <textarea
                      rows={2} placeholder="Complete address for technician visit"
                      value={form.address}
                      onChange={e => set('address', e.target.value)}
                    />
                  </div>
                </div>
                <HomeServiceScheduleFields
                  serviceDate={form.service_date}
                  preferredTime={form.preferred_time}
                  onChange={set}
                />

                {/* Downpayment Section */}
                <div style={{
                  marginTop: 20, padding: '18px 20px', borderRadius: 8,
                  background: '#FEF3C7', border: '1px solid #F59E0B',
                }}>
                  <div style={{ fontWeight: 700, color: '#92400E', marginBottom: 10, fontSize: 14 }}>
                    💳 Downpayment Required for Home Service
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label style={{ color: '#92400E' }}>Preferred Payment Method</label>
                      <select
                        value={form.downpayment_method}
                        onChange={e => set('downpayment_method', e.target.value)}
                        style={{ borderColor: '#F59E0B' }}
                      >
                        <option value="">— Select a method —</option>
                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label style={{ color: '#92400E' }}>Payment Note (optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. GCash name or reference number"
                        value={form.downpayment_note}
                        onChange={e => set('downpayment_note', e.target.value)}
                        style={{ borderColor: '#F59E0B' }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Problem Description ───────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>🛠️ Problem Description</h2></div>
          <div className="card-body">
            <div className="form-group">
              <label>Describe the Issue <span className="req">*</span></label>
              <textarea
                rows={3} placeholder="Describe the issue the customer is experiencing..."
                value={form.problem_desc}
                onChange={e => set('problem_desc', e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* ── Submit ────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit" className="btn btn-primary"
            disabled={submitting}
            style={{ minWidth: 200, padding: '12px 24px' }}
          >
            {submitting ? '⏳ Submitting...' : ' Submit Repair Request'}
          </button>
        </div>

      </form>
    </>
  )
}