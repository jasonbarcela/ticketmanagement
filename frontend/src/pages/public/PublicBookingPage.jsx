// pages/public/PublicBookingPage.jsx — Public repair intake with home service downpayment
import gcashQr from './images/gcashqr.jpeg'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/axios'
import {
  HOME_SERVICE_DOWNPAYMENT,
  GCASH_ACCOUNT_NAME,
  GCASH_MOBILE,
} from '../../constants/homeService'
import HomeServiceScheduleFields from '../../components/forms/HomeServiceScheduleFields'

const BLANK = {
  customer_name: '',
  contact_number: '',
  customer_email: '',
  device_type: '',
  device_brand: '',
  problem_desc: '',
  home_service: false,
  address: '',
  service_date: '',
  preferred_time: '',
  downpayment_reference: '',
}

function PublicShell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-100)' }}>
      <header style={{
        background: 'var(--navy)', padding: '0 32px', height: 56,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: 'var(--shadow-md)',
      }}>
        <Link to="/home" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <span style={{ fontSize: 20 }}>🔧</span>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 15, letterSpacing: 0.5 }}>
            CODE <span style={{ color: '#60A5FA' }}>&amp;</span> LOCKS
          </span>
        </Link>
        <nav className="public-subnav">
          <Link to="/home">Home</Link>
          <Link to="/book-online" className="active">Book Repair</Link>
          <Link to="/track">Repair Tracking</Link>
        </nav>
      </header>
      <main style={{ maxWidth: 780, margin: '0 auto', padding: '36px 24px 60px' }}>
        {children}
      </main>
    </div>
  )
}

