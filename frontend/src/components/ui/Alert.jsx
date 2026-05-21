// ============================================================
// components/ui/Alert.jsx — Contextual Alert Banner
// type: 'success' | 'error' | 'info'
// ============================================================
const ICONS = { success: '✅', error: '⚠️', info: 'ℹ️' }

export default function Alert({ type = 'info', children, style }) {
  return (
    <div className={`alert alert-${type}`} style={style}>
      <span>{ICONS[type]}</span>
      <span>{children}</span>
    </div>
  )
}
