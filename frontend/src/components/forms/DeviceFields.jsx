// ============================================================
// components/forms/DeviceFields.jsx — Reusable Device Form Block
//
// Renders the device type, brand, IMEI, passcode, and
// problem description fields used in all ticket forms.
// Pass hideProblemDesc to suppress the textarea (used when the
// parent renders its own checkbox-based issue picker instead).
// ============================================================

const DEVICE_TYPES = [
  'Mobile Phone', 'Laptop / Notebook', 'Desktop PC',
  'Tablet / iPad', 'Smart TV', 'Game Console', 'Other',
]

export default function DeviceFields({ form, onChange, hideProblemDesc }) {
  const set = field => e => onChange(field, e.target.value)

  return (
    <div className="form-grid">
      <div className="form-group">
        <label>Device Type <span className="req">*</span></label>
        <select value={form.device_type} onChange={set('device_type')}>
          <option value="">— Select device type —</option>
          {DEVICE_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label>Brand / Model</label>
        <input
          type="text"
          value={form.device_brand}
          onChange={set('device_brand')}
        />
      </div>

      <div className="form-group">
        <label>IMEI Number</label>
        <input
          type="text"
          placeholder="15-digit IMEI (dial *#06#)"
          value={form.imei}
          onChange={set('imei')}
          maxLength={15}
        />
      </div>

      <div className="form-group">
        <label>Screen Lock Passcode</label>
        <input
          type="text"
          placeholder="Required for post-repair testing"
          value={form.passcode}
          onChange={set('passcode')}
          maxLength={20}
        />
      </div>

      {!hideProblemDesc && (
        <div className="form-group full">
          <label>Problem Description <span className="req">*</span></label>
          <textarea
            rows={3}
            placeholder="Describe the issue clearly (e.g. cracked screen, won't charge, battery draining fast...)"
            value={form.problem_desc}
            onChange={set('problem_desc')}
          />
        </div>
      )}
    </div>
  )
}