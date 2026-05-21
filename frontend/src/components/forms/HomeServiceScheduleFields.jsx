// Assigned date + preferred time — home service bookings only
export default function HomeServiceScheduleFields({ serviceDate, preferredTime, onChange, required = false }) {
  return (
    <div className="hs-schedule-fields">
      <div className="form-group">
        <label>
          Assigned Date {required && <span className="req">*</span>}
        </label>
        <input
          type="date"
          className="hs-date-input"
          value={serviceDate || ''}
          min={new Date().toISOString().slice(0, 10)}
          onChange={e => onChange('service_date', e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>
          Preferred Time {required && <span className="req">*</span>}
        </label>
        <input
          type="time"
          className="hs-time-input"
          value={preferredTime || ''}
          onChange={e => onChange('preferred_time', e.target.value)}
        />
      </div>
    </div>
  )
}
