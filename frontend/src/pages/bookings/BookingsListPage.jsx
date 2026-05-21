// pages/bookings/BookingsListPage.jsx — Home service booking review
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '../../components/ui/Spinner'
import Alert from '../../components/ui/Alert'
import { bookingService } from '../../services/bookingService'

export default function BookingsListPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('Pending')
  const [processingId, setProcessingId] = useState(null)
  const [flash, setFlash] = useState(null)

  const loadBookings = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await bookingService.getAll(activeTab)
      const rows = (data || []).filter(b => b.service_type === 'Home Service')
      setBookings(rows)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load bookings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [activeTab])

  const handleApprove = async (booking) => {
    if (!window.confirm(`Approve home service request for ${booking.customer_name}?`)) return
    setProcessingId(booking.booking_id)
    setFlash(null)
    try {
      const res = await bookingService.approve(booking.booking_id)
      setFlash({
        msg: res.message || 'Booking approved.',
        type: 'success',
      })
      loadBookings()
    } catch (err) {
      setFlash({
        msg: err?.response?.data?.error || 'Could not approve booking.',
        type: 'error',
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Cancel this home service request?')) return
    setProcessingId(bookingId)
    setFlash(null)
    try {
      const res = await bookingService.cancel(bookingId)
      setFlash({ msg: res.message || 'Booking cancelled.', type: 'success' })
      loadBookings()
    } catch (err) {
      setFlash({
        msg: err?.response?.data?.error || 'Could not cancel booking.',
        type: 'error',
      })
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0 }}>Home Service Bookings</h1>
          <p className="page-subtitle">
            Review requests (Pending → Approved). Assign technicians in Edit Ticket after approval.
          </p>
        </div>
      </div>

      {flash && <Alert type={flash.type} style={{ marginBottom: 16 }}>{flash.msg}</Alert>}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, borderBottom: '2px solid var(--gray-200)' }}>
        {['Pending', 'Approved', 'Cancelled'].map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              color: activeTab === tab ? 'var(--blue)' : 'var(--gray-500)',
              borderBottom: activeTab === tab ? '3px solid var(--blue)' : '3px solid transparent',
              marginBottom: '-2px',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40 }}><Spinner /></div>
          ) : error ? (
            <div style={{ padding: 20 }}><Alert type="error">{error}</Alert></div>
          ) : bookings.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', fontStyle: 'italic' }}>
              No {activeTab.toLowerCase()} home service requests.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Device</th>
                    <th>Problem</th>
                    <th>Ticket</th>
                    {activeTab === 'Pending' && <th style={{ textAlign: 'right' }}>Actions</th>}
                    {activeTab === 'Approved' && <th>Next step</th>}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.booking_id}>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--gray-500)', fontSize: 12 }}>
                        {new Date(b.created_at).toLocaleDateString('en-PH')}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.customer_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{b.contact_number}</div>
                        {b.address && (
                          <div style={{ fontSize: 11, color: 'var(--gray-400)', maxWidth: 200 }}>{b.address}</div>
                        )}
                      </td>
                      <td>{b.device_brand} {b.device_type}</td>
                      <td style={{ maxWidth: 220, color: 'var(--gray-600)' }}>{b.problem_desc}</td>
                      <td>
                        {b.ticket_id ? (
                          <Link to={`/tickets/view/${b.ticket_id}`} className="ticket-number">
                            {b.ticket_number || `CL-${b.ticket_id}`}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      {activeTab === 'Pending' && (
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{ marginRight: 6 }}
                            onClick={() => handleApprove(b)}
                            disabled={processingId !== null}
                          >
                            {processingId === b.booking_id ? '…' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#c53030' }}
                            onClick={() => handleCancel(b.booking_id)}
                            disabled={processingId !== null}
                          >
                            Cancel
                          </button>
                        </td>
                      )}
                      {activeTab === 'Approved' && (
                        <td>
                          {b.ticket_id && (
                            <Link to={`/tickets/edit/${b.ticket_id}`} className="btn btn-primary btn-sm">
                              Edit ticket
                            </Link>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
