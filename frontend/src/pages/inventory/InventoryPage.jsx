// ============================================================
// pages/inventory/InventoryPage.jsx — Spare Parts Monitor
//
// Displays the full parts catalogue with stock-level badges.
// Admin-only actions:
//   • Adjust Stock — update quantity of an existing part
//   • Add New Part — register a new PRT-XXX entry
//
// Non-admin users see the table read-only with a notice.
// ============================================================
import { useState }          from 'react'
import { useAuth }           from '../../context/AuthContext'
import { inventoryService }  from '../../services/inventoryService'
import { useFetch }          from '../../hooks/useFetch'
import StockBadge            from '../../components/status/StockBadge'
import Spinner               from '../../components/ui/Spinner'
import Alert                 from '../../components/ui/Alert'
import EmptyState            from '../../components/ui/EmptyState'

// ── Adjust Stock Modal ────────────────────────────────────────
function AdjustStockModal({ part, onSave, onClose }) {
  const [qty,    setQty]    = useState(String(part.quantity))
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    const n = parseInt(qty, 10)
    if (isNaN(n) || n < 0) return setError('Enter a valid non-negative quantity.')
    setSaving(true)
    try {
      await onSave(part.part_code, n)
    } catch (err) {
      setError(err?.response?.data?.error || 'Update failed.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📦 Adjust Stock — {part.part_code}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <Alert type="error" style={{ marginBottom: 12 }}>{error}</Alert>}
            <p style={{ color: 'var(--gray-500)', marginBottom: 16, fontSize: 14 }}>
              <strong>{part.part_name}</strong><br />
              Current stock: <strong>{part.quantity}</strong> unit(s)
            </p>
            <div className="form-group">
              <label>New Quantity <span className="req">*</span></label>
              <input
                type="number" min="0" value={qty}
                onChange={e => setQty(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Updating...' : '💾 Update Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Add New Part Modal ────────────────────────────────────────
function AddPartModal({ onSave, onClose }) {
  const [form,   setForm]   = useState({ part_name: '', category: '', quantity: '0', cost_price: '0' })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.part_name.trim()) return setError('Part name is required.')
    setSaving(true)
    try {
      await onSave({
        part_name:  form.part_name.trim(),
        category:   form.category.trim() || 'Uncategorized',
        quantity:   parseInt(form.quantity) || 0,
        cost_price: parseFloat(form.cost_price) || 0,
      })
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to add part.')
      setSaving(false)
    }
  }

  const CATEGORIES = ['Displays', 'Batteries', 'Charging Ports', 'Cameras', 'Speakers', 'Buttons', 'Housing', 'Uncategorized']

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>➕ Add New Spare Part</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <Alert type="error" style={{ marginBottom: 12 }}>{error}</Alert>}
            <p className="hint" style={{ marginBottom: 16 }}>
              A unique <strong>PRT-XXX</strong> code is auto-generated on save.
            </p>
            <div className="form-group">
              <label>Part Name / Specification <span className="req">*</span></label>
              <input type="text" placeholder="e.g. iPhone 14 Pro OLED Screen Assembly"
                value={form.part_name} onChange={set('part_name')} required />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Category</label>
                <select value={form.category} onChange={set('category')}>
                  <option value="">— Select category —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Initial Quantity</label>
                <input type="number" min="0" value={form.quantity} onChange={set('quantity')} />
              </div>
              <div className="form-group">
                <label>Unit Cost Price (₱)</label>
                <input type="number" min="0" step="0.01" value={form.cost_price} onChange={set('cost_price')} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Adding...' : '✅ Add Part'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function InventoryPage() {
  const { isAdmin }  = useAuth()
  const [adjusting,  setAdjusting] = useState(null)
  const [addingPart, setAddingPart] = useState(false)
  const [flash,      setFlash]     = useState(null)

  const { data: inventory, loading, error, refetch } = useFetch(
    () => inventoryService.getAll(), []
  )

  const showFlash = (msg, type = 'success') => {
    setFlash({ msg, type })
    setTimeout(() => setFlash(null), 4000)
  }

  const handleAdjust = async (partCode, newQty) => {
    await inventoryService.adjustStock(partCode, newQty)
    showFlash('Stock updated successfully.')
    setAdjusting(null)
    refetch()
  }

  const handleAddPart = async (payload) => {
    const res = await inventoryService.addPart(payload)
    showFlash(`Part "${res.part.part_name}" added as ${res.part.part_code}.`)
    setAddingPart(false)
    refetch()
  }

  const lowCount = inventory?.filter(p => p.quantity <= 2).length || 0

  return (
    <>
      <div className="page-header">
        <div>
          <h1>📦 Inventory</h1>
          <p className="page-subtitle">Spare parts catalogue — stock levels and part allocation tracking.</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setAddingPart(true)}>➕ Add Part</button>
          </div>
        )}
      </div>

      {flash    && <Alert type={flash.type}  style={{ marginBottom: 16 }}>{flash.msg}</Alert>}
      {error    && <Alert type="error"       style={{ marginBottom: 16 }}>{error}</Alert>}

      {lowCount > 0 && (
        <Alert type="error" style={{ marginBottom: 16 }}>
          ⚠️ <strong>{lowCount} part{lowCount > 1 ? 's' : ''}</strong> {lowCount > 1 ? 'are' : 'is'} critically low or out of stock.
          {isAdmin ? ' Restock immediately to avoid blocking ticket completion.' : ' Contact admin to restock.'}
        </Alert>
      )}

      {!isAdmin && (
        <Alert type="info" style={{ marginBottom: 16 }}>
          ℹ️ You have read-only access to inventory. Contact an admin to adjust stock or add parts.
        </Alert>
      )}

      <div className="card">
        <div className="card-header">
          <h2>Parts Catalogue
            {inventory && (
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-500)', marginLeft: 8 }}>
                ({inventory.length} part{inventory.length !== 1 ? 's' : ''})
              </span>
            )}
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={refetch}>🔄 Refresh</button>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {loading && <Spinner />}
          {!loading && !error && inventory?.length === 0 && (
            <EmptyState icon="📦" message="No parts in inventory."
              action={isAdmin && (
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setAddingPart(true)}>
                  ➕ Add First Part
                </button>
              )}
            />
          )}
          {!loading && !error && inventory?.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Part Code</th>
                    <th>Part Name / Specification</th>
                    <th>Category</th>
                    <th>Unit Cost</th>
                    <th>Stock Level</th>
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(p => (
                    <tr key={p.part_id} style={{ background: p.quantity === 0 ? '#FFF5F5' : 'inherit' }}>
                      <td>
                        <span style={{
                          fontFamily: 'monospace', fontWeight: 800, fontSize: 12,
                          background: '#EFF6FF', color: '#1E40AF',
                          padding: '3px 8px', borderRadius: 4,
                        }}>
                          {p.part_code}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.part_name}</td>
                      <td>
                        <span style={{
                          fontSize: 11, padding: '3px 8px', borderRadius: 10,
                          background: '#F3F4F6', color: '#374151', fontWeight: 600,
                        }}>
                          {p.category}
                        </span>
                      </td>
                      <td>₱{parseFloat(p.cost_price).toFixed(2)}</td>
                      <td><StockBadge quantity={p.quantity} /></td>
                      {isAdmin && (
                        <td>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setAdjusting(p)}
                          >
                            Adjust Stock
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {adjusting && (
        <AdjustStockModal
          part={adjusting}
          onSave={handleAdjust}
          onClose={() => setAdjusting(null)}
        />
      )}

      {addingPart && (
        <AddPartModal
          onSave={handleAddPart}
          onClose={() => setAddingPart(false)}
        />
      )}
    </>
  )
}
