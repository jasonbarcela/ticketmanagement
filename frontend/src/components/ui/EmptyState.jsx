// ============================================================
// components/ui/EmptyState.jsx — Zero-Record Placeholder
// ============================================================
export default function EmptyState({ icon = '📭', message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <p>{message}</p>
      {action}
    </div>
  )
}
