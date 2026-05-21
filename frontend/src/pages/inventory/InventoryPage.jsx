// ============================================================
// pages/inventory/InventoryPage.jsx — Phone Repair Parts Stock
//
// Displays all repair parts with stock levels and low-stock alerts.
// Admin actions:
//   • Adjust Stock (stock in/out)
//   • Add New Part
//
// Phone Repair Categories Only:
//   LCD/Screen | Battery | Charging Port | Camera |
//   Speaker/Mic | Flex Cable | IC/Board Parts | Tools/Consumables
// ============================================================
import { useState, useMemo }    from 'react'
import { useAuth }              from '../../context/AuthContext'
import { inventoryService }     from '../../services/inventoryService'
import { useFetch }             from '../../hooks/useFetch'
import StockBadge               from '../../components/status/StockBadge'
import Spinner                  from '../../components/ui/Spinner'
import Alert                    from '../../components/ui/Alert'
import EmptyState               from '../../components/ui/EmptyState'

// ── Phone Repair Categories ───────────────────────────────────
const PHONE_CATEGORIES = [
  'LCD/Screen',
  'Battery',
  'Charging Port',
  'Camera',
  'Speaker/Mic',
  'Flex Cable',
  'IC/Board Parts',
  'Tools/Consumables',
]

const LOW_STOCK_THRESHOLD = 3

// ── Category color chips ──────────────────────────────────────
const CATEGORY_COLORS = {
  'LCD/Screen':       { bg: '#EFF6FF', color: '#1D4ED8' },
  'Battery':          { bg: '#FEF9C3', color: '#854D0E' },
  'Charging Port':    { bg: '#F0FDF4', color: '#166534' },
  'Camera':           { bg: '#FDF4FF', color: '#7E22CE' },
  'Speaker/Mic':      { bg: '#FFF7ED', color: '#9A3412' },
  'Flex Cable':       { bg: '#F0F9FF', color: '#0369A1' },
  'IC/Board Parts':   { bg: '#FFF1F2', color: '#9F1239' },
  'Tools/Consumables':{ bg: '#F9FAFB', color: '#374151' },
}
function catStyle(cat) {
  return CATEGORY_COLORS[cat] || { bg: '#F3F4F6', color: '#374151' }
}

