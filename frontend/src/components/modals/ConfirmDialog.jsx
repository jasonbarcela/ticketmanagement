// ============================================================
// components/modals/ConfirmDialog.jsx — Generic Confirm Modal
//
// Replaces window.confirm() with an accessible, styled dialog.
// Props:
//   isOpen   {boolean}
//   title    {string}
//   message  {string}
//   onConfirm {function}
//   onCancel  {function}
//   danger   {boolean} — makes the confirm button red
// ============================================================
export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, danger = false }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--gray-600)', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {danger ? '🗑️ Delete' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
