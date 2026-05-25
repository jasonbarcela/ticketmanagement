import { useState } from 'react'
import { useFetch } from '../../hooks/useFetch'
import { staffService } from '../../services/staffService'
import Alert from '../../components/ui/Alert'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

function CreateTechnicianModal({ onSave, onClose }) {
  const [form, setForm] = useState({ full_name: '', username: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.full_name.trim() || !form.username.trim() || !form.password.trim()) {
      return setError('All fields are required.')
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        full_name: form.full_name.trim(),
        username: form.username.trim().toLowerCase(),
        password: form.password,
      })
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create account.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Technician Account</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <Alert type="error" style={{ marginBottom: 12 }}>{error}</Alert>}
            <div className="form-group">
              <label>Full Name <span className="req">*</span></label>
              <input type="text" value={form.full_name} onChange={set('full_name')} required />
            </div>
            <div className="form-group">
              <label>Username <span className="req">*</span></label>
              <input type="text" value={form.username} onChange={set('username')} required autoComplete="off" />
            </div>
            <div className="form-group">
              <label>Password <span className="req">*</span></label>
              <input type="password" value={form.password} onChange={set('password')} required autoComplete="new-password" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ManageTechniciansPage() {
  const { data: technicians, loading, error, refetch } = useFetch(
    () => staffService.listTechnicians(),
    []
  )
  const [showCreate, setShowCreate] = useState(false)
  const [flash, setFlash] = useState(null)

  const showFlash = (msg, type = 'success') => {
    setFlash({ msg, type })
    setTimeout(() => setFlash(null), 4000)
  }

  const handleCreate = async (payload) => {
    await staffService.createTechnician(payload)
    showFlash(`Technician "${payload.full_name}" created.`)
    setShowCreate(false)
    refetch()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Manage Technicians</h1>
          <p className="page-subtitle">Create and view technician staff accounts.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + Create Technician Account
        </button>
      </div>

      {flash && <Alert type={flash.type} style={{ marginBottom: 16 }}>{flash.msg}</Alert>}
      {error && <Alert type="error" style={{ marginBottom: 16 }}>{error}</Alert>}

      <div className="card">
        <div className="card-header">
          <h2>Technician Accounts</h2>
          <button type="button" className="btn btn-secondary btn-sm" onClick={refetch}>Refresh</button>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading && <Spinner />}
          {!loading && !error && (!technicians || technicians.length === 0) && (
            <EmptyState message="No technician accounts yet." />
          )}
          {!loading && technicians?.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Username</th>
                    <th>Created By</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {technicians.map(t => (
                    <tr key={t.user_id}>
                      <td style={{ fontWeight: 600 }}>{t.full_name}</td>
                      <td style={{ fontFamily: 'monospace' }}>{t.username}</td>
                      <td>{t.created_by || '—'}</td>
                      <td style={{ fontSize: 13 }}>
                        {t.created_at
                          ? new Date(t.created_at).toLocaleDateString('en-PH', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateTechnicianModal
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  )
}
