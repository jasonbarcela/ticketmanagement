// ============================================================
// pages/tickets/TicketsPage.jsx — Repair Tickets List View
//
// Features:
//   • Live search (ticket number or customer name)
//   • Status filter dropdown (all 4 states + "All")
//   • Delete with ConfirmDialog
//   • Links to ViewTicket and EditTicket
// ============================================================
import { useState, useCallback, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { TICKET_STATUSES, FILTER_STATUSES } from '../../constants/ticketStatus'
import { ticketService }          from '../../services/ticketService'
import { useFetch }               from '../../hooks/useFetch'
import TicketTable                from '../../components/tables/TicketTable'
import ConfirmDialog              from '../../components/modals/ConfirmDialog'
import Spinner                    from '../../components/ui/Spinner'
import Alert                      from '../../components/ui/Alert'
import EmptyState                 from '../../components/ui/EmptyState'

const STATUSES = ['All', ...FILTER_STATUSES]

export default function TicketsPage() {
  const [searchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') || 'All'

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(initialStatus)

  const [applied, setApplied] = useState({
    search: '',
    status: initialStatus === 'All' ? '' : initialStatus,
  })

  useEffect(() => {
    const q = searchParams.get('status')
    if (q && STATUSES.includes(q)) {
      setStatus(q)
      setApplied({ search: '', status: q })
    }
  }, [searchParams])

  const fetcher = useCallback(
    () => ticketService.getAll({
      search: applied.search,
      status: applied.status,
    }),
    [applied]
  )

  const { data: tickets, loading, error, refetch } = useFetch(fetcher, [applied])

  // ── Delete state ──────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, name }
  const [deleting,     setDeleting]     = useState(false)
  const [flash,        setFlash]        = useState(null)

  const showFlash = (msg, type = 'success') => {
    setFlash({ msg, type })
    setTimeout(() => setFlash(null), 4000)
  }

  const handleApply = () => {
    setApplied({ search: search.trim(), status: status === 'All' ? '' : status })
  }

  const handleReset = () => {
    setSearch('')
    setStatus('All')
    setApplied({ search: '', status: '' })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await ticketService.remove(deleteTarget.id)
      showFlash(`Ticket for "${deleteTarget.name}" deleted.`, 'success')
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      showFlash(err?.response?.data?.error || 'Delete failed.', 'error')
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>🎫 Repair Tickets</h1>
          <p className="page-subtitle">All repair jobs — search, filter, and manage.</p>
        </div>
        <Link to="/tickets/new" className="btn btn-primary">
          + New Ticket
        </Link>
      </div>

      {/* ── Flash ───────────────────────────────────────────── */}
      {flash && (
        <Alert type={flash.type} style={{ marginBottom: 16 }}>
          {flash.msg}
        </Alert>
      )}

      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
              <label>Search</label>
              <input
                type="text"
                placeholder="Ticket # or customer name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleApply()}
              />
            </div>
            <div className="form-group" style={{ margin: 0, flex: '0 1 200px' }}>
              <label>Status Filter</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleApply}>🔍 Search</button>
            <button className="btn btn-secondary" onClick={handleReset}>✕ Reset</button>
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h2>
            {applied.status ? `${applied.status} Tickets` : 'All Tickets'}
            {tickets && (
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-500)', marginLeft: 8 }}>
                ({tickets.length} record{tickets.length !== 1 ? 's' : ''})
              </span>
            )}
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={refetch}>🔄 Refresh</button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading && <Spinner />}
          {error   && <Alert type="error" style={{ margin: 16 }}>{error}</Alert>}
          {!loading && !error && tickets?.length === 0 && (
            <EmptyState
              icon="🎫"
              message="No tickets found. Try adjusting your filters or create a new ticket."
              action={<Link to="/tickets/new" className="btn btn-primary" style={{ marginTop: 12 }}>+ New Ticket</Link>}
            />
          )}
          {!loading && !error && tickets?.length > 0 && (
            <TicketTable
              tickets={tickets}
              onDelete={(id, name) => setDeleteTarget({ id, name })}
            />
          )}
        </div>
      </div>

      {/* ── Delete Confirm ───────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Ticket"
        message={`Are you sure you want to permanently delete the repair ticket for "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        danger
      />

      {deleting && <Spinner message="Deleting ticket..." />}
    </>
  )
}