function GcashQrPlaceholder() {
  return (
    <div style={{
      width: 180,
      margin: '0 auto 16px',
      textAlign: 'center',
    }}>
      <img
        src={gcashQr}
        alt="GCash QR Code"
        style={{
          width: '100%',
          borderRadius: 12,
          border: '2px solid #CBD5E1',
          background: '#fff',
          padding: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      />

      <div style={{
        marginTop: 8,
        fontSize: 12,
        color: '#64748b',
      }}>
        Scan to pay via GCash
      </div>
    </div>
  )
}

function SuccessReceipt({ result, onNew }) {
  const pending = result.status === 'Pending' && (result.service_type === 'Home Service' || result.home_service)
  return (
    <div style={{ maxWidth: 540, margin: '0 auto', textAlign: 'center' }}>
      <div className="card">
        <div className="card-body" style={{ padding: '40px 32px' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
          <h2 style={{ color: 'var(--navy)', marginBottom: 8 }}>Request Submitted!</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>
            Save your ticket number.
            {pending && ' Your request is pending admin review. You can track status online.'}
          </p>
          <div style={{
            background: 'var(--light-blue)', border: '2px solid var(--blue)',
            borderRadius: 12, padding: '20px 24px', marginBottom: 20,
          }}>
            <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 4, fontWeight: 700 }}>
              TICKET NUMBER
            </div>
            <div style={{
              fontSize: 36, fontWeight: 900, color: 'var(--navy)',
              fontFamily: 'monospace', letterSpacing: 2,
            }}>
              {result.ticket_number}
            </div>
          </div>
          <div style={{
            display: 'inline-block', padding: '8px 20px', borderRadius: 8, marginBottom: 20,
            background: pending ? '#FEF3C7' : '#D1FAE5',
            color: pending ? '#92400E' : '#065F46',
            fontWeight: 700, fontSize: 13,
          }}>
            Status: {result.status}
          </div>
          {pending && (
            <div className="alert alert-info" style={{ marginBottom: 20, textAlign: 'left' }}>
              <strong>Pending downpayment verification.</strong> We will verify your GCash payment of{' '}
              <strong>₱{HOME_SERVICE_DOWNPAYMENT.toFixed(2)}</strong> using reference{' '}
              <strong>{result.downpayment_reference}</strong>.
            </div>
          )}
          {!pending && (
            <div className="alert alert-success" style={{ marginBottom: 20, textAlign: 'left' }}>
              <strong>Walk-in confirmed!</strong> Visit the shop with your ticket number.
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={`/track?q=${result.ticket_number}`} className="btn btn-primary">🔍 Track Ticket</Link>
            <button type="button" className="btn btn-secondary" onClick={onNew}>+ New Request</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PublicBookingPage() {
  const [form, setForm] = useState(BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const toggleHomeService = (checked) => {
    setForm(f => ({
      ...f,
      home_service: checked,
      downpayment_reference: checked ? f.downpayment_reference : '',
      address: checked ? f.address : '',
    }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!form.customer_name.trim()) return setError('Customer name is required.')
    if (!form.contact_number.trim()) return setError('Contact number is required.')
    if (!form.device_type.trim()) return setError('Device type is required.')
    if (!form.device_brand.trim()) return setError('Device brand/model is required.')
    if (!form.problem_desc.trim()) return setError('Please describe the issue.')
    if (form.home_service) {
      if (!form.address.trim()) return setError('Home address is required for home service.')
      if (!form.service_date) return setError('Assigned date is required for home service.')
      if (!form.preferred_time) return setError('Preferred time is required for home service.')
      if (!form.downpayment_reference.trim()) {
        return setError('GCash payment reference number is required.')
      }
    }

    setSubmitting(true)
    try {
      const res = await api.post('/bookings', {
        customer_name: form.customer_name.trim(),
        contact_number: form.contact_number.trim(),
        email: form.customer_email.trim() || undefined,
        device_type: form.device_type.trim(),
        device_brand: form.device_brand.trim(),
        problem_desc: form.problem_desc.trim(),
        home_service: form.home_service,
        service_type: form.home_service ? 'Home Service' : 'Walk-In',
        address: form.home_service ? form.address.trim() : undefined,
        service_date: form.home_service ? form.service_date : undefined,
        preferred_time: form.home_service ? form.preferred_time : undefined,
        downpayment_reference: form.home_service ? form.downpayment_reference.trim() : undefined,
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
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.7rem', marginBottom: 6 }}>Book a Repair</h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
          Walk-in or home service. Home visits require a GCash downpayment (manual verification).
        </p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>⚠️ {error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2>👤 Your Information</h2></div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Full Name <span className="req">*</span></label>
                <input type="text" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Contact Number <span className="req">*</span></label>
                <input type="text" placeholder="09XXXXXXXXX" value={form.contact_number}
                  onChange={e => set('contact_number', e.target.value)} />
              </div>
              <div className="form-group full">
                <label>Email <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}></span></label>
                <input type="email" value={form.customer_email} onChange={e => set('customer_email', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2> Device</h2></div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Device Type <span className="req">*</span></label>
                <input type="text" value={form.device_type}
                  onChange={e => set('device_type', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Brand / Model <span className="req">*</span></label>
                <input type="text" placeholder="e.g. iPhone 11" value={form.device_brand}
                  onChange={e => set('device_brand', e.target.value)} />
              </div>
              <div className="form-group full">
                <label>Issue / Problem <span className="req">*</span></label>
                <textarea rows={3} placeholder="Describe the problem..."
                  value={form.problem_desc} onChange={e => set('problem_desc', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h2> Service Option</h2></div>
          <div className="card-body">
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer',
              padding: '14px 16px', borderRadius: 8,
              border: `2px solid ${form.home_service ? 'var(--blue)' : 'var(--gray-200)'}`,
              background: form.home_service ? 'var(--light-blue)' : '#fff',
            }}>
              <input
                type="checkbox"
                checked={form.home_service}
                onChange={e => toggleHomeService(e.target.checked)}
                style={{ marginTop: 3, width: 18, height: 18 }}
              />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--navy)' }}>Home Service</div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
                  Technician visits your location. Requires <strong>₱{HOME_SERVICE_DOWNPAYMENT.toFixed(2)}</strong> GCash
                  downpayment before scheduling.
                </div>
              </div>
            </label>

            {!form.home_service && (
              <p className="hint" style={{ marginTop: 12 }}>
                Default: <strong>Walk-In</strong> — bring your device to the shop (no downpayment).
              </p>
            )}

            {form.home_service && (
              <div style={{ marginTop: 20 }}>
                <div className="alert alert-info" style={{ marginBottom: 16, textAlign: 'left' }}>
                  <strong>Downpayment notice.</strong> Pay via GCash first. Our staff will manually verify your
                  reference number — we do not use automatic payment verification.
                </div>

                <div style={{
                  padding: '18px', borderRadius: 8, background: '#F0FDF4',
                  border: '1px solid #86EFAC', marginBottom: 16, textAlign: 'center',
                }}>
                  <div style={{ fontWeight: 700, color: '#166534', marginBottom: 12 }}> GCash Payment Instructions</div>
                  <GcashQrPlaceholder />
                  <div style={{ fontSize: 14, color: '#14532d', lineHeight: 1.7 }}>
                    <div>Amount: <strong>₱{HOME_SERVICE_DOWNPAYMENT.toFixed(2)}</strong></div>
                    <div>Account name: <strong>{GCASH_ACCOUNT_NAME}</strong></div>
                    <div>Mobile: <strong>{GCASH_MOBILE}</strong></div>
                  </div>
                </div>

                <div className="form-group full" style={{ marginBottom: 16 }}>
                  <label>GCash Reference Number <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="Reference from your GCash receipt"
                    value={form.downpayment_reference}
                    onChange={e => set('downpayment_reference', e.target.value)}
                    style={{ borderColor: '#F59E0B' }}
                  />
                </div>

                <div className="form-group full">
                  <label>Home Address <span className="req">*</span></label>
                  <textarea rows={2} value={form.address} onChange={e => set('address', e.target.value)} />
                </div>
                <HomeServiceScheduleFields
                  serviceDate={form.service_date}
                  preferredTime={form.preferred_time}
                  onChange={set}
                  required
                />
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ minWidth: 220 }}>
            {submitting ? '⏳ Submitting…' : ' Submit Request'}
          </button>
        </div>
      </form>
    </PublicShell>
  )
}