// ── Adjust Stock Modal ────────────────────────────────────────
function AdjustStockModal({ part, onSave, onClose }) {
  const [mode,   setMode]   = useState('set')  // 'set' | 'add' | 'remove'
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const computeNew = () => {
    const n = parseInt(amount, 10)
    if (isNaN(n) || n < 0) return null
    if (mode === 'set')    return n
    if (mode === 'add')    return part.quantity + n
    if (mode === 'remove') return Math.max(0, part.quantity - n)
    return null
  }

  const newQty = computeNew()

  const handleSubmit = async e => {
    e.preventDefault()
    if (newQty === null) return setError('Enter a valid non-negative number.')
    setSaving(true)
    try {
      await onSave(part.part_code, newQty)
    } catch (err) {
      setError(err?.response?.data?.error || 'Update failed.')
      setSaving(false)
    }
  }

  const modeLabel = { set: 'Set to exact qty', add: 'Stock In (+)', remove: 'Stock Out (−)' }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3> Adjust Stock — {part.part_code}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <Alert type="error" style={{ marginBottom: 12 }}>{error}</Alert>}

            <p style={{ fontSize: 14, color: 'var(--gray-500)', marginBottom: 16 }}>
              <strong>{part.part_name}</strong><br />
              Current stock: <strong>{part.quantity}</strong> unit(s)
            </p>

            {/* Mode selector */}
            <div className="form-group">
              <label>Adjustment Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {Object.entries(modeLabel).map(([val, label]) => (
                  <button
                    key={val} type="button"
                    onClick={() => { setMode(val); setAmount('') }}
                    style={{
                      flex: 1, padding: '8px 4px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                      border: `2px solid ${mode === val ? 'var(--blue)' : 'var(--gray-200)'}`,
                      background: mode === val ? 'var(--light-blue)' : '#fff',
                      color: mode === val ? 'var(--blue)' : 'var(--gray-500)',
                      fontWeight: mode === val ? 700 : 400,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>
                {mode === 'set' ? 'New Total Quantity' : mode === 'add' ? 'Units to Add' : 'Units to Remove'}
                <span className="req"> *</span>
              </label>
              <input
                type="number" min="0" value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter quantity"
                autoFocus
              />
            </div>

            {amount !== '' && newQty !== null && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, fontSize: 13,
                background: newQty === 0 ? '#FEF2F2' : '#F0FDF4',
                color: newQty === 0 ? '#991B1B' : '#166534',
                border: `1px solid ${newQty === 0 ? '#FECACA' : '#BBF7D0'}`,
              }}>
                New stock will be: <strong>{newQty}</strong> unit(s)
                {newQty === 0 && ' — Part will show as Out of Stock'}
                {newQty > 0 && newQty <= LOW_STOCK_THRESHOLD && ' — Still below low-stock threshold'}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || newQty === null}>
              {saving ? '⏳ Saving...' : '💾 Update Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Add New Part Modal ────────────────────────────────────────
function AddPartModal({ onSave, onClose }) {
  const [form,   setForm]   = useState({
    part_name: '', category: '', quantity: '0',
    cost_price: '0', retail_price: '0',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.part_name.trim()) return setError('Part name is required.')
    if (!form.category)         return setError('Category is required.')
    setSaving(true)
    try {
      await onSave({
        part_name:    form.part_name.trim(),
        category:     form.category,
        quantity:     parseInt(form.quantity) || 0,
        cost_price:   parseFloat(form.cost_price) || 0,
        retail_price: parseFloat(form.retail_price) || 0,
      })
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to add part.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>➕ Add New Part</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <Alert type="error" style={{ marginBottom: 12 }}>{error}</Alert>}
            <p className="hint" style={{ marginBottom: 16 }}>
              A <strong>PRT-XXX</strong> code is auto-assigned on save.
            </p>

            <div className="form-group">
              <label>Part Name / Specification <span className="req">*</span></label>
              <input
                type="text" placeholder="e.g. iPhone 14 Pro OLED Screen"
                value={form.part_name} onChange={set('part_name')} required
              />
            </div>

            <div className="form-group">
              <label>Category <span className="req">*</span></label>
              <select value={form.category} onChange={set('category')} required>
                <option value="">— Select category —</option>
                {PHONE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Initial Stock Qty</label>
                <input type="number" min="0" value={form.quantity} onChange={set('quantity')} />
              </div>
              <div className="form-group">
                <label>Cost Price (₱)</label>
                <input type="number" min="0" step="0.01" value={form.cost_price} onChange={set('cost_price')} />
              </div>
              <div className="form-group">
                <label>Selling Price (₱)</label>
                <input type="number" min="0" step="0.01" value={form.retail_price} onChange={set('retail_price')} />
              </div>
            </div>

            <p className="hint" style={{ marginTop: 8 }}>
              💡 <strong>Selling price</strong> = price charged to customer when shop provides this part.<br />
              Labor/service fee is added separately on the repair ticket.
            </p>
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
  const { isAdmin } = useAuth()
  const [adjusting,  setAdjusting]  = useState(null)
  const [addingPart, setAddingPart] = useState(false)
  const [flash,      setFlash]      = useState(null)
  const [search,     setSearch]     = useState('')
  const [filterCat,  setFilterCat]  = useState('')

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
    showFlash(`"${res.part.part_name}" added as ${res.part.part_code}.`)
    setAddingPart(false)
    refetch()
  }

  // Derived stats
  const lowStockItems = useMemo(() =>
    inventory?.filter(p => p.quantity <= LOW_STOCK_THRESHOLD) || [], [inventory])
  const outOfStock    = useMemo(() =>
    inventory?.filter(p => p.quantity === 0) || [], [inventory])

  // Filtered list
  const filtered = useMemo(() => {
    if (!inventory) return []
    return inventory.filter(p => {
      const matchSearch = !search ||
        p.part_name.toLowerCase().includes(search.toLowerCase()) ||
        p.part_code.toLowerCase().includes(search.toLowerCase())
      const matchCat = !filterCat || p.category === filterCat
      return matchSearch && matchCat
    })
  }, [inventory, search, filterCat])

  return (
    <>
      <div className="page-header">
        <div>
          <h1> Parts Inventory</h1>
          <p className="page-subtitle">Essential parts stock — name, quantity, and status.</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setAddingPart(true)}>
            ➕ Add Part
          </button>
        )}
      </div>

      {flash && <Alert type={flash.type} style={{ marginBottom: 16 }}>{flash.msg}</Alert>}
      {error && <Alert type="error"      style={{ marginBottom: 16 }}>{error}</Alert>}

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Alert type="error" style={{ marginBottom: 16 }}>
          ⚠️ <strong>{outOfStock.length > 0 ? `${outOfStock.length} out of stock` : ''}</strong>
          {outOfStock.length > 0 && lowStockItems.length > outOfStock.length ? ', ' : ''}
          {lowStockItems.length > outOfStock.length
            ? `${lowStockItems.length - outOfStock.length} low stock`
            : ''}
          {outOfStock.length === 0 && ` — ${lowStockItems.length} part(s) are running low`}.
          {isAdmin ? ' Restock to avoid repair delays.' : ' Contact admin to restock.'}
        </Alert>
      )}

      {!isAdmin && (
        <Alert type="info" style={{ marginBottom: 16 }}>
          ℹ️ Read-only view. Contact an admin to adjust stock or add parts.
        </Alert>
      )}

      {/* Summary Cards */}
      {inventory && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Parts',  value: inventory.length,       bg: '#EFF6FF', color: '#1D4ED8' },
            { label: 'In Stock',     value: inventory.filter(p => p.quantity > LOW_STOCK_THRESHOLD).length, bg: '#F0FDF4', color: '#166534' },
            { label: 'Low Stock',    value: lowStockItems.filter(p => p.quantity > 0).length, bg: '#FEF9C3', color: '#854D0E' },
            { label: 'Out of Stock', value: outOfStock.length,       bg: '#FFF1F2', color: '#9F1239' },
          ].map(({ label, value, bg, color }) => (
            <div key={label} style={{
              background: bg, borderRadius: 10, padding: '14px 16px',
              border: `1px solid ${color}22`,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 12, color, fontWeight: 600, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>
            Inventory
            {filtered.length !== inventory?.length && (
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-500)', marginLeft: 8 }}>
                {filtered.length} of {inventory?.length}
              </span>
            )}
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={refetch}>🔄 Refresh</button>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--gray-200)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text" placeholder="🔍 Search parts..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 180, padding: '7px 12px', borderRadius: 6, border: '1px solid var(--gray-200)', fontSize: 13 }}
          />
          {search && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSearch('')}
            >
              Clear
            </button>
          )}
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {loading && <Spinner />}

          {!loading && !error && inventory?.length === 0 && (
            <EmptyState
               message="No parts in inventory."
              action={isAdmin && (
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setAddingPart(true)}>
                  ➕ Add First Part
                </button>
              )}
            />
          )}

          {!loading && !error && filtered.length === 0 && inventory?.length > 0 && (
            <EmptyState icon="🔍" message="No parts match your search." />
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item name</th>
                    <th>Quantity</th>
                    <th>Stock status</th>
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const isLow = p.quantity <= LOW_STOCK_THRESHOLD
                    return (
                      <tr key={p.part_id} style={{ background: p.quantity === 0 ? '#FFF5F5' : isLow ? '#FFFBEB' : 'inherit' }}>
                        <td style={{ fontWeight: 600 }}>{p.part_name}</td>
                        <td style={{ fontSize: 15, fontWeight: 700 }}>{p.quantity}</td>
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
                    )
                  })}
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