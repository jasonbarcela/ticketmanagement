// ============================================================
// components/status/PaymentBadge.jsx — Payment Status Pill
//
// High-visibility solid RED (Unpaid) / GREEN (Paid) pill.
// Intentionally stark for quick staff scanning of payment state.
// ============================================================
export default function PaymentBadge({ status }) {
  const isPaid = status === 'Paid'
  return (
    <span style={{
      display:      'inline-block',
      padding:      '4px 12px',
      borderRadius: 20,
      fontSize:     12,
      fontWeight:   800,
      letterSpacing: 0.4,
      background:   isPaid ? '#10B981' : '#EF4444',
      color:        '#fff',
      boxShadow:    isPaid
        ? '0 2px 8px rgba(16,185,129,0.3)'
        : '0 2px 8px rgba(239,68,68,0.3)',
    }}>
      {isPaid ? '✅ PAID' : '❌ UNPAID'}
    </span>
  )
}
