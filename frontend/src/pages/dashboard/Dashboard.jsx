// ============================================================
// pages/dashboard/Dashboard.jsx — Fixed & Stable Version
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { ticketService } from '../../services/ticketService'
import { statsService } from '../../services/statsService'
import { inventoryService } from '../../services/inventoryService'
import Spinner from '../../components/ui/Spinner'
import Alert from '../../components/ui/Alert'

// Column Definitions
const COLUMNS = [
  { key: 'Pending',          label: 'Pending Review',  icon: '📥', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
  { key: 'Diagnostic',       label: 'Diagnosing',      icon: '🔍', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  { key: 'In Progress',      label: 'Repairing',       icon: '🔧', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  { key: 'Ready for Pickup', label: 'Ready for Pick',  icon: '📦', color: '#2563EB', bg: '#F0FDF4', border: '#BBF7D0' },
  { key: 'Completed',        label: 'Completed / Closed', icon: '🏁', color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },
]

const NEXT_STATUS = {
  'Pending': 'Diagnostic',
  'Diagnostic': 'In Progress',
  'In Progress': 'Ready for Pickup',
  'Ready for Pickup': 'Completed',
  'Completed': null,
}

// ── Ticket Card Component ─────────────────────────────────────
function TicketCard({ ticket, inventory = [], onAdvance, advancing }) {
  if (!ticket) return null

  const nextStatus = NEXT_STATUS[ticket.status]
  const isAdvancing = advancing === ticket.ticket_id

  const allocatedPart = Array.isArray(inventory) 
    ? inventory.find(p => String(p.part_id) === String(ticket.part_id))
    : null

  const renderCost = () => {
    const cost = parseFloat(ticket.estimated_cost)
    return isNaN(cost) ? '0.00' : cost.toFixed(2)
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      border: '1px solid var(--gray-200)', padding: '12px 14px', marginBottom: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--blue)', background: '#EFF6FF', padding: '2px 7px', borderRadius: 4 }}>
          {ticket.ticket_number || `CL-${ticket.ticket_id}`}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          background: ticket.service_type === 'Walk-In' ? '#E5E7EB' : '#EDE9FE',
          color: ticket.service_type === 'Walk-In' ? '#374151' : '#5B21B6',
        }}>
          {ticket.service_type === 'Walk-In' ? '🏪 Walk-In' : '🏠 Service'}
        </span>
      </div>

      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy)', marginBottom: 2 }}>
        {ticket.customer_name || 'Unknown Customer'}
      </div>

      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 6 }}>
        📱 {ticket.device_brand || ''} {ticket.device_type || 'Device'}
      </div>

      {(ticket.imei || ticket.passcode) && (
        <div style={{ background: '#F8FAFC', border: '1px solid var(--gray-200)', borderRadius: 6, padding: '6px 10px', fontSize: 11, marginBottom: 6 }}>
          {ticket.imei && <div><strong>IMEI:</strong> {ticket.imei}</div>}
          {ticket.passcode && <div><strong>Passcode:</strong> {ticket.passcode}</div>}
        </div>
      )}

      <div style={{
        fontSize: 12, color: 'var(--gray-500)', marginBottom: 8,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {ticket.problem_desc || 'No description provided.'}
      </div>

      {allocatedPart && (
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 6, padding: '6px 10px', marginBottom: 8, fontSize: 11 }}>
          📦 {allocatedPart.part_name} ({allocatedPart.part_code})
        </div>
      )}

      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 6,
          background: ticket.payment_status === 'Paid' ? '#10B981' : '#EF4444',
          color: '#fff',
        }}>
          {ticket.payment_status || 'Unpaid'}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>
          ₱{renderCost()}
        </span>
      </div>

      {nextStatus ? (
        <button
          onClick={() => onAdvance(ticket.ticket_id, nextStatus)}
          disabled={isAdvancing}
          style={{
            width: '100%', padding: '8px', background: isAdvancing ? 'var(--gray-300)' : 'var(--navy)',
            color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: isAdvancing ? 'not-allowed' : 'pointer'
          }}
        >
          {isAdvancing ? '⏳ Moving...' : `→ Advance to ${nextStatus}`}
        </button>
      ) : (
        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#065F46', background: '#ECFDF5', borderRadius: 6, padding: '5px' }}>
          🏁 Completed
        </div>
      )}
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────
function KanbanColumn({ column, tickets = [], inventory = [], onAdvance, advancing }) {
  return (
    <div style={{
      flex: '1 1 230px', minWidth: 230, background: column.bg,
      border: `1.5px solid ${column.border}`, borderRadius: 12, padding: '14px 12px',
    }}>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 800, fontSize: 13, color: column.color }}>
          {column.icon} {column.label}
        </span>
        <span style={{ background: column.color, color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
          {tickets.length}
        </span>
      </div>

      <div style={{ minHeight: '400px' }}>
        {tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--gray-400)', fontStyle: 'italic' }}>
            No tickets in this stage
          </div>
        ) : (
          tickets.map(t => (
            <TicketCard
              key={t.ticket_id}
              ticket={t}
              inventory={inventory}
              onAdvance={onAdvance}
              advancing={advancing}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ icon, label, value, type }) {
  return (
    <div className={`stat-card ${type || ''}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <div className="stat-value">{value ?? 0}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────
export default function Dashboard() {
  const [tickets, setTickets] = useState([])
  const [stats, setStats] = useState({})
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(null)
  const [flash, setFlash] = useState({ msg: '', type: 'success' })

  const showFlash = (msg, type = 'success') => {
    setFlash({ msg, type })
    setTimeout(() => setFlash({ msg: '', type: 'success' }), 4500)
  }

  const fetchAllDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      const [tRes, sRes, iRes] = await Promise.all([
        ticketService.getAll().catch(() => []),
        statsService.getDashboard().catch(() => ({})),
        inventoryService.getAll().catch(() => []),
      ])

      setTickets(Array.isArray(tRes) ? tRes : [])
      setStats(sRes || {})
      setInventory(Array.isArray(iRes) ? iRes : [])
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllDashboardData()
  }, [fetchAllDashboardData])

  const handleAdvance = async (ticketId, newStatus) => {
    setAdvancing(ticketId)
    try {
      const res = await ticketService.advance(ticketId, newStatus)
      showFlash(res.message || `Advanced to ${newStatus}`, 'success')
      await fetchAllDashboardData()
    } catch (err) {
      showFlash(err?.response?.data?.error || 'Failed to advance ticket', 'error')
    } finally {
      setAdvancing(null)
    }
  }

  // Group tickets safely
  const byStatus = {
    Pending: [], Diagnostic: [], 'In Progress': [], 'Ready for Pickup': [], Completed: []
  }

  tickets.forEach(t => {
    if (!t?.status) return
    let status = t.status

    if (status === 'Pending Downpayment') status = 'Pending'
    if (status === 'Diagnosing') status = 'Diagnostic'
    if (status === 'Repairing') status = 'In Progress'
    if (status === 'Ready for Pick') status = 'Ready for Pickup'

    if (byStatus[status] !== undefined) {
      byStatus[status].push(t)
    } else {
      byStatus['Pending'].push(t)
    }
  })

  const lowStockCount = Array.isArray(inventory) 
    ? inventory.filter(p => (p.quantity ?? 0) <= 2).length 
    : 0

  return (
    <>
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
        <StatCard icon="📥" label="Pending Review" value={stats.pending_dp ?? byStatus.Pending.length} type="pending" />
        <StatCard icon="🔍" label="Diagnosing" value={byStatus.Diagnostic.length} type="total" />
        <StatCard icon="🔧" label="Repairing" value={byStatus['In Progress'].length} type="repairing" />
        <StatCard icon="📦" label="Ready for Pick" value={byStatus['Ready for Pickup'].length} type="total" />
        <StatCard icon="🏁" label="Completed" value={stats.completed ?? byStatus.Completed.length} type="completed" />
      </div>

      {lowStockCount > 0 && (
        <Alert type="error" style={{ marginBottom: 16 }}>
          ⚠️ {lowStockCount} part{lowStockCount > 1 ? 's are' : ' is'} low on stock
        </Alert>
      )}

      {flash.msg && <Alert type={flash.type} style={{ marginBottom: 16 }}>{flash.msg}</Alert>}

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>📋 Repair Pipeline Board</h2>
          <button className="btn btn-secondary btn-sm" onClick={fetchAllDashboardData}>🔄 Refresh</button>
        </div>
        <div className="card-body" style={{ padding: 16 }}>
          {loading ? (
            <Spinner message="Loading dashboard..." />
          ) : (
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
              {COLUMNS.map(col => (
                <KanbanColumn
                  key={col.key}
                  column={col}
                  tickets={byStatus[col.key] || []}
                  inventory={inventory}
                  onAdvance={handleAdvance}
                  advancing={advancing}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}