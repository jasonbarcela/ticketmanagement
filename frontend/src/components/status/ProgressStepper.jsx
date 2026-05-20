// components/status/ProgressStepper.jsx — Repair lifecycle bar
import { STEPPER_STATUSES } from '../../constants/ticketStatus'
import { HOME_SERVICE_STEPPER } from '../../constants/homeService'

const WALKIN_META = {
  Pending:            { icon: '✓', short: 'Pending' },
  Diagnosing:         { icon: '✓', short: 'Diagnosing' },
  Repairing:          { icon: '✓', short: 'Repairing' },
  'Ready for Pickup': { icon: '✓', short: 'Ready' },
  Completed:          { icon: '✓', short: 'Done' },
}

const HOME_META = {
  Pending:      { icon: '✓', short: 'Pending' },
  Approved:     { icon: '✓', short: 'Approved' },
  'On The Way': { icon: '✓', short: 'On The Way' },
  Completed:    { icon: '✓', short: 'Done' },
}

export default function ProgressStepper({ currentStatus, serviceType = 'Walk-In' }) {
  if (currentStatus === 'Cancelled') {
    return (
      <div style={{ textAlign: 'center', padding: '12px 0', color: '#991B1B', fontWeight: 700, fontSize: 14 }}>
        This repair ticket has been cancelled.
      </div>
    )
  }

  const isHome = serviceType === 'Home Service'
  const pipeline = isHome ? HOME_SERVICE_STEPPER : STEPPER_STATUSES
  const meta = isHome ? HOME_META : WALKIN_META
  const steps = pipeline.map(key => ({ key, ...meta[key] }))
  const currentIdx = steps.findIndex(s => s.key === currentStatus)
  const activeIdx = currentIdx >= 0 ? currentIdx : 0

  return (
    <div className="status-steps">
      {steps.map((step, i) => {
        const done    = i < activeIdx
        const current = i === activeIdx
        const cls     = done ? 'step done' : current ? 'step current' : 'step'

        return (
          <div key={step.key} className={cls}>
            {i < steps.length - 1 && <div className="step-line" />}
            <div className="step-dot">{done ? '✓' : step.icon}</div>
            <div className="step-label">{step.short}</div>
          </div>
        )
      })}
    </div>
  )
}
