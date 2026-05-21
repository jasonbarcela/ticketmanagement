// ============================================================
// pages/customers/CustomersPage.jsx — Client Directory
//
// Full CRUD: search, add, inline-edit, and delete customers.
// Add / Edit handled via a single modal form.
// ============================================================
import { useState, useCallback }  from 'react'
import { customerService }        from '../../services/customerService'
import { useFetch }               from '../../hooks/useFetch'
import ConfirmDialog              from '../../components/modals/ConfirmDialog'
import Spinner                    from '../../components/ui/Spinner'
import Alert                      from '../../components/ui/Alert'
import EmptyState                 from '../../components/ui/EmptyState'

const BLANK = { full_name: '', phone: '', email: '', address: '' }

// ── Customer Modal Form ───────────────────────────────────────
function CustomerModal({ customer, onSave, onClose }) {
  const [form,    setForm]    = useState(customer || BLANK)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (!form.full_name.trim()) return setError('Full name is required.')
    setSaving(true)
    try {
      await onSave(form)
    } catch (err) {
      setError(err?.response?.data?.error || 'Save failed.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{customer ? '✏️ Edit Customer' : '+ Add Customer'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <Alert type="error" style={{ marginBottom: 12 }}>{error}</Alert>}
            <div className="form-group">
              <label>Full Name <span className="req">*</span></label>
              <input type="text" value={form.full_name} onChange={set('full_name')} required />
            </div>
            <div className="form-group">
              <label>Phone / Mobile</label>
              <input type="tel" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea rows={2} value={form.address} onChange={set('address')} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Saving...' : customer ? '💾 Update' : '✅ Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function CustomersPage() {
  const [search,  setSearch]  = useState('')
  const [applied, setApplied] = useState('')
  const [modal,   setModal]   = useState(null)   // null | 'add' | customer object
  const [delTarget, setDel]   = useState(null)
  const [flash,   setFlash]   = useState(null)

  const fetcher = useCallback(
    () => customerService.getAll({ search: applied }),
    [applied]
  )
  const { data: customers, loading, error, refetch } = useFetch(fetcher, [applied])

  const showFlash = (msg, type = 'success') => {
    setFlash({ msg, type })
    setTimeout(() => setFlash(null), 4000)
  }

  const handleSave = async (form) => {
    if (modal?.customer_id) {
      await customerService.update(modal.customer_id, form)
      showFlash('Customer updated successfully.')
    } else {
      await customerService.create(form)
      showFlash('Customer added successfully.')
    }
    setModal(null)
    refetch()
  }

  const handleDelete = async () => {
    try {
      await customerService.remove(delTarget.customer_id)
      showFlash(`"${delTarget.full_name}" removed.`, 'success')
      setDel(null)
      refetch()
    } catch (err) {
      showFlash(err?.response?.data?.error || 'Delete failed.', 'error')
      setDel(null)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>👥 Customers</h1>
          <p className="page-subtitle">Client registry — view, add, edit, and remove customer records.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({})}>+ Add Customer</button>
      </div>

      {flash && <Alert type={flash.type} style={{ marginBottom: 16 }}>{flash.msg}</Alert>}

      {/* Search */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text" className="form-input" style={{ flex: 1 }}
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setApplied(search.trim())}
            />
            <button className="btn btn-primary"   onClick={() => setApplied(search.trim())}>🔍 Search</button>
            <button className="btn btn-secondary" onClick={() => { setSearch(''); setApplied('') }}>✕ Reset</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <h2>Client Directory
            {customers && (
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-500)', marginLeft: 8 }}>
                ({customers.length})
              </span>
            )}
          </h2>
          <button className="btn btn-secondary btn-sm" onClick={refetch}>🔄 Refresh</button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading && <Spinner />}
          {error   && <Alert type="error" style={{ margin: 16 }}>{error}</Alert>}
          {!loading && !error && customers?.length === 0 && (
            <EmptyState icon="👥" message="No customers found."
              action={<button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setModal({})}>+ Add Customer</button>} />
          )}
          {!loading && !error && customers?.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Full Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Address</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => (
                    <tr key={c.customer_id}>
                      <td style={{ color: 'var(--gray-400)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{c.full_name}</td>
                      <td>{c.phone || '—'}</td>
                      <td>{c.email || '—'}</td>
                      <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.address || '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                        {c.created_at?.slice(0, 10)}
                      </td>
                      <td>
                        <div className="actions">
                          <button className="btn btn-primary btn-sm" onClick={() => setModal(c)}>Edit</button>
                          <button className="btn btn-danger  btn-sm" onClick={() => setDel(c)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal !== null && (
        <CustomerModal
          customer={modal?.customer_id ? modal : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      <ConfirmDialog
        isOpen={!!delTarget}
        title="Delete Customer"
        message={`Remove "${delTarget?.full_name}" from the customer directory? Their ticket history will remain in the database.`}
        onConfirm={handleDelete}
        onCancel={() => setDel(null)}
        danger
      />
    </>
  )
}
