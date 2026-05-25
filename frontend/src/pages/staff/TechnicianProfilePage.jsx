import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useFetch } from '../../hooks/useFetch'
import { staffService } from '../../services/staffService'
import StatusBadge from '../../components/status/StatusBadge'
import Spinner from '../../components/ui/Spinner'
import Alert from '../../components/ui/Alert'

export default function TechnicianProfilePage() {
  const { user } = useAuth()
  const username = user?.username

  const { data: profile, loading, error } = useFetch(
    () => (username ? staffService.getTechnicianProfile(username) : Promise.resolve(null)),
    [username]
  )

  if (loading) return <Spinner />
  if (error) return <Alert type="error">{error}</Alert>
  if (!profile) return <Alert type="error">Profile not found.</Alert>

  const tickets = profile.assigned_tickets || []

  return (
    <>
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p className="page-subtitle">Your account details and assigned repairs.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h2>Account</h2></div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>FULL NAME</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{profile.full_name}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>USERNAME</div>
              <div style={{ fontSize: 16 }}>{profile.username}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>ROLE</div>
              <div style={{ fontSize: 16, textTransform: 'capitalize' }}>{profile.role}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>CREATED BY</div>
              <div style={{ fontSize: 16 }}>{profile.created_by || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Assigned Tickets ({tickets.length})</h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {tickets.length === 0 ? (
            <p style={{ padding: 24, color: 'var(--gray-500)', fontStyle: 'italic' }}>
              No active tickets assigned to you right now.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Customer</th>
                    <th>Device</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.ticket_id}>
                      <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>{t.ticket_number}</td>
                      <td>{t.customer_name}</td>
                      <td>{[t.device_brand, t.device_type].filter(Boolean).join(' ')}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td>
                        <Link to={`/tickets/view/${t.ticket_id}`} className="btn btn-secondary btn-sm">
                          View
                        </Link>
                        {' '}
                        <Link to={`/tickets/edit/${t.ticket_id}`} className="btn btn-primary btn-sm">
                          Edit
                        </Link>
                      </td>
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
