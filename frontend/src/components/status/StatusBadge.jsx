// components/status/StatusBadge.jsx
import { STATUS_LABELS } from '../../constants/ticketStatus'
import { HOME_SERVICE_STATUS_LABELS } from '../../constants/homeService'

const STATUS_MAP = {
  Pending:            { bg: '#FEF3C7', color: '#92400E', border: '#F59E0B' },
  Approved:           { bg: '#D1FAE5', color: '#065F46', border: '#10B981' },
  'On The Way':       { bg: '#E0F2FE', color: '#0369A1', border: '#0EA5E9' },
  Diagnosing:         { bg: '#DBEAFE', color: '#1E40AF', border: '#3B82F6' },
  Repairing:          { bg: '#EDE9FE', color: '#5B21B6', border: '#8B5CF6' },
  'Ready for Pickup': { bg: '#E0F2FE', color: '#0369A1', border: '#7DD3FC' },
  Completed:          { bg: '#D1FAE5', color: '#065F46', border: '#10B981' },
  Cancelled:          { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
}

export default function StatusBadge({ status }) {
  const value = (status && String(status).trim()) || ''
  const s = STATUS_MAP[value] || { bg: '#E5E7EB', color: '#374151', border: '#9CA3AF' }
  const label = HOME_SERVICE_STATUS_LABELS[value] || STATUS_LABELS[value] || value || 'Unknown'
  return (
    <span style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {label}
    </span>
  )
}
