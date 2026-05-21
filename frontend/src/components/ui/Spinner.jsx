// ============================================================
// components/ui/Spinner.jsx — Loading Indicator
// ============================================================
export default function Spinner({ message = 'Loading...' }) {
  return (
    <div className="loading">
      <div className="spinner" />
      {message}
    </div>
  )
}
