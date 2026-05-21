// pages/dashboard/Dashboard.jsx — Repair overview & queue
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ticketService } from '../../services/ticketService'
import { statsService } from '../../services/statsService'
import { FILTER_STATUSES } from '../../constants/ticketStatus'
import StatusBadge from '../../components/status/StatusBadge'
import PaymentBadge from '../../components/status/PaymentBadge'
import Spinner from '../../components/ui/Spinner'

function StatCard({ icon, label, value, accent, to }) {
  const inner = (
    <div className={`stat-card ${to ? 'stat-card-link' : ''} ${accent || ''}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <div className="stat-value">{value ?? 0}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
  if (to) {
    return <Link to={to} className="stat-card-link-wrap">{inner}</Link>
  }
  return inner
}

export default function Dashboard() {
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true)
      const [tRes, sRes] = await Promise.all([
        ticketService.getAll().catch(() => []),
        statsService.getDashboard().catch(() => ({})),
      ])
      setTickets(Array.isArray(tRes) ? tRes : [])
      setStats(sRes || {})
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tickets
      .filter(t => t.status !== 'Cancelled')
      .filter(t => !statusFilter || t.status === statusFilter)
      .filter(t => {
        if (!q) return true
        const num = (t.ticket_number || '').toLowerCase()
        const name = (t.customer_name || '').toLowerCase()
        return num.includes(q) || name.includes(q)
      })
      .sort((a, b) => (b.ticket_id || 0) - (a.ticket_id || 0))
  }, [tickets, search, statusFilter])

  return (
    <div className="dashboard-page">
      <div className="page-header dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Active repairs at Code &amp; Locks, Tambo, Pamplona</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={fetchAll}>
          Refresh
        </button>
      </div>

      <div className="stats-grid dashboard-stats">
        <StatCard icon="✓" label="Active Repairs" value={stats.total} accent="total" to="/tickets" />
        <StatCard icon="✓" label="Pending" value={stats.pending} accent="pending" to="/tickets?status=Pending" />
        <StatCard icon="✓" label="In Progress" value={stats.approved} accent="repairing" to="/tickets" />
        <StatCard icon="✓" label="Completed" value={stats.completed} accent="completed" to="/tickets?status=Completed" />
      </div>

      <div className="card dashboard-queue-card">
        <div className="card-header dashboard-card-header">
          <h2>Repair Queue</h2>
          <div className="dashboard-filters">
            <input
              type="search"
              placeholder="Search ticket or customer…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="dashboard-search"
              aria-label="Search repairs"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="dashboard-select"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {FILTER_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="card-body dashboard-table-body">
          {loading ? (
            <Spinner message="Loading repairs…" />
          ) : filtered.length === 0 ? (
            <p className="dashboard-empty">No repairs match your filters.</p>
          ) : (
            <div className="table-wrap">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Customer</th>
                    <th>Device</th>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.ticket_id}>
                      <td>
                        <span className="ticket-number">{t.ticket_number || `CL-${t.ticket_id}`}</span>
                      </td>
                      <td className="cell-customer">{t.customer_name || '—'}</td>
                      <td>{[t.device_brand, t.device_type].filter(Boolean).join(' ') || '—'}</td>
                      <td>
                        <span className={`service-pill ${t.service_type === 'Home Service' ? 'home' : 'walkin'}`}>
                          {t.service_type === 'Home Service' ? 'Home' : 'Walk-In'}
                        </span>
                      </td>
                      <td><StatusBadge status={t.status} /></td>
                      <td><PaymentBadge status={t.payment_status} /></td>
                      <td className="cell-date">
                        {t.received_date
                          ? new Date(t.received_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                          : '—'}
                      </td>
                      <td>
                        <div className="actions">
                          <Link to={`/tickets/view/${t.ticket_id}`} className="btn btn-secondary btn-sm">View</Link>
                          <Link to={`/tickets/edit/${t.ticket_id}`} className="btn btn-primary btn-sm">Edit</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
