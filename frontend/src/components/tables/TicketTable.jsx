// ============================================================
// components/tables/TicketTable.jsx — Tickets Data Table
//
// Generic, reusable table for displaying repair tickets.
// Accepts rows array + action callbacks; renders nothing
// domain-specific beyond ticket columns.
// ============================================================
import { Link }        from 'react-router-dom'
import StatusBadge     from '../status/StatusBadge'
import PaymentBadge    from '../status/PaymentBadge'

export default function TicketTable({ tickets, onDelete }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ticket #</th>
            <th>Customer</th>
            <th>Device</th>
            <th>Service</th>
            <th>Part Used</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Est. Cost</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map(t => (
            <tr key={t.ticket_id}>
              <td>
                <span className="ticket-number">{t.ticket_number}</span>
              </td>

              <td>
                <div style={{ fontWeight: 600 }}>{t.customer_name}</div>
                {t.contact_number && (
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                    {t.contact_number}
                  </div>
                )}
              </td>

              <td>
                <div>{t.device_brand || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{t.device_type}</div>
              </td>

              <td>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5,
                  background: t.service_type === 'Walk-In' ? '#DBEAFE' : '#EDE9FE',
                  color:      t.service_type === 'Walk-In' ? '#1E40AF' : '#5B21B6',
                }}>
                  {t.service_type === 'Walk-In' ? '🏪 Walk-In' : '🏠 Home'}
                </span>
              </td>

              <td style={{ fontSize: 12 }}>
                {t.part_name
                  ? t.part_name
                  : <span style={{ color: 'var(--gray-400)' }}>—</span>
                }
              </td>

              <td><StatusBadge status={t.status} /></td>

              <td><PaymentBadge status={t.payment_status} /></td>

              <td style={{ fontSize: 13 }}>
                {t.estimated_cost > 0
                  ? `₱${parseFloat(t.estimated_cost).toFixed(2)}`
                  : <span style={{ color: 'var(--gray-400)' }}>—</span>
                }
              </td>

              <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                {t.date_created}
              </td>

              <td>
                <div className="actions">
                  <Link to={`/tickets/view/${t.ticket_id}`} className="btn btn-secondary btn-sm">
                    View
                  </Link>
                  <Link to={`/tickets/edit/${t.ticket_id}`} className="btn btn-primary btn-sm">
                    Edit
                  </Link>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => onDelete(t.ticket_id, t.customer_name)}
                  >
                    Del
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
