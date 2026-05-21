// ============================================================
// pages/customers/CustomerProfile.jsx — Unified Client History
// ============================================================
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Spinner from '../../components/ui/Spinner';
import Alert from '../../components/ui/Alert';
import StatusBadge from '../../components/status/StatusBadge';
import PaymentBadge from '../../components/status/PaymentBadge';

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchCustomerData() {
      try {
        const res = await axios.get(`/api/customers/${id}/profile`);
        setProfile(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Could not fetch customer history.');
      } finally {
        setLoading(false);
      }
    }
    fetchCustomerData();
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <Alert type="error">{error}</Alert>;
  if (!profile) return <Alert type="error">Profile index missing.</Alert>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0 }}>{profile.full_name}</h1>
          <p className="page-subtitle">Customer Account File ID: #{profile.customer_id}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        {/* Contact Metadata Block */}
        <div className="card" style={{ height: 'fit-content' }}>
          <div className="card-header"><h2> Profile Information</h2></div>
          <div className="card-body" style={{ fontSize: 14 }}>
            <div style={{ marginBottom: 12 }}>
              <strong>Phone Line:</strong> <span style={{ color: 'var(--navy)' }}>{profile.phone || '—'}</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>Email Address:</strong> <span>{profile.email || '—'}</span>
            </div>
            <div>
              <strong>Primary Home Address:</strong>
              <p style={{ margin: '4px 0 0 0', color: 'var(--gray-600)' }}>{profile.address || 'No recorded address context.'}</p>
            </div>
          </div>
        </div>

        {/* Dynamic Chronological Repair Records Tab */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Registered Assets Subset */}
          <div className="card">
            <div className="card-header"><h2> Linked Hardware Devices ({profile.devices.length})</h2></div>
            <div className="card-body">
              {profile.devices.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: 'var(--gray-400)' }}>No hardware models mapped to this client entry.</p>
              ) : (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {profile.devices.map((dev, idx) => (
                    <div key={idx} style={{ padding: '8px 12px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 4, fontSize: 13 }}>
                      <strong>{dev.brand}</strong> — {dev.device_type} {dev.imei ? `(IMEI: ${dev.imei})` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Unified Historical Timeline Grid */}
          <div className="card">
            <div className="card-header"><h2>📜 System Tickets Lifespan Ledger ({profile.tickets.length})</h2></div>
            <div className="card-body">
              {profile.tickets.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: 'var(--gray-400)' }}>No repair histories logged for this customer account card.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--gray-50)', borderBottom: '2px solid var(--gray-200)', textAlign: 'left' }}>
                      <th style={{ padding: 10 }}>Ticket No.</th>
                      <th style={{ padding: 10 }}>Device Model</th>
                      <th style={{ padding: 10 }}>Problem Summary</th>
                      <th style={{ padding: 10 }}>Workflow Status</th>
                      <th style={{ padding: 10 }}>Finances</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.tickets.map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                        <td style={{ padding: 10 }}>
                          <Link to={`/tickets/view/${t.ticket_id}`} style={{ fontWeight: 600, color: 'var(--blue)', textDecoration: 'none' }}>
                            {t.ticket_number}
                          </Link>
                        </td>
                        <td style={{ padding: 10 }}>{t.brand} {t.device_type}</td>
                        <td style={{ padding: 10, color: 'var(--gray-600)' }}>{t.problem_desc}</td>
                        <td style={{ padding: 10 }}><StatusBadge status={t.status} /></td>
                        <td style={{ padding: 10 }}><PaymentBadge status={t.payment_status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}