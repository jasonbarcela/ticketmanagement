// ============================================================
// components/status/ProgressStepper.jsx — Repair Lifecycle Bar
//
// Renders a 4-step horizontal progress stepper reflecting the
// current ticket status. Used in ViewTicket and EditTicket.
//
// Visual states:
//   done    — blue filled dot with ✓ checkmark
//   current — navy filled dot with ring glow
//   pending — gray unfilled dot
// ============================================================

const STEPS = [
  { key: 'Pending Downpayment', icon: '💳' },
  { key: 'Confirmed',           icon: '✅' },
  { key: 'In Progress',         icon: '🔧' },
  { key: 'Completed',           icon: '🏁' },
]

export default function ProgressStepper({ currentStatus }) {
  const currentIdx = STEPS.findIndex(s => s.key === currentStatus)

  return (
    <div className="status-steps">
      {STEPS.map((step, i) => {
        const done    = i < currentIdx
        const current = i === currentIdx
        const cls     = done ? 'step done' : current ? 'step current' : 'step'

        return (
          <div key={step.key} className={cls}>
            {/* Connector line drawn to the right of each non-last step */}
            {i < STEPS.length - 1 && <div className="step-line" />}
            <div className="step-dot">
              {done ? '✓' : step.icon}
            </div>
            <div className="step-label">{step.key}</div>
          </div>
        )
      })}
    </div>
  )
}
