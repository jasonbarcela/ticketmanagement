// ============================================================
// pages/bookings/BookingsListPage.jsx — Admin Review Control Dashboard
//
// Displays all remote pre-ticket intake requests. Fully integrated
// with the backend atomic status transition framework allowing 
// administrators to approve/convert or cancel raw registrations.
// ============================================================
import { useState, useEffect } from 'react';
import axios from 'axios';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';

export default function BookingsListPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Pending');
  const [processingId, setProcessingId] = useState(null);
  const [flash, setFlash] = useState(null);

  // Additional prompt state fields for the panel approval modal simulation
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [assignedTech, setAssignedTech] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/bookings?status=${activeTab}`);
      setBookings(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to populate intake bookings directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [activeTab]);

  const openApprovalWizard = (booking) => {
    setSelectedBooking(booking);
    setAssignedTech('');
    setEstimatedCost('');
    setShowApproveModal(true);
  };

  const handleApproveExecution = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;

    setProcessingId(selectedBooking.booking_id);
    setShowApproveModal(false);
    setFlash(null);

    try {
      const res = await axios.put(`/api/bookings/${selectedBooking.booking_id}/approve`, {
        assigned_tech: assignedTech,
        estimated_cost: parseFloat(estimatedCost) || 0
      });

      setFlash({
        msg: res.data.message || `Successfully generated live ticket ${res.data.ticket_number}!`,
        type: 'success'
      });
      loadBookings();
    } catch (err) {
      setFlash({
        msg: err?.response?.data?.error || 'Operational failure mapping conversion records.',
        type: 'error'
      });
    } finally {
      setProcessingId(null);
      setSelectedBooking(null);
    }
  };

  const handleCancelExecution = async (bookingId) => {
    if (!window.confirm('Are you completely sure you want to mark this incoming request as Cancelled?')) return;
    
    setProcessingId(bookingId);
    setFlash(null);
    try {
      const res = await axios.put(`/api/bookings/${bookingId}/cancel`);
      setFlash({ msg: res.data.message || 'Intake request rejected successfully.', type: 'success' });
      loadBookings();
    } catch (err) {
      setFlash({
        msg: err?.response?.data?.error || 'Could not transition requested booking state flags.',
        type: 'error'
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      {/* ── Page Title Ribbon ────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0 }}>Bookings Intake Registry</h1>
          <p className="page-subtitle">Review, validate, and convert remote user entries into active engineering rows.</p>
        </div>
      </div>

      {flash && <Alert type={flash.type} style={{ marginBottom: 16 }}>{flash.msg}</Alert>}

      {/* ── Status Categorization Filter Tab Header ─────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, borderBottom: '2px solid var(--gray-200)', paddingBottom: 0 }}>
        {['Pending', 'Approved', 'Cancelled'].map((tab) => (
          <button
            key={tab}
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
              marginBottom: '-2px'
            }}
          >
            {tab} Requests
          </button>
        ))}
      </div>

      {/* ── Dynamic Main Table Matrix ────────────────────────── */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 40 }}><Spinner /></div>
          ) : error ? (
            <div style={{ padding: 20 }}><Alert type="error">{error}</Alert></div>
          ) : bookings.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', fontStyle: 'italic' }}>
              No current incoming intakes grouped under the "{activeTab}" status bracket filter.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)' }}>
                  <th style={{ padding: 12 }}>Logged At</th>
                  <th style={{ padding: 12 }}>Customer Info</th>
                  <th style={{ padding: 12 }}>Hardware Asset</th>
                  <th style={{ padding: 12 }}>Problem Scope</th>
                  <th style={{ padding: 12 }}>Service Mode</th>
                  {activeTab === 'Pending' && <th style={{ padding: 12, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.booking_id} style={{ borderBottom: '1px solid var(--gray-100)', verticalAlign: 'top' }}>
                    <td style={{ padding: 12, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                      {new Date(b.created_at).toLocaleDateString('en-PH')}
                    </td>
                    <td style={{ padding: 12 }}>
                      <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{b.customer_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>📞 {b.contact_number || 'No link'}</div>
                      {b.address && <div style={{ fontSize: 11, color: 'var(--gray-400)', maxWidth: 200 }}>📍 {b.address}</div>}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{ background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4, fontWeight: 500 }}>
                        {b.device_brand || 'Generic'} {b.device_type || 'Device'}
                      </span>
                    </td>
                    <td style={{ padding: 12, color: 'var(--gray-600)', maxWidth: 260 }}>
                      {b.problem_desc}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: b.service_type === 'Home Service' ? 'purple' : 'var(--blue)' }}>
                        {b.service_type}
                      </span>
                      {b.preferred_schedule && <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>🗓️ {b.preferred_schedule}</div>}
                    </td>
                    {activeTab === 'Pending' && (
                      <td style={{ padding: 12, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: 12, marginRight: 6 }}
                          onClick={() => openApprovalWizard(b)}
                          disabled={processingId !== null}
                        >
                          {processingId === b.booking_id ? '⏳' : '✅ Approve'}
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: 12, color: 'red', border: '1px solid #feb2b2' }}
                          onClick={() => handleCancelExecution(b.booking_id)}
                          disabled={processingId !== null}
                        >
                          Cancel
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Transactional Approval Parameter Wizard Modal ─────── */}
      {showApproveModal && selectedBooking && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="card" style={{ width: 420, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <div className="card-header">
              <h2>Confirm Booking Conversion</h2>
            </div>
            <form onSubmit={handleApproveExecution}>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-600)' }}>
                  Converting intake request for <strong>{selectedBooking.customer_name}</strong>. Assign basic starting metrics below:
                </p>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>ASSIGN LEAD TECHNICIAN</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Lead Tech Alex"
                    value={assignedTech}
                    onChange={(e) => setAssignedTech(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>ESTIMATED SERVICE / LABOR COST (₱)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                  />
                </div>
              </div>
              <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--gray-50)', padding: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowApproveModal(false)}>Discard</button>
                <button type="submit" className="btn btn-primary">Generate Repair Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}