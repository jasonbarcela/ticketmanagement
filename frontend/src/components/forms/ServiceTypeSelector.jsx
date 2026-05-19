// ============================================================
// components/forms/ServiceTypeSelector.jsx — Walk-In / Home Selector
//
// Reusable radio-button-styled card selector for service type.
// Used in NewTicket, EditTicket, and BookingPage.
// ============================================================
export default function ServiceTypeSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {['Walk-In', 'Home Service'].map(type => (
        <label key={type} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 20px',
          border: `2px solid ${value === type ? 'var(--blue)' : 'var(--gray-200)'}`,
          borderRadius: 8, cursor: 'pointer',
          background: value === type ? 'var(--light-blue)' : 'var(--white)',
          fontWeight: 600, fontSize: 14, transition: 'all 0.15s',
        }}>
          <input
            type="radio"
            name="service_type"
            value={type}
            checked={value === type}
            onChange={() => onChange(type)}
            style={{ display: 'none' }}
          />
          {type === 'Walk-In' ? '🏪' : '🏠'} {type}
        </label>
      ))}
    </div>
  )
}
