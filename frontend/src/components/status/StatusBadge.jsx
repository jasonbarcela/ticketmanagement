// ============================================================
// components/status/StatusBadge.jsx — Repair Status Pill Badge
//
// Renders a color-coded pill for the 4-step status state machine.
// Used across Tickets list, Kanban cards, and ViewTicket.
// ============================================================

const STATUS_MAP = {
  'Pending Downpayment': { bg: '#FEF3C7', color: '#92400E', border: '#F59E0B' },
  'Confirmed':           { bg: '#DBEAFE', color: '#1E40AF', border: '#3B82F6' },
  'In Progress':         { bg: '#EDE9FE', color: '#5B21B6', border: '#8B5CF6' },
  'Completed':           { bg: '#D1FAE5', color: '#065F46', border: '#10B981' },
}

export default function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { bg: '#E5E7EB', color: '#374151', border: '#9CA3AF' }
  return (
    <span style={{
      display:      'inline-block',
      padding:      '4px 12px',
      borderRadius: 20,
      fontSize:     11,
      fontWeight:   700,
      whiteSpace:   'nowrap',
      background:   s.bg,
      color:        s.color,
      border:       `1px solid ${s.border}`,
    }}>
      {status}
    </span>
  )
}
